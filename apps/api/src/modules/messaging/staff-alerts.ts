import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { can, CrmEvents, type Capability } from '@era/contracts';
import type { ModuleContext } from '../../platform/module.js';
import type { ReplyMarkup } from './telegram.js';

/** How long a link code from the Inbox stays usable. */
const LINK_CODE_TTL_MS = 15 * 60_000;
/** t.me/<bot>?start=staff_<code> — Telegram allows [A-Za-z0-9_-], max 64 chars. */
export const STAFF_START_PREFIX = 'staff_';

/** Telegram refuses link buttons to addresses it can't reach (localhost, LAN). */
export function isPublicUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return !(
      host === 'localhost' ||
      host.endsWith('.local') ||
      /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host) ||
      !host.includes('.')
    );
  } catch {
    return false;
  }
}

/** The running bot, as alerts need it — bound late (the bot also calls back into alerts). */
export interface AlertSender {
  send(chatId: string, text: string, markup?: ReplyMarkup): Promise<unknown>;
  botUsername(): string | null;
}

/** A chat-app conversation, as much of it as an alert needs. */
interface AlertConversation {
  id: string;
  channel: string;
  displayName: string | null;
  username: string | null;
  leadId: string | null;
  handledById: string | null;
}

const isDuplicate = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
/** "FACEBOOK_ADS" → "Facebook ads" — channel keys are admin-defined, so no fixed label map. */
const channelLabel = (key: string) => key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');
const customerLabel = (c: Pick<AlertConversation, 'displayName' | 'username'>) =>
  [c.displayName ?? 'A customer', c.username ? `(@${c.username})` : null].filter(Boolean).join(' ');
const quote = (text: string) => `“${text.length > 200 ? `${text.slice(0, 200)}…` : text}”`;

/**
 * Staff alerts on Telegram, so a customer waiting on a person isn't missed while nobody has the
 * Inbox open. Each staff member links their own Telegram chat with the bot (from the Inbox), and
 * only hears about what they could open there — the Inbox's visibility rule: `crm:read:all` sees
 * everything; others see chats they handle and leads they own. Alerts never block or fail the
 * customer's conversation: a failed send is logged and dropped.
 */
