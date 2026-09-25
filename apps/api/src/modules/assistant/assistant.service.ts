import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { TRPCError } from '@trpc/server';
import type { PropertyCategory, PropertyType } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';
import type { PublicProjectView } from '../inventory/index.js';
import { createKnowledgeStore } from './knowledge.js';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOOL_ROUNDS = 4;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const INTRO = 'You are the AI Property Assistant for ERA Cambodia, a real estate company operating in Phnom Penh and across Cambodia.';

const RULES = `Rules you must always follow:
- Only discuss ERA Cambodia real estate: buying, renting, and the company's own listed properties.
- NEVER state a specific price, availability, address, amenity, or any other property fact unless it came from a search_properties or get_property tool call earlier in THIS conversation. If you don't have real data yet, call a tool before answering — do not guess or make anything up.
- When the visitor mentions a specific property by name, call search_properties with just its name before answering. Only say a property isn't listed after a name search returned nothing — and then offer similar options.
- Do not give legal, tax, mortgage, or financial advice. Offer to connect the visitor with a human agent for that instead.
- When a visitor shows genuine interest (wants a viewing, wants a callback, asks "how do I proceed") and you don't already have their contact details from earlier in the conversation, ask for their name and a phone number or email. Once you have at least a name plus phone or email, call the submit_lead tool.
- CRITICAL: never say or imply that you have submitted, saved, updated, passed along, or forwarded the visitor's details unless you have actually invoked the submit_lead tool IN THIS SAME RESPONSE and seen its result. Saying "I've passed your details to our sales team" without actually calling submit_lead first is a serious error — it is a real, unrecoverable claim to the visitor, and a real CRM lead must exist for it to be true. If you intend to submit their details, call the tool FIRST — do not write the confirmation text in the same turn as just deciding to do it.
- If the visitor later corrects or adds to the contact details they gave (a different phone number, a new or fixed email, a name correction), call submit_lead again with their complete, up-to-date details — it updates the record you already created instead of making a new one. Don't call it again if nothing changed.
- Only say details were saved or updated when submit_lead returned "success": true. If it returned "success": false, say plainly that it was NOT saved, what looks wrong, and ask them to re-enter it — never say "I've updated/saved" in that case, not even alongside a warning.
- Keep replies short and conversational — this is a chat, not an essay. Use plain text (no markdown tables).
- Reply in the language the visitor writes in (e.g. Khmer, English or Chinese).`;

const WEBSITE_PROMPT = `${INTRO} You chat with visitors on the public website.\n\n${RULES}`;

/**
 * Chat apps show text exactly as sent, so markdown shows up as literal symbols. Seen live: the
 * model used **bold** on Telegram despite the prompt forbidding it — so it's stripped here, as a
 * guarantee rather than a request.
 */
export function toPlainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[\s(])\*(\S(?:.*?\S)?)\*(?=[\s).,!?:;]|$)/gm, '$1$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^(\s*)[*•]\s+/gm, '$1- ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1: $2');
}

/** Chat apps show raw text, and the customer can't see the website's property cards. */
/** The fixed part of a chat app's instructions — identical for every customer, so it caches. */
function messagingPrompt(platform: string) {
  return `${INTRO} You chat with customers on ${platform}.

${RULES}
- This is ${platform}, not the website: write plain text only — no markdown at all (no **bold**, no # headings, no bullet symbols other than "-"). Keep it to a few short lines.
- When you recommend or describe specific properties, put each one's "url" from the tool result on its own line — every url becomes a photo card (photo, name, starting price, area) shown ABOVE your text. So don't list those names/prices/areas again: write a short comment (e.g. how many matched, what stands out) and a follow-up question. Include urls only for the properties you actually recommend (at most ${MAX_CARDS}).
- The customer never sees the urls themselves — they are replaced by the photo cards. So never mention a "link", never tell them to open, copy or paste anything, and never say "here is the link". If they ask for photos or pictures of a property, include its url again and it will be sent as a photo. If they ask for a link, explain that property photos are sent straight into this chat (a website link isn't available here), then offer more details or an agent — don't claim the photo can be tapped for more information.
- Photo cards are numbered 1, 2, 3… in the order of your urls, and each has "More details" and "Book a viewing" buttons. Your earlier replies record what the customer saw as "[Photo card N shown: name — price — area — url]"; to show one again, just write its url on its own line (never copy the bracket text).
- Customers often answer briefly or refer back: "yes", "ok", "5000", "the second one", "2", "this one", "I love this". Read every short reply against your own last message: a bare number after you asked about budget is the budget in USD; "2" or "the second" means photo card 2; "yes" answers the question you just asked. A message starting with "[Replying to photo card …]" or mentioning "(property id …)" is about exactly that property — call get_property with that id straight away and never ask which one they mean.
- Ask ONE simple question at a time — never "A, or B?" (a customer answering "yes" to that is ambiguous). If they clearly like a property but it's unclear which one, ask them to tap "More details" under its photo or reply with its number.
- Booking a viewing: if you already saved their details in this conversation, call submit_lead again with the same details plus that property's id and a message like "Viewing request" — it updates the same record — then confirm an agent will call to arrange it. Otherwise ask for their name and phone number first.
- To be contacted by an agent they can tap the "Share my phone number" button, or just type their name and phone number.
- If they want to talk to a person in this chat, or need something you can't do (price negotiation, legal/financial questions, complaints, anything the knowledge doesn't cover), call request_agent — then say a team member will reply here. Never say a person was notified unless you called it. Messages starting "[ERA staff member replied:]" were written by a colleague — stay consistent with what they said.`;
}

