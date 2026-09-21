import type { Logger } from '@era/shared';
import type { Config } from '../config.js';
import type { EventBus } from './types.js';
import { InProcessEventBus } from './in-process-bus.js';
import { NatsEventBus } from './nats-bus.js';

export * from './types.js';
export { InProcessEventBus } from './in-process-bus.js';
export { NatsEventBus } from './nats-bus.js';

export function createEventBus(config: Config, logger: Logger): EventBus {
  switch (config.eventBus) {
    case 'nats':
      return new NatsEventBus(config.natsUrl, logger.child({ bus: 'nats' }));
    case 'inprocess':
      return new InProcessEventBus(logger.child({ bus: 'inprocess' }));
  }
}
