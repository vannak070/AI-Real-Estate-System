import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createTelegramBot, type TelegramStatus } from './telegram-bot.js';
import { createInbox, type Inbox } from './inbox.js';
import { createStaffAlerts, type StaffAlerts } from './staff-alerts.js';
import type { TelegramUpdate } from './telegram.js';

export type { TelegramStatus };

/**
 * Chat apps (Telegram today; Messenger/WhatsApp next) answered by the AI assistant. This module
 * owns the platform side — receiving messages, storing conversations (messaging.prisma), sending
 * replies — and asks `ctx.modules.assistant` for each AI reply; leads land in CRM through the
 * assistant's submit_lead tool with the chat app as their source.
 */
export interface MessagingApi {
  status(): { telegram: TelegramStatus };
  /** The admin Inbox (read, take over, reply). Used by messaging.router.ts — it lives here, not in
   * a router-built service, because it sends through the running bot instance created below. */
  inbox: Inbox;
  /** Staff alerts on Telegram — linking from the Inbox, used by messaging.router.ts. */
  alerts: StaffAlerts;
}

export const messagingModule: AppModule<MessagingApi> = {
  name: 'messaging',
  register(ctx: ModuleContext) {
    // Alerts send through the bot and the bot hands alerts its /start links — bound late.
    const alerts = createStaffAlerts(ctx, {
      send: (chatId, text, markup) => telegram.sendText(chatId, text, markup),
      botUsername: () => telegram.status.botUsername,
    });
    const telegram = createTelegramBot(ctx, alerts);
    const inbox = createInbox(ctx, telegram, alerts);
    return {
      api: { status: () => ({ telegram: { ...telegram.status } }), inbox, alerts },
      // Platform webhooks are the one deliberate exception to "HTTP is tRPC": Telegram (and later
      // Meta) POST their own payload format to a URL we register with them.
      routes(app) {
        app.post('/webhooks/telegram', async (req, reply) => {
          if (!telegram.verifyWebhook(req.headers['x-telegram-bot-api-secret-token'] as string | undefined)) {
            return reply.status(401).send({ error: 'unauthorized' });
          }
          // Answer at once and reply to the customer in the background — Telegram re-sends an
          // update it doesn't get a quick 200 for (duplicates are skipped anyway).
          telegram.handleUpdate(req.body as TelegramUpdate);
          return { ok: true };
        });
      },
      start: () => {
        alerts.start();
        telegram.start();
        inbox.startSweep();
      },
      stop: async () => {
        inbox.stopSweep();
        await telegram.stop();
      },
    };
  },
};