/** The per-customer part, sent after the cached instructions. */
function customerNote(platform: string, customer: MessagingCustomer) {
  const known = [
    customer.displayName ? `display name "${customer.displayName}"` : null,
    customer.username ? `username @${customer.username}` : null,
  ].filter(Boolean);
  return known.length
    ? `${platform} shows this customer's ${known.join(' and ')} — unverified, so use it only as a friendly greeting, and ask for their real name before saving their details if you're not sure.`
    : "You do not know the customer's name yet.";
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MessagingCustomer {
  displayName?: string;
  username?: string;
}

/** A property the reply recommends — chat apps show it as a photo card instead of a link. */
export interface PropertyCard {
  id: string;
  name: string;
  location: string;
  category: 'SALE' | 'RENT';
  startingPrice: number | null;
  /** First listing photo: an "/uploads/…" path or an absolute URL. null = no photo. */
  imageUrl: string | null;
  /** The property's page on the customer website. */
  url: string;
}

/** Photo cards per reply — more than this floods a phone screen. */
const MAX_CARDS = 5;

/** What the messaging module gets back — a projection, never a thrown tRPC error. */
export type MessagingReply =
  | {
      ok: true;
      /** What to send: plain text, with the property links taken out (they become `cards`). */
      reply: string;
      /** What to store as the conversation history — the raw reply, links included, so the next
       * turn still knows exactly which properties ("the second one") it showed. */
      transcript: string;
      cards: PropertyCard[];
      leadId: string | null;
      /** request_agent's reason when the AI asked for a person this turn. */
      wantsAgent: string | null;
    }
  | { ok: false; reason: 'not_configured' | 'rate_limited' | 'failed' };

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_properties',
    description: "Search ERA Cambodia's real, currently-listed properties — by what the visitor wants (category/type/location/budget/bedrooms/size) or by name. Returns up to 8 matches (listings with photos first) plus totalMatches, the full count. Each result's \"bedrooms\" lists the bedroom counts it has available (empty = not recorded — don't guess) and \"sizeSqm\" its size range.",
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['SALE', 'RENT'], description: 'Buy (SALE) or rent (RENT).' },
        propertyType: {
          type: 'string',
          enum: ['CONDO', 'HOUSE', 'VILLA', 'TOWNHOUSE', 'SHOPHOUSE', 'LAND', 'BOREY', 'COMMERCIAL'],
        },
        location: {
          type: 'string',
          description: 'One area or city, e.g. "BKK1", "Toul Kork" or "Siem Reap". Common alternative spellings (BKK1 / Boeng Keng Kang, Toul Kork / Tuol Kouk, …) are matched automatically.',
        },
        bedrooms: {
          type: 'integer',
          description: 'Exact number of bedrooms the visitor wants (0 = studio), e.g. "2-bedroom condo" → 2. Each result lists its available "bedrooms".',
        },
        minBedrooms: { type: 'integer', description: 'At least this many bedrooms, e.g. "3 bedrooms or more" → 3. Use instead of bedrooms, not with it.' },
        minAreaSqm: { type: 'number', description: 'Smallest acceptable unit size in square metres, e.g. "at least 80 sqm" → 80.' },
        minPrice: { type: 'number', description: 'Lowest starting price in USD (sale price, or monthly rent for RENT).' },
        maxPrice: {
          type: 'number',
          description: 'Highest starting price in USD — use it whenever the visitor gives a budget (e.g. "under $800/month" → 800).',
        },
        name: {
          type: 'string',
          description: 'Part of a property or project name, e.g. "UC88", "Time Square 9", "Le Conde". Use this whenever the visitor names a specific property; usually on its own, without the other filters.',
        },
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
    description: "Save the visitor's contact details to ERA's real sales CRM, once you have a name and at least a phone or email. Calling it again later in the same conversation UPDATES that same record (use this when the visitor corrects their phone/email/name) — it never creates a duplicate.",
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

