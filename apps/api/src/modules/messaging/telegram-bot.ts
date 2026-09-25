import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';
import { resolveUploadPath } from '../../platform/uploads.js';
import type { PropertyCard } from '../assistant/index.js';
import {
  createTelegramClient,
  TelegramApiError,
  type PhotoSource,
  type ReplyMarkup,
  type TelegramCallbackQuery,
  type TelegramMessage,
  type TelegramUpdate,
} from './telegram.js';

/** The marketing channel key — every conversation and lead from the bot is recorded under it. */
const CHANNEL = 'TELEGRAM';
/** Messages of history sent to the AI each turn (older ones stay stored, just not sent). */
const HISTORY_LIMIT = 20;
const MAX_INBOUND_LENGTH = 2000;
const POLL_TIMEOUT_SEC = 25;

const SHARE_CONTACT_KEYBOARD: ReplyMarkup = {
  keyboard: [[{ text: '📱 Share my phone number', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
  input_field_placeholder: 'Ask about a property…',
};

const greeting = (firstName: string) =>
  `Hi ${firstName}! 👋 I'm ERA Cambodia's AI property assistant.\n\n` +
  'Ask me about condos, houses, villas or land for sale or rent — for example "2-bedroom condo for rent in BKK1 under $1,000".\n\n' +
  'Would you like an agent to contact you? Tap "📱 Share my phone number" below at any time.';

const FAILURE_REPLY: Record<'not_configured' | 'rate_limited' | 'failed', string> = {
  rate_limited: "You're sending messages very quickly — please wait a minute and try again.",
  not_configured: "Sorry, I can't answer right now. Please try again a little later.",
  failed: "Sorry, I'm having trouble answering right now. Please try again in a moment.",
};

export interface TelegramStatus {
  /** TELEGRAM_BOT_TOKEN is set. */
  configured: boolean;
  /** How updates arrive: polling (local dev) or webhook (PUBLIC_API_URL set). null = not running. */
  mode: 'polling' | 'webhook' | null;
  botUsername: string | null;
  /** Latest connection problem, cleared once Telegram answers again. */
  error: string | null;
}

/** Telegram refuses link buttons to addresses it can't reach (localhost, LAN). */
function isPublicUrl(url: string): boolean {
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

/** "2. Time Square 5 ⏎ From $80,000 ⏎ 📍 BKK1" — numbered when there are several, so a customer
 * can answer "the second one" / "2". */
function cardCaption(card: PropertyCard, number: number | null): string {
  const price =
    card.startingPrice == null
      ? null
      : `From $${card.startingPrice.toLocaleString('en-US')}${card.category === 'RENT' ? '/month' : ''}`;
  const title = number ? `${number}. ${card.name}` : card.name;
  return [title, price, card.location ? `📍 ${card.location}` : null].filter(Boolean).join('\n');
}

/** Button taps arrive as callback data: "d:<projectId>" (details) / "v:<projectId>" (viewing). */
const CARD_ACTIONS = { d: 'details', v: 'viewing' } as const;
/** Cap on remembered card messages (for swipe-replies) — oldest are forgotten first. */
const MAX_REMEMBERED_CARDS = 5000;

const isDuplicate = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

export function createTelegramBot({ config, db, logger, modules }: ModuleContext) {
  const log = logger.child({ svc: 'telegram' });
  const status: TelegramStatus = { configured: !!config.telegramBotToken, mode: null, botUsername: null, error: null };
  const token = config.telegramBotToken;
  if (!token) {
    return {
      status,
      start() {},
      async stop() {},
      verifyWebhook: () => false,
      handleUpdate() {},
      async sendText(_chatId: string, _text: string): Promise<number> {
        throw new Error('The Telegram bot is not connected (TELEGRAM_BOT_TOKEN is not set).');
      },
    };
  }

  const tg = createTelegramClient(config.telegramApiBase, token);
  // Registered with Telegram on every start (setWebhook), so a fresh random secret per process
  // is enough — Telegram echoes it in a header we check on each webhook call.
  const webhookSecret = randomBytes(24).toString('hex');
  /** One message at a time per chat, in arrival order — two quick messages never race. */
  const chains = new Map<string, Promise<void>>();
  let abort: AbortController | null = null;
  let pollLoop: Promise<void> | null = null;
  /** Image path → Telegram's file_id for it: each photo is uploaded once, then reused. */
  const photoIds = new Map<string, string>();
  const siteIsPublic = isPublicUrl(config.publicSiteUrl);
  /** "<chatId>:<messageId>" of each photo card sent → its property, so a swipe-reply to a card is
   * understood. In memory (lost on restart — the caption is used then). */
  const cardMessages = new Map<string, { projectId: string; name: string }>();
  function rememberCard(chatId: string, messageId: number, card: PropertyCard) {
    cardMessages.set(`${chatId}:${messageId}`, { projectId: card.id, name: card.name });
    if (cardMessages.size > MAX_REMEMBERED_CARDS) cardMessages.delete(cardMessages.keys().next().value!);
  }

  function fail(err: unknown) {
    status.error = err instanceof Error ? err.message : String(err);
  }

  async function send(chatId: string, text: string, markup?: ReplyMarkup) {
    await tg.sendMessage(chatId, text, markup);
  }

  /** Where Telegram gets the photo: a saved file_id, a public URL, or (local dev — Telegram can't
   * reach this machine) the file uploaded from disk. null = no usable photo. */
  async function photoSource(imageUrl: string): Promise<PhotoSource | null> {
    const known = photoIds.get(imageUrl);
    if (known) return { fileId: known };
    if (/^https?:\/\//.test(imageUrl)) return { url: imageUrl };
    if (config.publicApiUrl) return { url: `${config.publicApiUrl.replace(/\/$/, '')}${imageUrl}` };
    const file = resolveUploadPath(imageUrl);
    if (!file) return null;
    try {
      return { file: await readFile(file), filename: path.basename(file) };
    } catch {
      return null;
    }
  }

  /** One photo card per recommended property; any card whose photo fails falls back to text. */
  async function sendCards(chatId: string, cards: PropertyCard[]) {
    for (const [i, card] of cards.entries()) {
      const caption = cardCaption(card, cards.length > 1 ? i + 1 : null);
      // Tap instead of type — "I love this" under five photos is otherwise ambiguous.
      const markup: ReplyMarkup = {
        inline_keyboard: [
          [
            { text: 'ℹ️ More details', callback_data: `d:${card.id}` },
            { text: '📅 Book a viewing', callback_data: `v:${card.id}` },
          ],
          // A website button needs an address Telegram can open — not localhost.
          ...(siteIsPublic ? [[{ text: '🌐 View on website', url: card.url }]] : []),
        ],
      };
      const source = card.imageUrl ? await photoSource(card.imageUrl) : null;
      if (source && card.imageUrl) {
        try {
          void tg.sendChatAction(chatId, 'upload_photo').catch(() => {});
          const sent = await tg.sendPhoto(chatId, source, caption, markup);
          if (sent.fileId) photoIds.set(card.imageUrl, sent.fileId);
          rememberCard(chatId, sent.messageId, card);
          continue;
        } catch (err) {
          log.warn('telegram.photo_failed', { projectId: card.id, error: err instanceof Error ? err.message : String(err) });
        }
      }
      rememberCard(chatId, await tg.sendMessage(chatId, caption, markup), card);
    }
  }

  /** "[Replying to photo card: …]" context for a swipe-reply, so "I love this" names the property. */
  function replyContext(chatId: string, replied: TelegramMessage | undefined): string | null {
    if (!replied) return null;
    const card = cardMessages.get(`${chatId}:${replied.message_id}`);
    if (card) return `[Replying to photo card: "${card.name}" (property id ${card.projectId})]`;
    const quoted = (replied.caption ?? replied.text ?? '').split('\n')[0]?.trim();
    if (!quoted) return null;
    return replied.photo ? `[Replying to photo card: "${quoted.replace(/^\d+\.\s*/, '')}"]` : `[Replying to: "${quoted.slice(0, 200)}"]`;
  }

  /** A button tap → what the customer meant, as their message ("Tell me more about …"). */
  async function buttonText(data: string | undefined): Promise<string | null> {
    const match = /^([dv]):([A-Za-z0-9_-]{1,40})$/.exec(data ?? '');
    if (!match) return null;
    const action = CARD_ACTIONS[match[1] as keyof typeof CARD_ACTIONS];
    const project = await modules.inventory.getPublicProject(match[2]!);
    if (!project) return null;
    return action === 'details'
      ? `Tell me more about "${project.name}" (property id ${project.id}).`
      : `I'd like to book a viewing of "${project.name}" (property id ${project.id}).`;
  }

  /** `tap`: a button press, handled as if the customer had typed `tap.text`. */
  async function processMessage(msg: TelegramMessage, tap?: { externalId: string; text: string }) {
    const from = msg.from!;
    const chatId = String(msg.chat.id);
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(' ') || undefined;

    const convo = await db.messagingConversation.upsert({
      where: { channel_externalChatId: { channel: CHANNEL, externalChatId: chatId } },
      create: { channel: CHANNEL, externalChatId: chatId, displayName, username: from.username },
      update: { displayName, username: from.username ?? null, lastMessageAt: new Date() },
    });

    const text = tap ? tap.text : msg.text?.trim();
    const contact = tap ? undefined : msg.contact;
    const isCommand = !!text?.startsWith('/');
    let userText: string | null = null;
    if (text && !isCommand) {
      const context = tap ? null : replyContext(chatId, msg.reply_to_message);
      userText = context ? `${context} ${text}` : text;
    }
    if (contact) {
      const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
      userText = `My contact details (shared from Telegram): name ${name}, phone ${contact.phone_number}.`;
    }

    // Record the inbound message first: the (conversation, message id) unique key makes a
    // redelivered update (webhook retry, poll after a crash) a no-op instead of a second reply.
    let inbound;
    try {
      inbound = await db.messagingMessage.create({
        data: {
          conversationId: convo.id,
          role: 'USER',
          text: userText ?? text ?? (convo.mode === 'AGENT' ? '[Sent a photo, sticker or file — not shown in the Inbox]' : ''),
          externalId: tap ? tap.externalId : String(msg.message_id),
        },
      });
    } catch (err) {
      if (isDuplicate(err)) return;
      throw err;
    }
    await db.messagingConversation.update({ where: { id: convo.id }, data: { unreadCount: { increment: 1 } } });
    // A staff member has taken over in the Inbox: the AI stays silent and the message just waits
    // there for them (commands and button taps included — they're the customer talking to a person).
    if (convo.mode === 'AGENT') return;
    const saveReply = (reply: string) =>
      db.messagingMessage.create({ data: { conversationId: convo.id, role: 'ASSISTANT', text: reply } });

    if (text?.startsWith('/start')) {
      // t.me/<bot>?start=<campaign code> arrives as "/start <code>" — first campaign wins.
      const payload = text.split(/\s+/)[1];
      if (payload && /^[a-z0-9-]{1,64}$/i.test(payload) && !convo.campaignCode) {
        await db.messagingConversation.update({ where: { id: convo.id }, data: { campaignCode: payload.toLowerCase() } });
      }
      const reply = greeting(from.first_name);
      await send(chatId, reply, SHARE_CONTACT_KEYBOARD);
      await saveReply(reply);
      return;
    }
    if (text === '/new') {
      // Start the conversation over (the lead, if any, stays linked).
      await db.messagingMessage.deleteMany({ where: { conversationId: convo.id, id: { not: inbound.id } } });
      const reply = 'Fresh start! What kind of property are you looking for?';
      await send(chatId, reply, SHARE_CONTACT_KEYBOARD);
      await saveReply(reply);
      return;
    }
    if (isCommand) {
      await send(chatId, 'Just type your question — for example "houses for sale in Siem Reap".');
      return;
    }
    if (contact?.user_id && contact.user_id !== from.id) {
      await send(chatId, "That looks like someone else's contact. To share yours, tap the button below.", SHARE_CONTACT_KEYBOARD);
      return;
    }
    if (!userText) {
      await send(chatId, 'Sorry, I can only read text messages for now — please type your question.');
      return;
    }
    if (userText.length > MAX_INBOUND_LENGTH) {
      await send(chatId, 'That message is a bit long for me — could you shorten it?');
      return;
    }

    // "typing…" lasts ~5s on Telegram; keep it up while the AI works.
    const typing = () => void tg.sendChatAction(chatId, 'typing').catch(() => {});
    typing();
    const typingTimer = setInterval(typing, 4500);
    let result;
    try {
      const recent = await db.messagingMessage.findMany({
        where: { conversationId: convo.id },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
      });
      const history = recent
        .reverse()
        .filter((m) => m.text && !m.text.startsWith('/'))
        .map((m) =>
          m.role === 'USER'
            ? { role: 'user' as const, content: m.text }
            : // Staff replies are part of our side of the conversation; mark them so the AI knows.
              { role: 'assistant' as const, content: m.role === 'AGENT' ? `[ERA staff member replied:] ${m.text}` : m.text },
        );

      result = await modules.assistant.replyToMessage({
        source: CHANNEL,
        platform: 'Telegram',
        history,
        leadId: convo.leadId,
        campaignCode: convo.campaignCode ?? undefined,
        customer: { displayName, username: from.username },
        rateKey: `tg:${chatId}`,
      });
    } finally {
      clearInterval(typingTimer);
    }

    if (!result.ok) {
      // Not stored: a failure notice isn't conversation the AI should see next turn.
      await send(chatId, FAILURE_REPLY[result.reason]);
      return;
    }
    // Re-read: a staff member may have taken over while the AI was thinking — then its reply is dropped.
    const latest = await db.messagingConversation.update({
      where: { id: convo.id },
      data: {
        ...(result.leadId !== convo.leadId ? { leadId: result.leadId } : {}),
        ...(result.wantsAgent ? { needsAgent: true, needsAgentReason: result.wantsAgent } : {}),
      },
      select: { mode: true },
    });
    if (latest.mode === 'AGENT') return;
    await saveReply(result.transcript);
    // Photo cards first, then the text — its follow-up question ends up last, next to the input.
    await sendCards(chatId, result.cards);
    // Once they've shared their number, the share button has done its job.
    if (result.reply) await send(chatId, result.reply, contact ? { remove_keyboard: true } : undefined);
  }

  /** A button tap: stop the spinner at once, then treat it as the customer's message. */
  async function processTap(cq: TelegramCallbackQuery) {
    const text = await buttonText(cq.data);
    await tg.answerCallbackQuery(cq.id, text ? undefined : 'Sorry, that listing is no longer available.').catch(() => {});
    if (!text || !cq.message) return;
    await processMessage({ ...cq.message, from: cq.from }, { externalId: `cb:${cq.id}`, text });
  }

  function handleUpdate(update: TelegramUpdate) {
    const cq = update.callback_query;
    const msg = update.message ?? cq?.message;
    const from = update.message?.from ?? cq?.from;
    // Private chats with real people only — the bot isn't meant for groups.
    if (!msg || msg.chat.type !== 'private' || !from || from.is_bot) return;
    const chatId = String(msg.chat.id);
    const next = (chains.get(chatId) ?? Promise.resolve())
      .then(() => (cq ? processTap(cq) : processMessage(msg)))
      .catch((err: unknown) => {
        log.error('telegram.message_failed', { error: err instanceof Error ? err.message : String(err) });
        return send(chatId, FAILURE_REPLY.failed).catch(() => {});
      })
      .finally(() => {
        if (chains.get(chatId) === next) chains.delete(chatId);
      });
    chains.set(chatId, next);
  }

  const sleep = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true });
    });

  async function poll(signal: AbortSignal) {
    let offset: number | undefined;
    let backoff = 1000;
    while (!signal.aborted) {
      try {
        if (!status.botUsername) status.botUsername = (await tg.getMe()).username ?? null;
        const updates = await tg.getUpdates(offset, POLL_TIMEOUT_SEC, signal);
        status.error = null;
        backoff = 1000;
        for (const u of updates) {
          offset = u.update_id + 1;
          handleUpdate(u);
        }
      } catch (err) {
        if (signal.aborted) return;
        if (err instanceof TelegramApiError && err.code === 401) {
          status.error = 'Telegram rejected the bot token — check TELEGRAM_BOT_TOKEN.';
          status.mode = null;
          log.error('telegram.bad_token', {});
          return;
        }
        fail(err);
        log.warn('telegram.poll_failed', { error: status.error, retryInMs: backoff });
        await sleep(backoff, signal);
        backoff = Math.min(backoff * 2, 30_000);
      }
    }
  }

  async function init() {
    if (config.publicApiUrl) {
      const url = `${config.publicApiUrl.replace(/\/$/, '')}/webhooks/telegram`;
      try {
        status.botUsername = (await tg.getMe()).username ?? null;
        await tg.setWebhook(url, webhookSecret);
        status.mode = 'webhook';
        status.error = null;
        log.info('telegram.webhook_set', { url, bot: status.botUsername });
      } catch (err) {
        fail(err);
        log.error('telegram.webhook_failed', { error: status.error });
      }
      return;
    }
    // Local dev: long polling needs no public address. It can't run while a webhook is
    // registered (e.g. left over from a deployed copy), so clear that first.
    abort = new AbortController();
    status.mode = 'polling';
    try {
      await tg.deleteWebhook();
    } catch (err) {
      fail(err);
    }
    log.info('telegram.polling_started', {});
    pollLoop = poll(abort.signal);
  }

  return {
    status,
    /** Runs in the background — never blocks or fails API startup. */
    start() {
      void init();
    },
    async stop() {
      abort?.abort();
      await pollLoop;
      // Let replies already in progress finish (bounded, so shutdown can't hang).
      await Promise.race([Promise.allSettled([...chains.values()]), new Promise((r) => setTimeout(r, 8000))]);
    },
    /** A staff member's reply from the Inbox. Resolves to the Telegram message id. */
    sendText(chatId: string, text: string) {
      return tg.sendMessage(chatId, text);
    },
    verifyWebhook(header: string | undefined) {
      if (status.mode !== 'webhook' || !header) return false;
      const a = Buffer.from(header);
      const b = Buffer.from(webhookSecret);
      return a.length === b.length && timingSafeEqual(a, b);
    },
    handleUpdate,
  };
}

export type TelegramBot = ReturnType<typeof createTelegramBot>;
