import { TRPCError } from '@trpc/server';
import type { Db } from '../../platform/db.js';

/**
 * Company knowledge the assistant is given on every chat (assistant.prisma). All active entries
 * go straight into its instructions — no retrieval step that could miss the right one — so the
 * total is capped: ~40k characters is roughly 10k tokens, a few cents per chat turn at most, and
 * the block is prompt-cached across turns anyway.
 */
export const MAX_KNOWLEDGE_CHARS = 40_000;

export interface KnowledgeInput {
  title: string;
  content: string;
  active?: boolean;
}

const size = (e: { title: string; content: string }) => e.title.length + e.content.length;

export function createKnowledgeStore(db: Db) {
  /** Refuses a save that would push the active entries over the cap. */
  async function assertFits(editingId: string | null, next: { title: string; content: string; active: boolean }) {
    if (!next.active) return;
    const others = await db.assistantKnowledge.findMany({
      where: { active: true, ...(editingId ? { id: { not: editingId } } : {}) },
      select: { title: true, content: true },
    });
    const total = others.reduce((n, e) => n + size(e), 0) + size(next);
    if (total > MAX_KNOWLEDGE_CHARS) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `The AI's knowledge is full (${total.toLocaleString('en-US')} of ${MAX_KNOWLEDGE_CHARS.toLocaleString('en-US')} characters). Shorten this answer, or hide or shorten another entry first.`,
      });
    }
  }

  return {
    async list() {
      const entries = await db.assistantKnowledge.findMany({ orderBy: { createdAt: 'asc' } });
      return {
        entries,
        usedChars: entries.filter((e) => e.active).reduce((n, e) => n + size(e), 0),
        maxChars: MAX_KNOWLEDGE_CHARS,
      };
    },

    async create(input: KnowledgeInput, userId: string) {
      const active = input.active ?? true;
      await assertFits(null, { ...input, active });
      return db.assistantKnowledge.create({ data: { ...input, active, updatedById: userId } });
    },

    async update(id: string, input: Partial<KnowledgeInput>, userId: string) {
      const current = await db.assistantKnowledge.findUniqueOrThrow({ where: { id } });
      await assertFits(id, {
        title: input.title ?? current.title,
        content: input.content ?? current.content,
        active: input.active ?? current.active,
      });
      return db.assistantKnowledge.update({ where: { id }, data: { ...input, updatedById: userId } });
    },

    async remove(id: string) {
      await db.assistantKnowledge.delete({ where: { id } });
      return { id };
    },

    /** The block added to the assistant's instructions. */
    async promptSection(): Promise<string> {
      const entries = await db.assistantKnowledge.findMany({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
        select: { title: true, content: true },
      });
      if (entries.length === 0) {
        return 'ERA company knowledge: none has been written yet. For questions about ERA itself — its services, office, fees, buying or renting process, policies — say an agent will follow up with the details, and offer to take their name and phone number.';
      }
      return `ERA company knowledge — written and kept up to date by ERA staff:

${entries.map((e) => `### ${e.title.trim()}\n${e.content.trim()}`).join('\n\n')}

How to use it: answer questions about ERA itself (services, office, contact, fees, buying or renting process, policies) from the knowledge above. You may pass on what it says even on ownership, legal or tax topics — it is ERA's own published guidance — but never add to it from general knowledge. If the question isn't covered, say an agent will follow up with the details and offer to take their name and phone number.`;
    },
  };
}

export type KnowledgeStore = ReturnType<typeof createKnowledgeStore>;
