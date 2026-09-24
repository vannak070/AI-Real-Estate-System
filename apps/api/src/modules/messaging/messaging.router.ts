import { router, withCapability } from '../../trpc/trpc.js';
import type { ModuleContext } from '../../platform/module.js';

export function messagingRouter({ modules }: ModuleContext) {
  return router({
    /** Bot connection state for the Marketing → Channels tab. */
    status: withCapability('marketing:read').query(() => modules.messaging.status()),
  });
}
