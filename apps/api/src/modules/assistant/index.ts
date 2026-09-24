import type { AppModule, ModuleContext } from '../../platform/module.js';

// This module only ever calls OUT to inventory/crm (via ctx.modules) and to the Anthropic API —
// no sibling module needs to call back into it, so its own cross-module API is empty. Its
// service (assistant.service.ts) is constructed directly in trpc/root.ts for the router, the
// same pattern every other module's service follows.
export type AssistantApi = Record<string, never>;

// HTTP surface for this module is the tRPC router (assistant.router.ts), composed
// in src/trpc/root.ts — not registered here. See ARCHITECTURE.md.
export const assistantModule: AppModule<AssistantApi> = {
  name: 'assistant',
  register(_ctx: ModuleContext) {
    return { api: {} };
  },
};
