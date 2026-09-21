import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { can } from '@era/contracts';
import { ActivityType, ContactType, LeadSource, LeadStage, Temperature } from '@prisma/client';
import { router, withCapability, publicProcedure } from '../../trpc/trpc.js';
import { scopedOwnerId } from '../../trpc/scoping.js';
import type { CrmService } from './crm.service.js';

export function crmRouter(service: CrmService) {
  return router({
    contacts: router({
      list: withCapability('crm:read')
        .input(
          z
            .object({
              type: z.nativeEnum(ContactType).optional(),
              ownerId: z.string().optional(),
              q: z.string().optional(),
            })
            .optional(),
        )
        .query(({ input, ctx }) =>
          service.listContacts({ ...input, ownerId: scopedOwnerId(ctx.user, 'crm:read:all', input?.ownerId) }),
        ),

      get: withCapability('crm:read')
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
          const contact = await service.getContact(input.id);
          if (contact && !can(ctx.user.capabilities, 'crm:read:all') && contact.ownerId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This contact belongs to another agent' });
          }
          return contact;
        }),

      findDuplicate: withCapability('crm:read')
        .input(z.object({ email: z.string().optional(), phone: z.string().optional() }))
        .query(({ input }) => service.findDuplicateContact(input)),

      create: withCapability('crm:write')
        .input(
          z.object({
            name: z.string().min(1),
            type: z.nativeEnum(ContactType).optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            nationality: z.string().optional(),
            company: z.string().optional(),
            source: z.nativeEnum(LeadSource),
            consentMarketing: z.boolean().optional(),
            ownerId: z.string().optional(),
            tags: z.array(z.string()).optional(),
          }),
        )
        .mutation(({ input, ctx }) =>
          service.createContact({ ...input, ownerId: scopedOwnerId(ctx.user, 'crm:read:all', input.ownerId) }),
        ),

      update: withCapability('crm:write')
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            type: z.nativeEnum(ContactType).optional(),
            email: z.string().email().nullable().optional(),
            phone: z.string().nullable().optional(),
            nationality: z.string().nullable().optional(),
            company: z.string().nullable().optional(),
            consentMarketing: z.boolean().optional(),
            ownerId: z.string().nullable().optional(),
            tags: z.array(z.string()).optional(),
          }),
        )
        .mutation(({ input: { id, ...data } }) => service.updateContact(id, data)),

      verifyKyc: withCapability('crm:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.verifyKyc(input.id)),
    }),

    leads: router({
      list: withCapability('crm:read')
        .input(z.object({ ownerId: z.string().optional() }).optional())
        .query(({ input, ctx }) => service.listLeads(scopedOwnerId(ctx.user, 'crm:read:all', input?.ownerId))),

      get: withCapability('crm:read')
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
          const lead = await service.getLead(input.id);
          if (lead && !can(ctx.user.capabilities, 'crm:read:all') && lead.ownerId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This lead belongs to another agent' });
          }
          return lead;
        }),

      create: withCapability('crm:write')
        .input(
          z.object({
            name: z.string().min(1),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            source: z.nativeEnum(LeadSource),
            ownerId: z.string().optional(),
          }),
        )
        .mutation(({ input, ctx }) =>
          service.createLead({
            contact: { name: input.name, email: input.email, phone: input.phone },
            source: input.source,
            ownerId: scopedOwnerId(ctx.user, 'crm:read:all', input.ownerId),
          }),
        ),

      changeStage: withCapability('crm:write')
        .input(z.object({ id: z.string(), to: z.nativeEnum(LeadStage) }))
        .mutation(({ input }) => service.changeStage(input.id, input.to)),

      update: withCapability('crm:write')
        .input(
          z.object({
            id: z.string(),
            temperature: z.nativeEnum(Temperature).optional(),
            score: z.number().int().min(0).max(100).optional(),
            budgetMin: z.number().int().nonnegative().nullable().optional(),
            budgetMax: z.number().int().nonnegative().nullable().optional(),
            preferredProjectId: z.string().nullable().optional(),
            unitTypeWanted: z.string().nullable().optional(),
            timeline: z.string().nullable().optional(),
            ownerId: z.string().nullable().optional(),
            lostReason: z.string().nullable().optional(),
          }),
        )
        .mutation(({ input: { id, ...data } }) => service.updateLead(id, data)),
    }),

    // No withCapability — apps/client is unauthenticated. The one and only way anything on the
    // public site writes to the database: creates a real Contact+Lead via the same createLead
    // used internally, source hardcoded to WEBSITE (never trust the caller's own claim of source).
    public: router({
      submitLead: publicProcedure
        .input(
          z.object({
            name: z.string().min(1),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            message: z.string().optional(),
            preferredProjectId: z.string().optional(),
          }),
        )
        .mutation(({ input }) =>
          service.createLead({
            contact: { name: input.name, email: input.email, phone: input.phone },
            source: 'WEBSITE',
            preferredProjectId: input.preferredProjectId,
            message: input.message,
          }),
        ),
    }),

    activities: router({
      list: withCapability('crm:read')
        .input(z.object({ leadId: z.string().optional(), contactId: z.string().optional() }))
        .query(({ input }) => service.listActivities(input)),

      /** The caller's own overdue + open tasks — always self-scoped, regardless of crm:read:all. */
      myWork: withCapability('crm:read').query(({ ctx }) => service.listMyWork(ctx.user.id)),

      create: withCapability('crm:write')
        .input(
          z.object({
            type: z.nativeEnum(ActivityType),
            subject: z.string().min(1),
            leadId: z.string().optional(),
            contactId: z.string().optional(),
            contractId: z.string().optional(),
            ownerId: z.string().optional(),
            dueAt: z.coerce.date().optional(),
          }),
        )
        .mutation(({ input }) => service.createActivity(input)),

      toggleDone: withCapability('crm:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.toggleActivityDone(input.id)),
    }),
  });
}
