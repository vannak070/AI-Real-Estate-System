import { z } from 'zod';

const schema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(4000),
  host: z.string().default('0.0.0.0'),
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),
  eventBus: z.enum(['inprocess', 'nats']).default('inprocess'),
  natsUrl: z.string().default('nats://localhost:4222'),
  /** Behind a reverse proxy (production: Caddy): read the visitor's real IP from X-Forwarded-For.
   * Without it every visitor shares the proxy's IP — and one per-IP chat rate limit. */
  trustProxy: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  /** Session cookie only over HTTPS. Turn on as soon as the site has a domain + HTTPS; must stay
   * off on plain HTTP (the browser would drop the cookie and nobody could sign in). */
  cookieSecure: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  /** Browser origins allowed to call the API with credentials (cookies). */
  corsOrigins: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  /** Optional on purpose — the whole API must still start for everyone who hasn't set up the
   * AI assistant (Tier 1) yet. `assistant.router.ts`'s `chat` procedure is what actually
   * requires this, and throws a clear error there if it's missing. */
  anthropicApiKey: z.string().min(1).optional(),
  /** Signs the chat's "lead created in this conversation" reference so a website visitor can
   * correct their own details without being able to touch anyone else's lead. Optional: without
   * it a random per-process secret is used, so references stop working after an API restart
   * (a correction then creates a new lead instead of updating). */
  chatTokenSecret: z.string().min(16).optional(),
  /** From @BotFather. Optional — without it the Telegram bot simply doesn't start. */
  telegramBotToken: z.string().min(20).optional(),
  /** Telegram Bot API base — only overridden by tests (a local fake of the API). */
  telegramApiBase: z.string().url().default('https://api.telegram.org'),
  /** This API's public HTTPS address (e.g. https://api.eracambodia.com). Set → the bot uses a
   * webhook at <url>/webhooks/telegram. Unset (local dev) → it long-polls Telegram instead, which
   * needs no public address at all. */
  publicApiUrl: z.string().url().optional(),
  /** The customer website's address — bots link customers to property pages there. */
  publicSiteUrl: z.string().url().default('http://localhost:5173'),
  /** Inbox: a staff-handled chat whose customer has waited this long with no staff reply goes
   * back to the AI, which answers them (0 = never). */
  inboxAutoHandbackMinutes: z.coerce.number().int().min(0).max(24 * 60).default(30),
  /** Inbox: a staff-handled chat with no activity at all for this long quietly returns to the AI,
   * so a chat someone forgot to hand back doesn't leave the next message unanswered (0 = never). */
  inboxIdleReleaseHours: z.coerce.number().int().min(0).max(24 * 30).default(12),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse({
    nodeEnv: env.NODE_ENV,
    port: env.API_PORT,
    host: env.API_HOST,
    databaseUrl: env.DATABASE_URL,
    eventBus: env.EVENT_BUS,
    natsUrl: env.NATS_URL,
    corsOrigins: env.CORS_ORIGINS,
    trustProxy: env.TRUST_PROXY,
    cookieSecure: env.COOKIE_SECURE,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    chatTokenSecret: env.CHAT_TOKEN_SECRET,
    telegramBotToken: env.TELEGRAM_BOT_TOKEN || undefined,
    telegramApiBase: env.TELEGRAM_API_BASE || undefined,
    publicApiUrl: env.PUBLIC_API_URL || undefined,
    publicSiteUrl: env.PUBLIC_SITE_URL || undefined,
    inboxAutoHandbackMinutes: env.INBOX_AUTO_HANDBACK_MINUTES || undefined,
    inboxIdleReleaseHours: env.INBOX_IDLE_RELEASE_HOURS || undefined,
  });
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return parsed.data;
}
