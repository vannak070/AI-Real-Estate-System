import { InventoryEvents } from '@era/contracts';
import type { EventBus } from '../../platform/event-bus/index.js';
import type { SalesService } from './sales.service.js';

/** Sales drives the saga and reacts to Inventory's outcome events. */
export function registerSalesSubscriptions(bus: EventBus, service: SalesService) {
  bus.subscribe(InventoryEvents.UnitReserved.type, (env) => {
    const { reservationId } = env.payload as { reservationId: string };
    return service.onUnitReserved(reservationId);
  });

  bus.subscribe(InventoryEvents.UnitReservationRejected.type, (env) => {
    const { reservationId, reason } = env.payload as { reservationId: string; reason: string };
    return service.onUnitReservationRejected(reservationId, reason);
  });
}
