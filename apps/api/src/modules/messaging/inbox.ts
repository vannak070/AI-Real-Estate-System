import { TRPCError } from '@trpc/server';
import { can, type Capability } from '@era/contracts';
import type { MessagingConversation } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';
import type { CrmLeadSummaryView } from '../crm/index.js';
import type { TelegramBot } from './telegram-bot.js';

/** The signed-in staff member using the Inbox. */
export interface InboxViewer {
  id: string;
  name: string;
  capabilities: Capability[];
}

export type InboxFilter = 'all' | 'attention' | 'agent';

/** Conversations listed per request — newest activity first. */
const LIST_LIMIT = 200;
/** Messages shown when a conversation is opened. */
const THREAD_LIMIT = 300;

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Needs a person: the AI asked for one, or the customer wrote to a staff-handled chat. */
const needsAttention = (c: Pick<MessagingConversation, 'needsAgent' | 'mode' | 'unreadCount'>) =>
  c.needsAgent || (c.mode === 'AGENT' && c.unreadCount > 0);

/**
 * The admin Inbox over chat-app conversations. Visibility follows CRM's rule: `crm:read:all`
 * sees every conversation; anyone else sees the ones whose lead they own or that they're handling
 * (a conversation with no lead yet is managers-only — same "unassigned means restricted" rule).
 * Replies go out through the platform the conversation came from.
 */
export function createInbox({ db, modules }: ModuleContext, telegram: TelegramBot) {
  const senders: Record<string, (chatId: string, text: string) => Promise<unknown>> = {
    TELEGRAM: (chatId, text) => telegram.sendText(chatId, text),
  };

  const seesAll = (v: InboxViewer) => can(v.capabilities, 'crm:read:all');
  const canSee = (v: InboxViewer, c: MessagingConversation, lead: CrmLeadSummaryView | null | undefined) =>
    seesAll(v) || c.handledById === v.id || (!!lead && lead.ownerId === v.id);

  async function leadsFor(rows: MessagingConversation[]) {
    const ids = [...new Set(rows.map((r) => r.leadId).filter((id): id is string => !!id))];
    return new Map((await modules.crm.listLeadSummaries(ids)).map((l) => [l.id, l]));
  }

  async function load(viewer: InboxViewer, id: string) {
    const convo = await db.messagingConversation.findUnique({ where: { id } });
    if (!convo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found.' });
    const lead = convo.leadId ? ((await modules.crm.listLeadSummaries([convo.leadId]))[0] ?? null) : null;
    if (!canSee(viewer, convo, lead)) throw new TRPCError({ code: 'FORBIDDEN', message: 'This conversation belongs to another agent.' });
    return { convo, lead };
  }

  async function sendOut(convo: MessagingConversation, text: string) {
    const send = senders[convo.channel];
    if (!send) throw new TRPCError({ code: 'BAD_REQUEST', message: `Replying on ${convo.channel} isn't supported yet.` });
    try {
      await send(convo.externalChatId, text);
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Couldn't send the message: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function visibleRows(viewer: InboxViewer) {
    const rows = await db.messagingConversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: LIST_LIMIT,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { role: true, text: true, createdAt: true } } },
    });
    const leads = await leadsFor(rows);
    return rows
      .map((r) => ({ row: r, lead: r.leadId ? (leads.get(r.leadId) ?? null) : null }))
      .filter(({ row, lead }) => canSee(viewer, row, lead));
  }

  return {
    async list(viewer: InboxViewer, filter: InboxFilter = 'all') {
      const rows = await visibleRows(viewer);
      return rows
        .filter(({ row }) => (filter === 'attention' ? needsAttention(row) : filter === 'agent' ? row.mode === 'AGENT' : true))
        .map(({ row: { messages, ...c }, lead }) => ({
          id: c.id,
          channel: c.channel,
          displayName: c.displayName,
          username: c.username,
          mode: c.mode,
          handledById: c.handledById,
          handledSince: c.handledSince,
          needsAgent: c.needsAgent,
          needsAgentReason: c.needsAgentReason,
          unreadCount: c.unreadCount,
          lastMessageAt: c.lastMessageAt,
          lastMessage: messages[0] ? { role: messages[0].role, text: messages[0].text.slice(0, 160) } : null,
          lead,
        }));
    },

    /** For the nav badge: conversations waiting on a person. */
    async summary(viewer: InboxViewer) {
      const rows = await visibleRows(viewer);
      return { attention: rows.filter(({ row }) => needsAttention(row)).length };
    },

    async get(viewer: InboxViewer, id: string) {
      const { convo, lead } = await load(viewer, id);
      const messages = await db.messagingMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        take: THREAD_LIMIT,
        select: { id: true, role: true, text: true, agentId: true, createdAt: true },
      });
      return { conversation: convo, lead, messages: messages.reverse() };
    },

    async markRead(viewer: InboxViewer, id: string) {
      await load(viewer, id);
      await db.messagingConversation.update({ where: { id }, data: { unreadCount: 0 } });
      return { id };
    },

    /** The AI goes quiet; replies come from this staff member until they hand back. */
    async takeOver(viewer: InboxViewer, id: string) {
      const { convo } = await load(viewer, id);
      if (convo.mode === 'AGENT' && convo.handledById !== viewer.id && !seesAll(viewer)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Another team member is already handling this conversation.' });
      }
      const notice = `👋 You're now chatting with ${firstName(viewer.name)} from the ERA Cambodia team.`;
      await sendOut(convo, notice);
      await db.$transaction([
        db.messagingMessage.create({ data: { conversationId: id, role: 'AGENT', text: notice, agentId: viewer.id } }),
        db.messagingConversation.update({
          where: { id },
          data: {
            mode: 'AGENT',
            handledById: viewer.id,
            handledSince: new Date(),
            needsAgent: false,
            needsAgentReason: null,
            unreadCount: 0,
            lastMessageAt: new Date(),
          },
        }),
      ]);
      return { id };
    },

    async handBack(viewer: InboxViewer, id: string) {
      const { convo } = await load(viewer, id);
      if (convo.mode !== 'AGENT') return { id };
      const notice = "Thanks for chatting with our team! ERA's AI assistant is here again if you have more questions.";
      await sendOut(convo, notice);
      await db.$transaction([
        db.messagingMessage.create({ data: { conversationId: id, role: 'ASSISTANT', text: notice } }),
        db.messagingConversation.update({
          where: { id },
          data: { mode: 'AI', handledById: null, handledSince: null, lastMessageAt: new Date() },
        }),
      ]);
      return { id };
    },

    async send(viewer: InboxViewer, id: string, text: string) {
      const { convo } = await load(viewer, id);
      if (convo.mode !== 'AGENT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Take over the conversation before replying — the AI is answering it.' });
      }
      // The bot speaks for everyone, so say who's writing.
      await sendOut(convo, `${firstName(viewer.name)}: ${text}`);
      const message = await db.messagingMessage.create({
        data: { conversationId: id, role: 'AGENT', text, agentId: viewer.id },
        select: { id: true, role: true, text: true, agentId: true, createdAt: true },
      });
      await db.messagingConversation.update({ where: { id }, data: { lastMessageAt: new Date(), unreadCount: 0 } });
      return message;
    },
  };
}

export type Inbox = ReturnType<typeof createInbox>;