export function createStaffAlerts({ db, modules, bus, logger }: ModuleContext, sender: AlertSender) {
  const log = logger.child({ svc: 'staff-alerts' });

  /** Linked, active staff among `userIds` (or every linked one when omitted) who pass `allowed`. */
  async function recipients(allowed: (user: { id: string; capabilities: Capability[] }) => boolean, userIds?: string[]) {
    const links = await db.messagingStaffAlertLink.findMany({
      where: { chatId: { not: null }, ...(userIds ? { userId: { in: userIds } } : {}) },
    });
    if (links.length === 0) return [];
    const access = new Map((await modules.identity.listUserAccess(links.map((l) => l.userId))).map((u) => [u.id, u]));
    return links.filter((l) => {
      const user = access.get(l.userId);
      if (!user?.active) return false;
      const capabilities = user.capabilities as Capability[];
      return can(capabilities, 'crm:read') && allowed({ id: user.id, capabilities });
    });
  }

  type Link = Awaited<ReturnType<typeof recipients>>[number];

  /** One alert per recipient, with an "Open …" button when their back office has a public address. */
  async function deliver(to: Link[], text: string, button?: { label: string; path: string }) {
    await Promise.all(
      to.map(async (link) => {
        const url = button && link.adminUrl ? `${link.adminUrl.replace(/\/$/, '')}${button.path}` : null;
        // Telegram only accepts button links it can reach; a local/LAN back office gets the address
        // as plain text instead.
        const markup: ReplyMarkup | undefined =
          url && isPublicUrl(url) ? { inline_keyboard: [[{ text: button!.label, url }]] } : undefined;
        const footer = !button || markup ? '' : `\n\n${url ?? 'Open it in the back office Inbox.'}`;
        try {
          await sender.send(link.chatId!, text + footer, markup);
        } catch (err) {
          log.warn('staff_alert.send_failed', { userId: link.userId, error: err instanceof Error ? err.message : String(err) });
        }
      }),
    );
  }

  /** Who may see this conversation in the Inbox. */
  async function conversationViewers(convo: AlertConversation) {
    const lead = convo.leadId ? ((await modules.crm.listLeadSummaries([convo.leadId]))[0] ?? null) : null;
    return recipients(
      (u) => can(u.capabilities, 'crm:read:all') || u.id === convo.handledById || (!!lead && lead.ownerId === u.id),
    );
  }

  /** Never lets an alert problem reach the caller (a customer's reply, a lead being created). */
  function safely(what: string, job: () => Promise<void>) {
    return job().catch((err: unknown) =>
      log.error('staff_alert.failed', { what, error: err instanceof Error ? err.message : String(err) }),
    );
  }

  return {
    /** Subscribes to new leads — call once at startup. */
    start() {
      bus.subscribe<{ leadId: string; source: string; assignedTo: string | null }>(CrmEvents.LeadCreated.type, (env) =>
        safely('lead_created', async () => {
          const { leadId, source, assignedTo } = env.payload;
          // Idempotent: a redelivered event finds its key already taken.
          try {
            await db.messagingStaffAlertSent.create({ data: { key: `lead:${leadId}` } });
          } catch (err) {
            if (isDuplicate(err)) return;
            throw err;
          }
          // To its owner; an unassigned lead (no active agents) goes to the managers instead.
          const to = await recipients((u) => (assignedTo ? u.id === assignedTo : can(u.capabilities, 'crm:read:all')));
          if (to.length === 0) return;
          const lead = (await modules.crm.listLeadSummaries([leadId]))[0];
          if (!lead) return;
          const contact = [lead.phone, lead.email].filter(Boolean).join(' · ');
          await deliver(
            to,
            [
              assignedTo ? '📋 New lead assigned to you' : '📋 New lead — not assigned to anyone yet',
              `${lead.contactName}${contact ? ` · ${contact}` : ''}`,
              `From: ${channelLabel(source)}`,
            ].join('\n'),
            { label: 'Open lead', path: `/leads?open=${encodeURIComponent(leadId)}` },
          );
        }),
      );
    },

    /** The AI asked for a person (request_agent), or a staff-handled chat went unanswered and the AI
     * stepped back in — everyone who can open the chat hears about it. */
    needsAgent(convo: AlertConversation, reason: string, lastMessage: string | null) {
      return safely('needs_agent', async () => {
        const to = await conversationViewers(convo);
        await deliver(
          to,
          [
            `🙋 ${customerLabel(convo)} on ${channelLabel(convo.channel)} needs a person`,
            `Why: ${reason}`,
            lastMessage ? `Last message: ${quote(lastMessage)}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
          { label: 'Open in Inbox', path: `/inbox?c=${encodeURIComponent(convo.id)}` },
        );
      });
    },

    /** The customer wrote to a chat a staff member took over — that person only. Sent for the first
     * unread message, not every one. */
    customerWaiting(convo: AlertConversation, text: string) {
      return safely('customer_waiting', async () => {
        if (!convo.handledById) return;
        const to = await recipients((u) => u.id === convo.handledById, [convo.handledById]);
        await deliver(
          to,
          [`💬 ${customerLabel(convo)} wrote in a chat you're handling`, quote(text)].join('\n'),
          { label: 'Reply in Inbox', path: `/inbox?c=${encodeURIComponent(convo.id)}` },
        );
      });
    },

    /* ── Linking (admin Inbox ↔ the bot) ── */

    async status(userId: string) {
      const link = await db.messagingStaffAlertLink.findUnique({ where: { userId } });
      return {
        /** The bot is running and knows its @username — linking is possible. */
        available: !!sender.botUsername(),
        linked: !!link?.chatId,
        telegramName: link?.chatId ? link.telegramName : null,
        linkedAt: link?.chatId ? link.linkedAt : null,
      };
    },

    /** A fresh one-time code as a t.me link; opening it in Telegram and pressing Start links that chat. */
    async createLink(userId: string, adminUrl: string) {
      const bot = sender.botUsername();
      if (!bot) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'The Telegram bot is not connected, so alerts are unavailable.' });
      }
      const code = randomBytes(18).toString('base64url');
      const data = { linkCode: code, linkCodeExpiresAt: new Date(Date.now() + LINK_CODE_TTL_MS), adminUrl };
      await db.messagingStaffAlertLink.upsert({ where: { userId }, create: { userId, ...data }, update: data });
      return { url: `https://t.me/${bot}?start=${STAFF_START_PREFIX}${code}`, expiresInMinutes: LINK_CODE_TTL_MS / 60_000 };
    },

    async unlink(userId: string) {
      await db.messagingStaffAlertLink.deleteMany({ where: { userId } });
      return { linked: false };
    },

    /** A test alert, so staff can see what one looks like. */
    async sendTest(userId: string) {
      const link = await db.messagingStaffAlertLink.findUnique({ where: { userId } });
      if (!link?.chatId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Telegram alerts are not turned on for you yet.' });
      try {
        await sender.send(
          link.chatId,
          "🔔 Test alert from ERA Back Office — alerts reach you here. You'll get one when a customer asks for a person, writes in a chat you're handling, or a new lead is assigned to you.",
        );
      } catch (err) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: `Couldn't send the test alert: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
      return { ok: true };
    },

    /** The bot received "/start staff_<code>": tie this Telegram chat to the code's user. Resolves
     * to the reply to send — never creates a customer conversation. */
    async claimLink(code: string, chatId: string, telegramName: string | null): Promise<string> {
      const link = await db.messagingStaffAlertLink.findUnique({ where: { linkCode: code } });
      if (!link || !link.linkCodeExpiresAt || link.linkCodeExpiresAt.getTime() < Date.now()) {
        return 'This alert link has expired or was already used. In the back office, open Inbox → "Telegram alerts" to get a new one.';
      }
      await db.messagingStaffAlertLink.update({
        where: { userId: link.userId },
        data: { chatId, telegramName, linkedAt: new Date(), linkCode: null, linkCodeExpiresAt: null },
      });
      const user = await modules.identity.getUser(link.userId);
      log.info('staff_alert.linked', { userId: link.userId });
      return (
        `✅ Alerts are on${user ? ` for ${user.name}` : ''}.\n\n` +
        "You'll get a message here when a customer asks for a person, writes in a chat you're handling, or a new lead is assigned to you.\n\n" +
        'To stop them, send /stopalerts or turn them off in the back office Inbox.'
      );
    },

    /** "/stopalerts" from a linked chat. null = this chat isn't linked (treat as a normal message). */
    async stopFromChat(chatId: string): Promise<string | null> {
      const removed = await db.messagingStaffAlertLink.deleteMany({ where: { chatId } });
      return removed.count > 0 ? '🔕 Alerts are off. Turn them on again from the back office Inbox.' : null;
    },
  };
}

export type StaffAlerts = ReturnType<typeof createStaffAlerts>;
