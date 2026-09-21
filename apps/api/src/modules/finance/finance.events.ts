import { SalesEvents } from '@era/contracts';
import type { EventBus } from '../../platform/event-bus/index.js';
import type { FinanceService } from './finance.service.js';

/** Finance reacts to Sales signing a contract: generates the invoice schedule and accrues commission. */
export function registerFinanceSubscriptions(bus: EventBus, service: FinanceService) {
  bus.subscribe(SalesEvents.ContractSigned.type, (env) => {
    const { contractId } = env.payload as { contractId: string };
    return service.onContractSigned(contractId);
  });
}
