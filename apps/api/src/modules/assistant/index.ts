import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createAssistantService, type MessagingCustomer, type MessagingReply, type PropertyCard } from './assistant.service.js';

export type { MessagingCustomer, MessagingReply, PropertyCard };

// This module only ever calls OUT to inventory/crm (via ctx.modules) and to the Anthropic API.
// Its one cross-module entry point is for the messaging module (Telegram, …), which owns the
// chat-app side — receiving messages, storing history — and asks this module for the AI reply.
// The website chat goes through the tRPC router instead (assistant.router.ts, built in trpc/root.ts).
export interface AssistantApi {
  replyToMessage(input: {
    /** Channel key the message came from (e.g. "TELEGRAM") — a new lead's source. The caller
     * must have verified it (signed webhook / its own bot connection), never taken it from the user. */
    source: string;
    /** Human name of the platform for the prompt, e.g. "Telegram". */
    platform: string;
    /** Oldest first, ending with the customer's new message. */
    history: { role: 'user' | 'assistant'; content: string }[];
    /** The lead this conversation already created, so corrections update it. */
    leadId: string | null;
    campaignCode?: string;
    customer: MessagingCustomer;
    rateKey: string;
  }): Promise<MessagingReply>;
}

export const assistantModule: AppModule<AssistantApi> = {
  name: 'assistant',
  register(ctx: ModuleContext) {
    const service = createAssistantService(ctx);
    return { api: { replyToMessage: (input) => service.replyToMessage(input) } };
  },
};
