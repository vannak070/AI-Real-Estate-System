import type { AppModule, ModuleContext } from '../../platform/module.js';
import {
  createAssistantService,
  type MessagingCustomer,
  type MessagingReply,
  type PropertyCard,
  type WebsiteReply,
} from './assistant.service.js';

export type { MessagingCustomer, MessagingReply, PropertyCard, WebsiteReply };

// This module only ever calls OUT to inventory/crm (via ctx.modules) and to the Anthropic API.
// Its cross-module entry points are for the messaging module, which owns every conversation —
// the chat apps (Telegram, …) and the website chat: receiving messages, storing history — and
// asks this module for the AI reply.
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
  replyOnWebsite(input: {
    /** Oldest first, ending with the visitor's new message. */
    history: { role: 'user' | 'assistant'; content: string }[];
    leadId: string | null;
    campaignCode?: string;
    propertyId?: string;
    propertyName?: string;
    rateKey: string;
  }): Promise<WebsiteReply>;
}

export const assistantModule: AppModule<AssistantApi> = {
  name: 'assistant',
  register(ctx: ModuleContext) {
    const service = createAssistantService(ctx);
    return {
      api: {
        replyToMessage: (input) => service.replyToMessage(input),
        replyOnWebsite: (input) => service.replyOnWebsite(input),
      },
    };
  },
};