/** Chat apps only: there's an Inbox where staff can take the conversation over. */
const REQUEST_AGENT_TOOL: Anthropic.Tool = {
  name: 'request_agent',
  description:
    'Flag this conversation for a real ERA staff member, who can take it over and reply in this same chat. Use it when the customer asks to talk to a person, or needs something you cannot do (negotiating, legal/financial questions, complaints, anything not covered by the knowledge). It does not save contact details — use submit_lead for that.',
  input_schema: {
    type: 'object',
    properties: { reason: { type: 'string', description: 'One short line for the staff member, e.g. "Wants to negotiate the price of Time Square 5".' } },
    required: ['reason'],
  },
};

/** In-process, per-IP sliding-window limiter — this is a single-instance deployment with no
 * Redis in the stack yet, and the endpoint is unauthenticated, so this is the pragmatic ceiling
 * against a runaway loop or a bot racking up real Anthropic API cost. Resets on process restart;
 * that's an acceptable tradeoff for a first version. */
const requestLog = new Map<string, number[]>();

interface ConversationState {
  /** The lead this conversation created (from the verified token, or created this turn). */
  leadId: string | null;
  /** Visitor-facing reason the latest submit_lead this turn was rejected; null once one succeeds. */
  rejectedBecause: string | null;
  /** The visitor's ad-link campaign code (`?utm_campaign=`), if they arrived from one. */
  campaignCode?: string;
  /** Channel key a new lead is recorded under — WEBSITE, or the chat app the message came from. */
  source: string;
  /** Chat apps: add a website `url` to every property a tool returns (see messagingPrompt). */
  linkProperties: boolean;
  /** Properties get_property was called for this turn — shown as a card even if the reply
   * forgot its url (seen live: a detailed answer about one property with no photo). */
  detailedIds: string[];
  /** Chat apps: request_agent is offered, and its reason lands here. */
  canRequestAgent: boolean;
  wantsAgent: string | null;
}

/** Lenient on purpose — only catch obvious typos before they reach a real CRM record. */
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const looksLikePhone = (s: string) => /^\+?[\d\s().-]{6,}$/.test(s.trim());

/** false = over the limit. Keyed by IP for the website, by chat for the messaging apps. */
function allowRequest(key: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  recent.push(now);
  requestLog.set(key, recent);
  return true;
}

