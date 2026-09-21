import { z } from 'zod';
import { defineMessage } from './envelope.js';

/**
 * Commands = do something, exactly one handler (the owning module).
 * Same envelope + bus as events today. When you split, events map to pub/sub
 * and commands map to request/reply — keeping them as separate vocabularies now
 * means that later change is mechanical.
 */

export const InventoryCommands = {
  ReserveUnit: defineMessage(
    'inventory.reserve_unit',
    1,
    z.object({ unitId: z.string(), reservationId: z.string(), requestedBy: z.string() }),
  ),
  ReleaseUnit: defineMessage(
    'inventory.release_unit',
    1,
    z.object({ unitId: z.string(), reservationId: z.string() }),
  ),
  MarkUnitSold: defineMessage(
    'inventory.mark_unit_sold',
    1,
    z.object({ unitId: z.string(), contractId: z.string() }),
  ),
} as const;
