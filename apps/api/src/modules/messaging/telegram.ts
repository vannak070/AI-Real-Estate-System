/**
 * Minimal Telegram Bot API client — just the handful of methods the bot uses, over plain fetch
 * (no SDK dependency). https://core.telegram.org/bots/api
 */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  /** Set when the contact is a Telegram user — equals `from.id` when they shared their own. */
  user_id?: number;
}

export interface TelegramPhotoSize {
  file_id: string;
  width: number;
  height: number;
}

export interface TelegramMessage {
  message_id: number;
  photo?: TelegramPhotoSize[];
  caption?: string;
  /** Set when the customer swipe-replied to an earlier message (e.g. one of our photo cards). */
  reply_to_message?: TelegramMessage;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  contact?: TelegramContact;
}

/** A tap on an inline button under one of our messages. */
export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

/** The update types the bot subscribes to. */
const ALLOWED_UPDATES = ['message', 'callback_query'];

/** Thrown for a Telegram API error response; `code` is Telegram's error_code (401 = bad token,
 * 409 = another getUpdates/webhook is active). */
export class TelegramApiError extends Error {
  constructor(
    readonly method: string,
    readonly code: number,
    description: string,
  ) {
    super(`telegram ${method} failed (${code}): ${description}`);
  }
}

export type ReplyMarkup =
  | {
      keyboard: { text: string; request_contact?: boolean }[][];
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
      input_field_placeholder?: string;
    }
  | { remove_keyboard: true }
  | { inline_keyboard: ({ text: string; url: string } | { text: string; callback_data: string })[][] };

/** A photo to send: bytes from disk (uploaded), a URL Telegram fetches itself, or the file_id of
 * one already sent (Telegram keeps it — no re-upload). */
export type PhotoSource = { file: Buffer; filename: string } | { url: string } | { fileId: string };

/** Telegram's per-message limit is 4096 characters. */
const MAX_TEXT = 4000;

export function createTelegramClient(apiBase: string, token: string) {
  const base = `${apiBase.replace(/\/$/, '')}/bot${token}`;

  async function call<T>(method: string, body: Record<string, unknown> | FormData = {}, signal?: AbortSignal): Promise<T> {
    const res = await fetch(`${base}/${method}`, {
      method: 'POST',
      // FormData (file uploads) sets its own multipart content-type.
      ...(body instanceof FormData ? { body } : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      signal,
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; result: T }
      | { ok: false; error_code: number; description: string }
      | null;
    if (!json) throw new TelegramApiError(method, res.status, 'invalid response');
    if (!json.ok) throw new TelegramApiError(method, json.error_code, json.description);
    return json.result;
  }

  return {
    getMe: () => call<TelegramUser>('getMe'),
    /** Resolves to the sent message's id and the file_id Telegram assigned the photo (for reuse).
     * Captions max 1024 chars. */
    async sendPhoto(chatId: number | string, photo: PhotoSource, caption: string, replyMarkup?: ReplyMarkup) {
      const fields: Record<string, unknown> = {
        chat_id: chatId,
        caption: caption.slice(0, 1024),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      };
      let body: Record<string, unknown> | FormData;
      if ('file' in photo) {
        const form = new FormData();
        for (const [k, v] of Object.entries(fields)) form.append(k, typeof v === 'string' ? v : JSON.stringify(v));
        form.append('photo', new Blob([new Uint8Array(photo.file)]), photo.filename);
        body = form;
      } else {
        body = { ...fields, photo: 'url' in photo ? photo.url : photo.fileId };
      }
      const sent = await call<TelegramMessage>('sendPhoto', body);
      return { messageId: sent.message_id, fileId: sent.photo?.at(-1)?.file_id ?? null };
    },
    /** Stops the button's loading spinner; `text` shows as a brief toast. */
    answerCallbackQuery: (callbackQueryId: string, text?: string) =>
      call<true>('answerCallbackQuery', { callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
    getUpdates: (offset: number | undefined, timeoutSec: number, signal?: AbortSignal) =>
      call<TelegramUpdate[]>('getUpdates', { offset, timeout: timeoutSec, allowed_updates: ALLOWED_UPDATES }, signal),
    setWebhook: (url: string, secretToken: string) =>
      call<true>('setWebhook', { url, secret_token: secretToken, allowed_updates: ALLOWED_UPDATES }),
    /** Polling and a webhook can't both be active. Pending updates are kept, not dropped. */
    deleteWebhook: () => call<true>('deleteWebhook', { drop_pending_updates: false }),
    sendChatAction: (chatId: number | string, action: 'typing' | 'upload_photo') => call<true>('sendChatAction', { chat_id: chatId, action }),
    /** Plain text (no parse_mode — model output must never be interpreted as markup). Long
     * replies are split across several messages; the keyboard goes on the last one. Resolves to
     * the last message's id. */
    async sendMessage(chatId: number | string, text: string, replyMarkup?: ReplyMarkup): Promise<number> {
      const parts: string[] = [];
      let rest = text;
      while (rest.length > MAX_TEXT) {
        const cut = rest.lastIndexOf('\n', MAX_TEXT) > MAX_TEXT / 2 ? rest.lastIndexOf('\n', MAX_TEXT) : MAX_TEXT;
        parts.push(rest.slice(0, cut));
        rest = rest.slice(cut).trimStart();
      }
      parts.push(rest);
      let lastId = 0;
      for (let i = 0; i < parts.length; i++) {
        const last = i === parts.length - 1;
        const sent = await call<TelegramMessage>('sendMessage', {
          chat_id: chatId,
          text: parts[i],
          link_preview_options: { is_disabled: !last },
          ...(last && replyMarkup ? { reply_markup: replyMarkup } : {}),
        });
        lastId = sent.message_id;
      }
      return lastId;
    },
  };
}

export type TelegramClient = ReturnType<typeof createTelegramClient>;
