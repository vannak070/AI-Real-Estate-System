import { newId, type Logger } from '@era/shared';
import type { EventEnvelope } from '@era/contracts';
import type { EventBus, EventHandler, PublishOptions, Subscription } from './types.js';

/**
 * Monolith transport: in-memory fan-out with the same async, isolated,
 * publisher-doesn't-wait semantics a broker gives you. Swapping in NatsEventBus
 * must not change how any module behaves.
 */
export class InProcessEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly inflight = new Set<Promise<void>>();

  constructor(private readonly logger: Logger) {}

  async start(): Promise<void> {
    /* nothing to connect */
  }

  async stop(): Promise<void> {
    await this.drain();
    this.handlers.clear();
  }

  subscribe<T>(type: string, handler: EventHandler<T>): Subscription {
    const set = this.handlers.get(type) ?? new Set<EventHandler>();
    set.add(handler as EventHandler);
    this.handlers.set(type, set);
    return {
      unsubscribe: () => {
        this.handlers.get(type)?.delete(handler as EventHandler);
      },
    };
  }

  async publish<T>(type: string, payload: T, opts: PublishOptions = {}): Promise<void> {
    const env: EventEnvelope<T> = {
      id: newId(),
      type,
      version: opts.version ?? 1,
      occurredAt: new Date().toISOString(),
      correlationId: opts.correlationId,
      payload,
    };

    const targets = [...(this.handlers.get(type) ?? [])];
    this.logger.info('event.published', { type, id: env.id, handlers: targets.length });

    for (const handler of targets) {
      // async + isolated: a failing handler neither blocks nor fails its peers
      // or the publisher — it is logged (a broker would also retry).
      const run = Promise.resolve()
        .then(() => handler(env))
        .catch((err: unknown) => {
          this.logger.error('event.handler_failed', {
            type,
            id: env.id,
            error: err instanceof Error ? err.message : String(err),
          });
        })
        .finally(() => {
          this.inflight.delete(run);
        });
      this.inflight.add(run);
    }
  }

  /** Test / graceful-shutdown helper — NOT part of the EventBus contract. */
  async drain(): Promise<void> {
    while (this.inflight.size > 0) {
      await Promise.all([...this.inflight]);
    }
  }
}
