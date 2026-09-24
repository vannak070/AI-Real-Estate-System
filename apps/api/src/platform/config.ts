import { z } from 'zod';

const schema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(4000),
  host: z.string().default('0.0.0.0'),
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),
  eventBus: z.enum(['inprocess', 'nats']).default('inprocess'),
  natsUrl: z.string().default('nats://localhost:4222'),
  /** Browser origins allowed to call the API with credentials (cookies). */
  corsOrigins: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  /** Optional on purpose — the whole API must still start for everyone who hasn't set up the
   * AI assistant (Tier 1) yet. `assistant.router.ts`'s `chat` procedure is what actually
   * requires this, and throws a clear error there if it's missing. */
  anthropicApiKey: z.string().min(1).optional(),
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
    anthropicApiKey: env.ANTHROPIC_API_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return parsed.data;
}
