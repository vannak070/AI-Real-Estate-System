import type { EventEnvelope } from '@era/contracts';

export type { EventEnvelope };

export type EventHandler<T = unknown> = (env: EventEnvelope<T>) => Promise<void> | void;

export interface Subscription {
  unsubscribe(): void;
}

export interface PublishOptions {
  version?: number;
  correlationId?: string;
}

/**
 * The seam between modules. Everything below is transport-independent so module
 * code is identical whether messages travel in-process or over NATS/RabbitMQ.
 *
 * Delivery contract (hold this constant across transports):
 *  - `publish` resolves when the message is ACCEPTED, not when handlers finish.
 *  - Handler errors NEVER propagate to the publisher — they are logged and, with
 *    a real broker, retried. Design handlers to be idempotent.
 *  - Fan-out: 0..n handlers per type.
 */
export interface EventBus {
  publish<T>(type: string, payload: T, opts?: PublishOptions): Promise<void>;
  subscribe<T>(type: string, handler: EventHandler<T>): Subscription;
  start(): Promise<void>;
  stop(): Promise<void>;
}
