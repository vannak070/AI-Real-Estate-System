import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import type { MessagingConversation, MessagingMessage, Prisma } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';
import type { PublicProjectView } from '../inventory/index.js';
import type { StaffAlerts } from './staff-alerts.js';

/** The marketing channel key — website conversations and their leads are recorded under it. */
export const WEBSITE_CHANNEL = 'WEBSITE';
/** Messages of history sent to the AI each turn (older ones stay stored, just not sent). */
const HISTORY_LIMIT = 20;
/** Messages a returning visitor sees. */
const THREAD_LIMIT = 200;
const MAX_INBOUND_LENGTH = 2000;
/** Per-IP limit on stored messages — the AI has its own limit, but a staff-handled chat stores
 * messages without calling it, and the endpoint is public. */
const SEND_WINDOW_MS = 60_000;
const SEND_MAX = 20;

const FAILURE_REPLY: Record<'not_configured' | 'rate_limited' | 'failed', string> = {
  rate_limited: "You're sending messages a bit fast — please wait a moment and try again.",
  not_configured: "Sorry, I can't answer right now. Please try again a little later, or call us.",
  failed: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
};

/** What the visitor's browser gets — never the conversation id, lead id or staff user ids. */
export interface WebsiteMessageView {
  id: string;
  sender: 'user' | 'bot' | 'agent';
  text: string;
  /** Staff messages: the team member's first name. */
  agentName: string | null;
  properties: PublicProjectView[];
  createdAt: Date;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/**
 * The website chat (apps/client ChatPage.tsx), stored like the chat apps' conversations so it
 * shows in the admin Inbox: staff see it, get alerts for it, and can take it over. The visitor's
 * browser holds a random token (the conversation's externalChatId) — the only key to it — and
 * polls for staff replies, so a visitor who comes back later finds the team's answer waiting.
 */
export function createWebsiteChat({ db, modules, logger }: ModuleContext, alerts: StaffAlerts) {
  const log = logger.child({ svc: 'website-chat' });
  const sendLog = new Map<string, number[]>();

  function allowSend(ip: string) {
    const now = Date.now();
    const recent = (sendLog.get(ip) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
    if (recent.length >= SEND_MAX) return false;
    recent.push(now);
    sendLog.set(ip, recent);
    return true;
  }

  const findByToken = (token: string) =>
    db.messagingConversation.findUnique({
      where: { channel_externalChatId: { channel: WEBSITE_CHANNEL, externalChatId: token } },
    });

  async function toViews(messages: MessagingMessage[]): Promise<WebsiteMessageView[]> {
    const agentIds = [...new Set(messages.map((m) => m.agentId).filter((id): id is string => !!id))];
    const names = new Map((await modules.identity.listUserAccess(agentIds)).map((u) => [u.id, firstName(u.name)]));
    return messages.map((m) => ({
      id: m.id,
      sender: m.role === 'USER' ? 'user' : m.role === 'AGENT' ? 'agent' : 'bot',
      text: m.text,
      agentName: m.agentId ? (names.get(m.agentId) ?? 'ERA team') : null,
      properties: Array.isArray(m.attachments) ? (m.attachments as unknown as PublicProjectView[]) : [],
      createdAt: m.createdAt,
    }));
  }

  /**
   * The AI answers everything the visitor has written so far. Used for each new message, and by
   * the Inbox when a chat is handed back to the AI with the visitor still waiting. Returns the
   * stored reply, or a failure notice that isn't stored (it isn't conversation the AI should see).
   */
  async function replyWithAi(
    convo: MessagingConversation,
    context: { propertyId?: string; propertyName?: string; ip?: string } = {},
  ): Promise<{ stored: MessagingMessage | null; failure: string | null }> {
    const recent = await db.messagingMessage.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    const history = recent.reverse().map((m) => {
      if (m.role === 'USER') return { role: 'user' as const, content: m.text };
      if (m.role === 'AGENT') return { role: 'assistant' as const, content: `[ERA staff member replied:] ${m.text}` };
      // The cards' ids, so "the second one" still resolves on the next turn.
      const cards = Array.isArray(m.attachments) ? (m.attachments as unknown as PublicProjectView[]) : [];
      const shown = cards.length
        ? `\n[Property cards shown: ${cards.map((p, i) => `${i + 1}. ${p.name} (id ${p.id})`).join('; ')}]`
        : '';
      return { role: 'assistant' as const, content: `${m.text}${shown}` };
    });
    const lastCustomerText = [...history].reverse().find((m) => m.role === 'user')?.content ?? null;

    const result = await modules.assistant.replyOnWebsite({
      history,
      leadId: convo.leadId,
      campaignCode: convo.campaignCode ?? undefined,
      propertyId: context.propertyId,
      propertyName: context.propertyName,
      // Per visitor IP, as before the chat was stored; the sweep has no IP, so per conversation.
      rateKey: context.ip ? `ip:${context.ip}` : `web:${convo.id}`,
    });
    if (!result.ok) return { stored: null, failure: FAILURE_REPLY[result.reason] };

    // A new lead names the conversation, so the Inbox and staff alerts show who it is.
    let displayName: string | undefined;
    if (result.leadId && result.leadId !== convo.leadId) {
      displayName = (await modules.crm.listLeadSummaries([result.leadId]))[0]?.contactName;
    }
    // Re-read: a staff member may have taken over while the AI was thinking — then its reply is dropped.
    const latest = await db.messagingConversation.update({
      where: { id: convo.id },
      data: {
        ...(result.leadId !== convo.leadId ? { leadId: result.leadId } : {}),
        ...(displayName ? { displayName } : {}),
        ...(result.wantsAgent ? { needsAgent: true, needsAgentReason: result.wantsAgent } : {}),
      },
    });
    if (latest.mode === 'AGENT') return { stored: null, failure: null };
    if (result.wantsAgent && !convo.needsAgent) {
      void alerts.needsAgent(latest, result.wantsAgent, lastCustomerText);
    }
    const stored = await db.messagingMessage.create({
      data: {
        conversationId: convo.id,
        role: 'ASSISTANT',
        text: result.reply,
        ...(result.properties.length ? { attachments: result.properties as unknown as Prisma.InputJsonValue } : {}),
      },
    });
    return { stored, failure: null };
  }

  return {
    /** The visitor sends a message. No token = a new conversation (its token comes back). */
    async send(
      input: { token?: string; text: string; propertyId?: string; propertyName?: string; campaignCode?: string },
      meta: { ip: string },
    ) {
      const text = input.text.trim();
      if (!text) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Please type a message.' });
      if (text.length > MAX_INBOUND_LENGTH) throw new TRPCError({ code: 'BAD_REQUEST', message: 'That message is too long — could you shorten it?' });
      if (!allowSend(meta.ip)) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: FAILURE_REPLY.rate_limited });

      // An unknown token (a conversation deleted since) simply starts a new one.
      let convo = input.token ? await findByToken(input.token) : null;
      if (!convo) {
        convo = await db.messagingConversation.create({
          data: {
            channel: WEBSITE_CHANNEL,
            externalChatId: randomBytes(24).toString('base64url'),
            campaignCode: input.campaignCode?.toLowerCase() ?? null,
          },
        });
      }
      const inbound = await db.messagingMessage.create({ data: { conversationId: convo.id, role: 'USER', text } });
      const { unreadCount } = await db.messagingConversation.update({
        where: { id: convo.id },
        data: { unreadCount: { increment: 1 }, lastMessageAt: new Date() },
        select: { unreadCount: true },
      });

      const replies: MessagingMessage[] = [];
      let failure: string | null = null;
      if (convo.mode === 'AGENT') {
        // A staff member has it: the AI stays silent, and their first unread message pings them.
        if (unreadCount === 1) void alerts.customerWaiting(convo, text);
      } else {
        const answer = await replyWithAi(convo, { propertyId: input.propertyId, propertyName: input.propertyName, ip: meta.ip });
        if (answer.stored) replies.push(answer.stored);
        failure = answer.failure;
      }
      const after = await db.messagingConversation.findUniqueOrThrow({ where: { id: convo.id }, select: { mode: true } });
      return {
        token: convo.externalChatId,
        messages: await toViews([inbound, ...replies]),
        /** Shown to the visitor, not stored (e.g. the AI is busy). */
        notice: failure,
        withTeam: after.mode === 'AGENT',
      };
    },

    /** A returning visitor's conversation, or — with `afterId` — only what's new since then (polling). */
    async history(input: { token: string; afterId?: string }) {
      const convo = await findByToken(input.token);
      if (!convo) return { found: false as const, messages: [], withTeam: false };
      let since: Date | undefined;
      if (input.afterId) {
        const last = await db.messagingMessage.findFirst({
          where: { id: input.afterId, conversationId: convo.id },
          select: { createdAt: true },
        });
        since = last?.createdAt;
      }
      const messages = await db.messagingMessage.findMany({
        where: { conversationId: convo.id, ...(since ? { createdAt: { gt: since } } : {}) },
        orderBy: { createdAt: 'desc' },
        take: THREAD_LIMIT,
      });
      return { found: true as const, messages: await toViews(messages.reverse()), withTeam: convo.mode === 'AGENT' };
    },

    /** For the Inbox's automatic hand-back: the AI answers the visitor who's been waiting. */
    async answerPending(conversationId: string) {
      const convo = await db.messagingConversation.findUnique({ where: { id: conversationId } });
      if (!convo || convo.mode !== 'AI') return;
      try {
        await replyWithAi(convo);
      } catch (err) {
        log.error('website_chat.answer_pending_failed', { conversationId, error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}

export type WebsiteChat = ReturnType<typeof createWebsiteChat>;
