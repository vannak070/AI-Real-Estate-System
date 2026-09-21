import { SalesEvents } from '@era/contracts';
import type { EventEnvelope } from '@era/contracts';
import type { EventBus } from '../../platform/event-bus/index.js';
import type { InventoryService } from './inventory.service.js';

/** Inventory reacts to Sales — never calls it. */
export function registerInventorySubscriptions(bus: EventBus, service: InventoryService) {
  bus.subscribe(SalesEvents.ReservationRequested.type, (env) =>
    service.handleReservationRequested(
      env as EventEnvelope<{ reservationId: string; unitId: string; agentId: string }>,
    ),
  );

  bus.subscribe(SalesEvents.ContractSigned.type, (env) => {
    const { unitId, contractId } = env.payload as { unitId: string; contractId: string };
    return service.markSold(unitId, contractId, env.correlationId);
  });

  bus.subscribe(SalesEvents.ReservationCancelled.type, (env) => {
    const { unitId, reservationId } = env.payload as { unitId: string; reservationId: string };
    return service.releaseUnit(unitId, reservationId, env.correlationId);
  });
}
