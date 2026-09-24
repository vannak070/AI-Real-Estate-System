import Anthropic from '@anthropic-ai/sdk';
import { TRPCError } from '@trpc/server';
import type { PropertyCategory, PropertyType } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';
import type { PublicProjectView } from '../inventory/index.js';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOOL_ROUNDS = 4;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const SYSTEM_PROMPT = `You are the AI Property Assistant for ERA Cambodia, a real estate company operating in Phnom Penh and across Cambodia. You chat with visitors on the public website.

Rules you must always follow:
- Only discuss ERA Cambodia real estate: buying, renting, and the company's own listed properties.
- NEVER state a specific price, availability, address, amenity, or any other property fact unless it came from a search_properties or get_property tool call earlier in THIS conversation. If you don't have real data yet, call a tool before answering — do not guess or make anything up.
- Do not give legal, tax, mortgage, or financial advice. Offer to connect the visitor with a human agent for that instead.
- When a visitor shows genuine interest (wants a viewing, wants a callback, asks "how do I proceed") and you don't already have their contact details from earlier in the conversation, ask for their name and a phone number or email. Once you have at least a name plus phone or email, call the submit_lead tool.
- CRITICAL: never say or imply that you have submitted, saved, passed along, or forwarded the visitor's details unless you have actually invoked the submit_lead tool IN THIS SAME RESPONSE and seen its result. Saying "I've passed your details to our sales team" without actually calling submit_lead first is a serious error — it is a real, unrecoverable claim to the visitor, and a real CRM lead must exist for it to be true. If you intend to submit their details, call the tool FIRST — do not write the confirmation text in the same turn as just deciding to do it.
- Never call submit_lead more than once per conversation.
- Keep replies short and conversational — this is a chat widget, not an essay. Use plain text (no markdown tables).`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_properties',
    description: "Search ERA Cambodia's real, currently-listed properties. Returns up to a handful of the best matches. Call this whenever a visitor describes what they're looking for.",
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['SALE', 'RENT'], description: 'Buy (SALE) or rent (RENT).' },
        propertyType: {
          type: 'string',
          enum: ['CONDO', 'HOUSE', 'VILLA', 'TOWNHOUSE', 'SHOPHOUSE', 'LAND', 'BOREY', 'COMMERCIAL'],
        },
        location: { type: 'string', description: 'Free-text area or city, e.g. "BKK1" or "Siem Reap".' },
      },
    },
  },
  {
    name: 'get_property',
    description: 'Get full details for one specific property by id (the id comes from a prior search_properties result, or from page context given to you at the start of the conversation).',
    input_schema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'submit_lead',
    description: "Submit the visitor's contact details to ERA's real sales CRM. Only call this once, after you have a name and at least a phone or email, and after telling the visitor you're about to do this.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        message: { type: 'string', description: "Short summary of what the visitor wants (property of interest, viewing request, budget, etc.)." },
        preferredProjectId: {
          type: 'string',
          description: 'The real `id` field of the property from an earlier search_properties or get_property result — NEVER the property name. Omit this if you are not certain of the exact id.',
        },
      },
      required: ['name'],
    },
  },
];

/** In-process, per-IP sliding-window limiter — this is a single-instance deployment with no
 * Redis in the stack yet, and the endpoint is unauthenticated, so this is the pragmatic ceiling
 * against a runaway loop or a bot racking up real Anthropic API cost. Resets on process restart;
 * that's an acceptable tradeoff for a first version. */
const requestLog = new Map<string, number[]>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Too many messages — please wait a moment and try again.' });
  }
  recent.push(now);
  requestLog.set(ip, recent);
}

export function createAssistantService(ctx: ModuleContext) {
  const client = ctx.config.anthropicApiKey ? new Anthropic({ apiKey: ctx.config.anthropicApiKey }) : null;

  async function runTool(name: string, input: Record<string, unknown>, collected: Map<string, PublicProjectView>): Promise<unknown> {
    switch (name) {
      case 'search_properties': {
        const results = await ctx.modules.inventory.searchPublicProjects({
          category: input.category as PropertyCategory | undefined,
          propertyType: input.propertyType as PropertyType | undefined,
          location: input.location as string | undefined,
        });
        for (const p of results) collected.set(p.id, p);
        return results;
      }
      case 'get_property': {
        const projectId = input.projectId as string;
        const project = await ctx.modules.inventory.getPublicProject(projectId);
        if (!project) return { error: 'Property not found.' };
        collected.set(project.id, project);
        const units = await ctx.modules.inventory.listPublicUnits(projectId);
        return { ...project, units };
      }
      case 'submit_lead': {
        // The model sometimes passes a property NAME here instead of the id from an earlier
        // search_properties/get_property result (seen live in testing) — `preferredProjectId`
        // is a bare, unvalidated id column with no DB-level FK (see crm.prisma), so a bad value
        // would otherwise silently corrupt a real Lead record rather than fail loudly. Verify
        // it's a real project id before trusting it; if not, drop it but keep the property name
        // in the free-text message so the information isn't lost, just not hard-linked.
        const claimedId = input.preferredProjectId as string | undefined;
        let preferredProjectId: string | undefined;
        let message = input.message as string | undefined;
        if (claimedId) {
          const known = collected.get(claimedId) ?? (await ctx.modules.inventory.getPublicProject(claimedId));
          if (known) {
            preferredProjectId = known.id;
          } else {
            message = [message, `(Mentioned property: ${claimedId})`].filter(Boolean).join(' ');
          }
        }
        const lead = await ctx.modules.crm.createLead({
          name: input.name as string,
          phone: input.phone as string | undefined,
          email: input.email as string | undefined,
          message,
          preferredProjectId,
        });
        return { success: true, leadId: lead.id };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  return {
    async chat(input: { messages: ChatMessage[]; propertyId?: string; propertyName?: string }, meta: { ip: string }) {
      if (!client) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI assistant is not configured (ANTHROPIC_API_KEY missing).' });
      }
      if (input.messages.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No messages provided.' });
      }
      if (input.messages.length > MAX_MESSAGES) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This conversation has gotten too long — please start a new one.' });
      }
      for (const m of input.messages) {
        if (m.content.length > MAX_MESSAGE_LENGTH) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Message is too long.' });
        }
      }
      checkRateLimit(meta.ip);

      const system = input.propertyId
        ? `${SYSTEM_PROMPT}\n\nThe visitor arrived from the page for a specific property: id "${input.propertyId}"${input.propertyName ? ` ("${input.propertyName}")` : ''}. If this is the start of the conversation, call get_property with that id right away so your first reply is grounded in its real details.`
        : SYSTEM_PROMPT;

      const messages: Anthropic.MessageParam[] = input.messages.map((m) => ({ role: m.role, content: m.content }));
      const collectedProperties = new Map<string, PublicProjectView>();

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages,
          tools: TOOLS,
        });

        if (response.stop_reason !== 'tool_use') {
          const reply = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
            .trim();
          return {
            reply: reply || "Sorry, I didn't quite catch that — could you rephrase?",
            properties: Array.from(collectedProperties.values()),
          };
        }

        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          const result = await runTool(block.name, block.input as Record<string, unknown>, collectedProperties);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
        }
        messages.push({ role: 'user', content: toolResults });
      }

      return {
        reply: "I'm having trouble finding what you need right now — could you tell me a bit more, or would you like to speak with a human agent?",
        properties: Array.from(collectedProperties.values()),
      };
    },
  };
}

export type AssistantService = ReturnType<typeof createAssistantService>;