export function createAssistantService(ctx: ModuleContext) {
  const client = ctx.config.anthropicApiKey ? new Anthropic({ apiKey: ctx.config.anthropicApiKey }) : null;
  const knowledge = createKnowledgeStore(ctx.db);

  /**
   * Instructions + ERA's company knowledge form one block marked for prompt caching (after the
   * tools, which never change): repeat turns and tool rounds re-read it at a fraction of the cost.
   * Anything that varies per visitor goes in a second, uncached block after it.
   */
  async function systemBlocks(fixed: string, perVisitor?: string): Promise<Anthropic.TextBlockParam[]> {
    return [
      { type: 'text', text: `${fixed}\n\n${await knowledge.promptSection()}`, cache_control: { type: 'ephemeral' } },
      ...(perVisitor ? [{ type: 'text' as const, text: perVisitor }] : []),
    ];
  }
  const siteBase = ctx.config.publicSiteUrl.replace(/\/$/, '');
  const propertyUrl = (id: string) => `${siteBase}/properties/${id}`;
  const escapedSiteBase = siteBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const propertyUrlPattern = () => new RegExp(escapedSiteBase + '/properties/([A-Za-z0-9_-]+)', 'g');

  /**
   * Property links in the reply → photo cards, in the order mentioned; the links leave the text.
   * A link repeated from an earlier turn (no tool call this turn) is looked up again — seen live:
   * otherwise its card silently vanished and the customer got "here is the link:" and nothing.
   * The lookup is published-only, so an id the model made up simply produces no card.
   */
  async function extractCards(
    text: string,
    properties: PublicProjectView[],
    detailedIds: string[],
  ): Promise<{ reply: string; cards: PropertyCard[]; transcript: string }> {
    const byId = new Map(properties.map((p) => [p.id, p]));
    let ids = [...new Set([...text.matchAll(propertyUrlPattern())].map((m) => m[1]!))];
    // Described one property in detail but forgot its url → still show its photo.
    if (ids.length === 0 && detailedIds.length === 1) ids = detailedIds;
    const found: PublicProjectView[] = [];
    for (const id of ids.slice(0, MAX_CARDS)) {
      const p = byId.get(id) ?? (await ctx.modules.inventory.getPublicProject(id));
      if (p) found.push(p);
    }
    const cards: PropertyCard[] = found.map((p) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        category: p.category,
        startingPrice: p.startingPrice,
        imageUrl: p.imageUrls[0] ?? null,
        url: propertyUrl(p.id),
      }));
    const reply = text
      .split('\n')
      // The model occasionally echoes the history's card notes — never send those.
      .filter((line) => !/^\s*\[Photo card \d+ shown:.*\]\s*$/.test(line))
      .map((line) => {
        if (!propertyUrlPattern().test(line)) return line;
        const rest = line.replace(propertyUrlPattern(), '').replace(/\(\s*\)/g, '');
        // A line that was only the link (maybe with "- " or "Link:") goes; otherwise keep the words.
        return /^[\s\-–—•:→]*(?:link|details|more info)?[\s:→]*$/i.test(rest) ? null : rest.replace(/[\s:→\-–—]+$/, '');
      })
      .filter((line): line is string => line !== null)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    // What gets stored as history: each link replaced by what the customer actually saw, so a later
    // "the second one" / "I love this" can be resolved to the right property.
    const cardNumber = new Map(cards.map((c, i) => [c.id, i + 1]));
    const transcript = text.replace(propertyUrlPattern(), (url, id: string) => {
      const n = cardNumber.get(id);
      const c = n ? cards[n - 1] : undefined;
      if (!c) return url;
      const price = c.startingPrice == null ? 'price on request' : `from $${c.startingPrice.toLocaleString('en-US')}${c.category === 'RENT' ? '/month' : ''}`;
      return `[Photo card ${n} shown: ${c.name} — ${price} — ${c.location} — ${url}]`;
    });
    return { reply, cards, transcript };
  }

  /* The server keeps no conversation state, so the browser holds a reference to the lead this
   * conversation created and sends it back each turn. It's HMAC-signed so a visitor can only ever
   * update the lead their own chat created — never guess or tamper their way into someone else's. */
  const tokenSecret = ctx.config.chatTokenSecret ?? randomBytes(32).toString('hex');
  if (!ctx.config.chatTokenSecret) {
    ctx.logger.warn('assistant.chat_token_secret_missing', {
      effect: 'chat lead references reset on restart — a correction after a restart creates a new lead',
    });
  }
  const signLead = (leadId: string) =>
    `${leadId}.${createHmac('sha256', tokenSecret).update(leadId).digest('base64url')}`;
  const verifyLeadToken = (token: string | undefined): string | null => {
    if (!token) return null;
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;
    const leadId = token.slice(0, dot);
    const given = Buffer.from(token.slice(dot + 1));
    const expected = Buffer.from(signLead(leadId).slice(dot + 1));
    return given.length === expected.length && timingSafeEqual(given, expected) ? leadId : null;
  };

  async function runTool(
    name: string,
    input: Record<string, unknown>,
    collected: Map<string, PublicProjectView>,
    conversation: ConversationState,
  ): Promise<unknown> {
    switch (name) {
      case 'search_properties': {
        const price = (v: unknown) => (typeof v === 'number' && v > 0 ? v : undefined);
        const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 50 ? v : undefined);
        const { total, results } = await ctx.modules.inventory.searchPublicProjects({
          category: input.category as PropertyCategory | undefined,
          propertyType: input.propertyType as PropertyType | undefined,
          location: input.location as string | undefined,
          name: input.name as string | undefined,
          minPrice: price(input.minPrice),
          maxPrice: price(input.maxPrice),
          bedrooms: count(input.bedrooms),
          minBedrooms: count(input.bedrooms) == null ? count(input.minBedrooms) : undefined,
          minAreaSqm: price(input.minAreaSqm),
        });
        for (const p of results) collected.set(p.id, p);
        return {
          totalMatches: total,
          showing: results.length,
          results: conversation.linkProperties ? results.map((p) => ({ ...p, url: propertyUrl(p.id) })) : results,
        };
      }
      case 'get_property': {
        const projectId = input.projectId as string;
        const project = await ctx.modules.inventory.getPublicProject(projectId);
        if (!project) return { error: 'Property not found.' };
        collected.set(project.id, project);
        conversation.detailedIds.push(project.id);
        const units = await ctx.modules.inventory.listPublicUnits(projectId);
        return { ...project, ...(conversation.linkProperties ? { url: propertyUrl(project.id) } : {}), units };
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
        const contact = {
          name: (input.name as string | undefined)?.trim() || undefined,
          phone: (input.phone as string | undefined)?.trim() || undefined,
          email: (input.email as string | undefined)?.trim() || undefined,
        };
        // Seen live: after a validation error the model still told the visitor "I've updated your
        // email". So the rejection spells out, in the result itself, that nothing changed.
        const rejected = (problem: string) => {
          conversation.rejectedBecause = problem;
          return {
            success: false,
            nothingWasSaved: true,
            error: `${problem} NOTHING was saved or changed — the visitor's previous details are still on file. Tell them it wasn't saved and ask them to re-type it.`,
          };
        };
        if (contact.email && !looksLikeEmail(contact.email)) return rejected(`"${contact.email}" is not a valid email address.`);
        if (contact.phone && !looksLikePhone(contact.phone)) return rejected(`"${contact.phone}" is not a valid phone number.`);

        // Already submitted in this conversation → correct that same record, never a duplicate.
        if (conversation.leadId) {
          const updated = await ctx.modules.crm.updateLeadContact(conversation.leadId, { ...contact, message, preferredProjectId });
          if (updated) {
            conversation.rejectedBecause = null;
            return { success: true, updatedExistingRecord: true, changed: updated.changed };
          }
          conversation.leadId = null; // lead was deleted in the back office — fall through and create a new one
        }

        if (!contact.name) return rejected('A name is required before saving.');
        const lead = await ctx.modules.crm.createLead({
          ...contact,
          source: conversation.source,
          name: contact.name,
          message,
          preferredProjectId,
          campaignCode: conversation.campaignCode,
        });
        conversation.leadId = lead.id;
        conversation.rejectedBecause = null;
        return { success: true, createdNewRecord: true };
      }
      case 'request_agent': {
        if (!conversation.canRequestAgent) return { error: 'Not available here.' };
        conversation.wantsAgent = String(input.reason ?? 'Customer asked for a person').slice(0, 300);
        return {
          success: true,
          note: 'The ERA team can now see this chat flagged in their Inbox; a staff member will reply here when available. Tell the customer that, without promising a specific time.',
        };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  /** The tool-use loop shared by the website chat and the chat apps. */
  async function converse(
    anthropic: Anthropic,
    system: Anthropic.TextBlockParam[],
    history: ChatMessage[],
    conversation: ConversationState,
  ): Promise<{ reply: string; properties: PublicProjectView[] }> {
    const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
    const collectedProperties = new Map<string, PublicProjectView>();
    // Hard guarantee, not a prompt rule: seen live, the model told a visitor "I've updated your
    // email" right after the server rejected it. If this turn's last save attempt was rejected,
    // the server writes the reply itself so the visitor is never told a bad value was saved.
    const finish = (reply: string) => ({
      reply: conversation.rejectedBecause
        ? `Sorry — I couldn't save that. ${conversation.rejectedBecause} Your previous details are still on file, so nothing has changed. Could you type it again?`
        : reply,
      properties: Array.from(collectedProperties.values()),
    });

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages,
        tools: conversation.canRequestAgent ? [...TOOLS, REQUEST_AGENT_TOOL] : TOOLS,
      });
      ctx.logger.info('assistant.usage', {
        source: conversation.source,
        input: response.usage.input_tokens,
        cacheRead: response.usage.cache_read_input_tokens ?? 0,
        cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
        output: response.usage.output_tokens,
      });

      if (response.stop_reason !== 'tool_use') {
        const reply = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        return finish(reply || "Sorry, I didn't quite catch that — could you rephrase?");
      }

      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const output = await runTool(block.name, block.input as Record<string, unknown>, collectedProperties, conversation);
        ctx.logger.info('assistant.tool', {
          tool: block.name,
          source: conversation.source,
          outcome: (output as { success?: boolean }).success === false ? 'rejected' : 'ok',
        });
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(output) });
      }
      messages.push({ role: 'user', content: toolResults });
    }

    return finish(
      "I'm having trouble finding what you need right now — could you tell me a bit more, or would you like to speak with a human agent?",
    );
  }

  return {
    /** ERA's company knowledge — edited on the admin's AI Knowledge page. */
    knowledge,

    /** The website chat (apps/client ChatPage.tsx) — the browser holds the history. */
    async chat(
      input: { messages: ChatMessage[]; propertyId?: string; propertyName?: string; leadToken?: string; campaignCode?: string },
      meta: { ip: string },
    ) {
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
      if (!allowRequest(`ip:${meta.ip}`)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Too many messages — please wait a moment and try again.' });
      }

      const system = await systemBlocks(
        WEBSITE_PROMPT,
        input.propertyId
          ? `The visitor arrived from the page for a specific property: id "${input.propertyId}"${input.propertyName ? ` ("${input.propertyName}")` : ''}. If this is the start of the conversation, call get_property with that id right away so your first reply is grounded in its real details.`
          : undefined,
      );

      const conversation: ConversationState = {
        leadId: verifyLeadToken(input.leadToken),
        rejectedBecause: null,
        campaignCode: input.campaignCode,
        source: 'WEBSITE',
        linkProperties: false,
        detailedIds: [],
        canRequestAgent: false,
        wantsAgent: null,
      };
      const { reply, properties } = await converse(client, system, input.messages, conversation);
      return { reply, properties, leadToken: conversation.leadId ? signLead(conversation.leadId) : undefined };
    },

    /**
     * A chat-app message (Telegram today). The messaging module keeps the history and the lead id
     * server-side and has already verified where the message came from, so `source` is trusted.
     * Never throws — failures come back as a reason the caller turns into a polite reply.
     */
    async replyToMessage(input: {
      /** Channel key, e.g. "TELEGRAM" — the new lead's source. */
      source: string;
      /** Shown to the model, e.g. "Telegram". */
      platform: string;
      /** Oldest first; must end with the customer's new message. */
      history: ChatMessage[];
      leadId: string | null;
      campaignCode?: string;
      customer: MessagingCustomer;
      /** Per-conversation rate-limit key. */
      rateKey: string;
    }): Promise<MessagingReply> {
      if (!client) return { ok: false, reason: 'not_configured' };
      if (!allowRequest(input.rateKey)) return { ok: false, reason: 'rate_limited' };
      // The API needs the conversation to open with a user turn; chat apps often start with our
      // own greeting. Consecutive same-role turns are fine — the API merges them.
      const history = input.history.slice(-MAX_MESSAGES);
      while (history.length && history[0]?.role !== 'user') history.shift();
      if (!history.length) return { ok: false, reason: 'failed' };

      const conversation: ConversationState = {
        leadId: input.leadId,
        rejectedBecause: null,
        campaignCode: input.campaignCode,
        source: input.source,
        linkProperties: true,
        detailedIds: [],
        canRequestAgent: true,
        wantsAgent: null,
      };
      try {
        const system = await systemBlocks(messagingPrompt(input.platform), customerNote(input.platform, input.customer));
        const { reply, properties } = await converse(client, system, history, conversation);
        const extracted = await extractCards(toPlainText(reply), properties, conversation.detailedIds);
        return { ok: true, ...extracted, leadId: conversation.leadId, wantsAgent: conversation.wantsAgent };
      } catch (err) {
        ctx.logger.error('assistant.reply_failed', {
          source: input.source,
          error: err instanceof Error ? err.message : String(err),
        });
        return { ok: false, reason: 'failed' };
      }
    },
  };
}

export type AssistantService = ReturnType<typeof createAssistantService>;
