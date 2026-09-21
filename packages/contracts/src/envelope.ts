import { z } from 'zod';

/**
 * Every message on the bus — event or command — is wrapped in this envelope.
 * The shape is transport-agnostic: the in-process bus and a future NATS /
 * RabbitMQ transport move this exact object. Nothing in a module should depend
 * on which transport is behind the `EventBus` interface.
 */
export const eventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  /** "<module>.<event>" in snake_case, e.g. "inventory.unit_reserved" */
  type: z.string().min(1),
  /** payload schema version; bump when a payload changes incompatibly */
  version: z.number().int().positive(),
  occurredAt: z.string().datetime(),
  /** ties together every message in one workflow (saga) — carry it through for tracing */
  correlationId: z.string().uuid().optional(),
  payload: z.unknown(),
});

export type EventEnvelope<T = unknown> = Omit<z.infer<typeof eventEnvelopeSchema>, 'payload'> & {
  payload: T;
};

/** Binds a message-type string to its payload schema + version, in one place. */
export interface MessageDef<TName extends string, TSchema extends z.ZodTypeAny> {
  type: TName;
  version: number;
  schema: TSchema;
}

export function defineMessage<TName extends string, TSchema extends z.ZodTypeAny>(
  type: TName,
  version: number,
  schema: TSchema,
): MessageDef<TName, TSchema> {
  return { type, version, schema };
}

/** Payload type for a given definition, e.g. `PayloadOf<typeof InventoryEvents.UnitReserved>`. */
export type PayloadOf<D> = D extends MessageDef<string, infer S> ? z.infer<S> : never;
