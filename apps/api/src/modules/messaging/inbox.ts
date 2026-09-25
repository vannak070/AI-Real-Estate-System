import { TRPCError } from '@trpc/server';
import { can, type Capability } from '@era/contracts';
import type { MessagingConversation } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';
import type { CrmLeadSummaryView } from '../crm/index.js';
import type { TelegramBot } from './telegram-bot.js';
import type { StaffAlerts } from './staff-alerts.js';
import { WEBSITE_CHANNEL, type WebsiteChat } from './website-chat.js';

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
 * Replies go out through the platform the conversation came from (the website chat polls for them).
 */
/** How often handled chats are checked for the automatic hand-back rules. */
const SWEEP_EVERY_MS = 60_000;

export function createInbox(
  { db, modules, config, logger }: ModuleContext,
  telegram: TelegramBot,
  website: WebsiteChat,
  alerts: StaffAlerts,
) {
  const log = logger.child({ svc: 'inbox' });
  /** Per platform: send a message, and have the AI answer a chat's waiting message(s). */
  const adapters: Record<string, { send: (chatId: string, text: string) => Promise<unknown>; answerPending: (id: string) => Promise<void> }> = {
    TELEGRAM: { send: (chatId, text) => telegram.sendText(chatId, text), answerPending: (id) => telegram.answerPending(id) },
    // Nothing to push: the stored message is what the visitor's chat page picks up when it polls.
    [WEBSITE_CHANNEL]: { send: async () => {}, answerPending: (id) => website.answerPending(id) },
  };
  const senders = Object.fromEntries(Object.entries(adapters).map(([k, a]) => [k, a.send]));
  const waitMs = config.inboxAutoHandbackMinutes * 60_000;
  const idleMs = config.inboxIdleReleaseHours * 3_600_000;
  let sweepTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * The two automatic hand-back rules for staff-handled chats:
   * - the customer's latest message has waited `inboxAutoHandbackMinutes` with no staff reply →
   *   back to the AI, which tells them the team is busy and answers; the chat stays flagged;
   * - no activity at all for `inboxIdleReleaseHours` (someone forgot to hand back) → quietly back
   *   to the AI, so the next message is answered straight away.
   * The mode switch is a conditional update, so a staff reply or hand-back that lands meanwhile wins.
   */
  async function sweep(now = Date.now()) {
    if (!waitMs && !idleMs) return;
    const handled = await db.messagingConversation.findMany({
      where: { mode: 'AGENT' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { role: true, text: true, createdAt: true } } },
    });
    for (const c of handled) {
      const last = c.messages[0];
      const lastAt = (last?.createdAt ?? c.handledSince ?? c.lastMessageAt).getTime();
      const customerWaiting = last?.role === 'USER';
      try {
        if (waitMs && customerWaiting && now - lastAt >= waitMs) {
          const claimed = await db.messagingConversation.updateMany({
            where: { id: c.id, mode: 'AGENT', handledById: c.handledById },
            data: {
              mode: 'AI',
              handledById: null,
              handledSince: null,
              needsAgent: true,
              needsAgentReason: `No staff reply within ${config.inboxAutoHandbackMinutes} min — the AI answered instead. Take over again to continue.`,
            },
          });
          if (claimed.count === 0) continue;
          // `c` still names the staff member who had it, so they're told along with the managers.
          void alerts.needsAgent(
            c,
            `Waited ${config.inboxAutoHandbackMinutes} min with no staff reply — the AI is answering for now.`,
            last?.text ?? null,
          );
          const adapter = adapters[c.channel];
          const notice =
            "Sorry for the wait — our team is busy right now. ERA's AI assistant will help you in the meantime, and a team member can still join this chat.";
          await adapter?.send(c.externalChatId, notice);
          await db.messagingMessage.create({ data: { conversationId: c.id, role: 'ASSISTANT', text: notice } });
          log.info('inbox.auto_handback', { conversationId: c.id, reason: 'customer_waiting' });
          await adapter?.answerPending(c.id);
        } else if (idleMs && now - lastAt >= idleMs) {
          const released = await db.messagingConversation.updateMany({
            where: { id: c.id, mode: 'AGENT', handledById: c.handledById },
            data: { mode: 'AI', handledById: null, handledSince: null },
          });
          if (released.count) log.info('inbox.auto_handback', { conversationId: c.id, reason: 'idle' });
        }
      } catch (err) {
        log.error('inbox.auto_handback_failed', { conversationId: c.id, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

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
    startSweep() {
      if (sweepTimer || (!waitMs && !idleMs)) return;
      sweepTimer = setInterval(() => void sweep(), SWEEP_EVERY_MS);
    },
    stopSweep() {
      if (sweepTimer) clearInterval(sweepTimer);
      sweepTimer = null;
    },
    /** Exposed for tests; normally run by the timer. */
    sweep,
    /** Shown in the Inbox so staff know when a chat returns to the AI. */
    rules: { autoHandbackMinutes: config.inboxAutoHandbackMinutes, idleReleaseHours: config.inboxIdleReleaseHours },

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
      return {
        attention: rows.filter(({ row }) => needsAttention(row)).length,
        /** Chats with customer messages no one has opened yet (AI-answered ones included). */
        unread: rows.filter(({ row }) => row.unreadCount > 0).length,
      };
    },

    async get(viewer: InboxViewer, id: string) {
      const { convo, lead } = await load(viewer, id);
      const messages = await db.messagingMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        take: THREAD_LIMIT,
        select: { id: true, role: true, text: true, agentId: true, createdAt: true },
      });
      return {
        conversation: convo,
        lead,
        messages: messages.reverse(),
        rules: { autoHandbackMinutes: config.inboxAutoHandbackMinutes, idleReleaseHours: config.inboxIdleReleaseHours },
      };
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
      // A bot speaks for everyone, so say who's writing (the website shows the name itself).
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
