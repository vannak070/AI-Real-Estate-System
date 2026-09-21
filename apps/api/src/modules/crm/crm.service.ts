import { CrmEvents } from '@era/contracts';
import type { ActivityType, ContactType, LeadSource, LeadStage, Temperature } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';

export function createCrmService({ db, bus, modules }: ModuleContext) {
  /**
   * Auto-assignment: whichever active agent currently holds the fewest open
   * (not WON/LOST) leads gets the next one. Self-balancing with no persisted
   * rotation pointer — resilient to agents being added/removed at any time.
   */
  async function pickLeastLoadedAgent(): Promise<string | null> {
    const agents = await modules.identity.listAgents();
    if (agents.length === 0) return null;

    const counts = await db.lead.groupBy({
      by: ['ownerId'],
      where: { ownerId: { in: agents.map((a) => a.id) }, stage: { notIn: ['WON', 'LOST'] } },
      _count: { _all: true },
    });
    const openCountByAgent = new Map(counts.map((c) => [c.ownerId, c._count._all]));

    return agents.reduce((best, a) =>
      (openCountByAgent.get(a.id) ?? 0) < (openCountByAgent.get(best.id) ?? 0) ? a : best,
    ).id;
  }

  return {
    /* ── Contacts ── */

    listContacts(filter?: { type?: ContactType; ownerId?: string; q?: string }) {
      return db.contact.findMany({
        where: {
          type: filter?.type,
          ownerId: filter?.ownerId,
          ...(filter?.q
            ? {
                OR: [
                  { name: { contains: filter.q, mode: 'insensitive' } },
                  { email: { contains: filter.q, mode: 'insensitive' } },
                  { phone: { contains: filter.q } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    getContact(id: string) {
      return db.contact.findUnique({
        where: { id },
        include: { leads: true },
      });
    },

    createContact(input: {
      name: string;
      type?: ContactType;
      email?: string;
      phone?: string;
      nationality?: string;
      company?: string;
      source: LeadSource;
      consentMarketing?: boolean;
      ownerId?: string;
      tags?: string[];
    }) {
      return db.contact.create({ data: input });
    },

    /** Pre-flight check before creating a contact/lead — same email or phone already on file. */
    async findDuplicateContact(input: { email?: string; phone?: string }) {
      const or = [
        input.email ? { email: { equals: input.email, mode: 'insensitive' as const } } : null,
        input.phone ? { phone: input.phone } : null,
      ].filter((c): c is NonNullable<typeof c> => c !== null);
      if (or.length === 0) return null;
      return db.contact.findFirst({ where: { OR: or }, orderBy: { createdAt: 'desc' } });
    },

    updateContact(
      id: string,
      input: Partial<{
        name: string;
        type: ContactType;
        email: string | null;
        phone: string | null;
        nationality: string | null;
        company: string | null;
        consentMarketing: boolean;
        ownerId: string | null;
        tags: string[];
      }>,
    ) {
      return db.contact.update({ where: { id }, data: input });
    },

    verifyKyc(id: string) {
      return db.contact.update({ where: { id }, data: { kycStatus: 'VERIFIED' } });
    },

    /* ── Leads ── */

    listLeads(ownerId?: string) {
      return db.lead.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, include: { contact: true } });
    },

    getLead(id: string) {
      return db.lead.findUnique({
        where: { id },
        include: { contact: true, activities: { orderBy: { createdAt: 'desc' } } },
      });
    },

    async createLead(input: {
      contact: { name: string; email?: string; phone?: string };
      source: LeadSource;
      ownerId?: string;
    }) {
      // No owner named explicitly (e.g. a manager adding an inbound lead with
      // nobody claimed yet) -> hand it to whoever has the lightest open pipeline.
      const ownerId = input.ownerId ?? (await pickLeastLoadedAgent());

      const lead = await db.lead.create({
        data: {
          source: input.source,
          ownerId,
          contact: {
            create: {
              name: input.contact.name,
              email: input.contact.email,
              phone: input.contact.phone,
              source: input.source,
              // Same owner as the lead — otherwise this contact is invisible
              // to that agent's own "My contacts" scope the moment it's created.
              ownerId,
            },
          },
        },
      });

      await bus.publish(CrmEvents.LeadCreated.type, {
        leadId: lead.id,
        source: input.source,
        assignedTo: lead.ownerId,
      });
      return lead;
    },

    async changeStage(leadId: string, to: LeadStage) {
      const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
      if (lead.stage === to) return lead;

      const updated = await db.lead.update({ where: { id: leadId }, data: { stage: to } });
      await db.activity.create({
        data: { leadId, type: 'STATUS_CHANGE', subject: `${lead.stage} -> ${to}` },
      });
      await bus.publish(CrmEvents.LeadStatusChanged.type, { leadId, from: lead.stage, to });
      return updated;
    },

    updateLead(
      id: string,
      input: Partial<{
        temperature: Temperature;
        score: number;
        budgetMin: number | null;
        budgetMax: number | null;
        preferredProjectId: string | null;
        unitTypeWanted: string | null;
        timeline: string | null;
        ownerId: string | null;
        lostReason: string | null;
      }>,
    ) {
      return db.lead.update({ where: { id }, data: input });
    },

    /* ── Activities ── */

    listActivities(filter: { leadId?: string; contactId?: string }) {
      return db.activity.findMany({
        where: { leadId: filter.leadId, contactId: filter.contactId },
        orderBy: { createdAt: 'desc' },
        include: { lead: { include: { contact: true } } },
      });
    },

    createActivity(input: {
      type: ActivityType;
      subject: string;
      leadId?: string;
      contactId?: string;
      contractId?: string;
      ownerId?: string;
      dueAt?: Date;
    }) {
      return db.activity.create({ data: input });
    },

    async toggleActivityDone(id: string) {
      const a = await db.activity.findUniqueOrThrow({ where: { id } });
      return db.activity.update({ where: { id }, data: { done: !a.done } });
    },

    /** Overdue + upcoming open tasks for one agent — the "what should I do next" surface. */
    listMyWork(ownerId: string) {
      return db.activity.findMany({
        where: { ownerId, type: 'TASK', done: false },
        orderBy: { dueAt: 'asc' },
        include: { lead: { include: { contact: true } } },
      });
    },
  };
}

export type CrmService = ReturnType<typeof createCrmService>;
