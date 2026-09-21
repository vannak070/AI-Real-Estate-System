import type { Logger } from '@era/shared';
import type { EventBus, EventHandler, PublishOptions, Subscription } from './types.js';

/**
 * Post-split transport. Implement this when you extract the first module; the
 * rest of the app already targets `EventBus`, so only this file plus
 * `EVENT_BUS=nats` change.
 *
 * Sketch (with the `nats` package + JetStream):
 *
 *   const nc = await connect({ servers: this.url });
 *   const js = nc.jetstream();
 *   // publish:
 *   await js.publish(subject(type), this.codec.encode(envelope), { msgID: envelope.id });
 *   // subscribe (durable, at-least-once):
 *   const sub = await js.subscribe(subject(type), { queue: SERVICE_NAME, config: { durable_name: ... } });
 *   for await (const m of sub) { await handler(decode(m)); m.ack(); }
 *
 * Keep the envelope shape and the delivery contract from `types.ts` intact.
 */
export class NatsEventBus implements EventBus {
  constructor(
    private readonly url: string,
    private readonly logger: Logger,
  ) {}

  async start(): Promise<void> {
    this.logger.error('nats.not_implemented', { url: this.url });
    throw new Error(
      'NatsEventBus is a stub. Set EVENT_BUS=inprocess, or implement JetStream wiring in ' +
        'apps/api/src/platform/event-bus/nats-bus.ts before extracting a service.',
    );
  }

  async stop(): Promise<void> {
    /* no-op */
  }

  publish<T>(_type: string, _payload: T, _opts?: PublishOptions): Promise<void> {
    throw new Error('NatsEventBus.publish not implemented');
  }

  subscribe<T>(_type: string, _handler: EventHandler<T>): Subscription {
    throw new Error('NatsEventBus.subscribe not implemented');
  }
}
