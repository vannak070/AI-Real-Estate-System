import { z } from 'zod';
import { router, withCapability, publicProcedure } from '../../trpc/trpc.js';
import type { SettingsService } from './settings.service.js';

const imageDataUrl = z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, 'invalid_image_data_url');

export function settingsRouter(service: SettingsService) {
  return router({
    company: router({
      get: withCapability('settings:write').query(() => service.getCompany()),

      update: withCapability('settings:write')
        .input(
          z.object({
            name: z.string().min(1).optional(),
            legalName: z.string().nullable().optional(),
            address: z.string().nullable().optional(),
            phone: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
            taxId: z.string().nullable().optional(),
            currency: z.string().optional(),
            timezone: z.string().optional(),
            locale: z.string().optional(),
          }),
        )
        .mutation(({ input }) => service.updateCompany(input)),
    }),

    taxRates: router({
      list: withCapability('settings:write').query(() => service.listTaxRates()),
    }),

    sequences: router({
      list: withCapability('settings:write').query(() => service.listSequences()),
    }),

    about: router({
      content: router({
        get: withCapability('settings:write').query(() => service.getAboutContent()),
        update: withCapability('settings:write')
          .input(
            z.object({
              pageTitle: z.string().min(1).optional(),
              subtitle: z.string().nullable().optional(),
              paragraph1: z.string().nullable().optional(),
              paragraph2: z.string().nullable().optional(),
              mission: z.string().nullable().optional(),
              values: z.array(z.string()).optional(),
              statProjects: z.string().nullable().optional(),
              statLeads: z.string().nullable().optional(),
              statAccuracy: z.string().nullable().optional(),
              statTeamSize: z.string().nullable().optional(),
            }),
          )
          .mutation(({ input }) => service.updateAboutContent(input)),
      }),

      milestones: router({
        list: withCapability('settings:write').query(() => service.listMilestones()),
        create: withCapability('settings:write')
          .input(z.object({ year: z.string().min(1), title: z.string().min(1), description: z.string().min(1), order: z.number().int().optional() }))
          .mutation(({ input }) => service.createMilestone(input)),
        update: withCapability('settings:write')
          .input(
            z.object({
              id: z.string(),
              year: z.string().min(1).optional(),
              title: z.string().min(1).optional(),
              description: z.string().min(1).optional(),
              order: z.number().int().optional(),
            }),
          )
          .mutation(({ input: { id, ...data } }) => service.updateMilestone(id, data)),
        delete: withCapability('settings:write')
          .input(z.object({ id: z.string() }))
          .mutation(({ input }) => service.deleteMilestone(input.id)),
      }),

      team: router({
        list: withCapability('settings:write').query(() => service.listTeamMembers()),
        create: withCapability('settings:write')
          .input(
            z.object({
              name: z.string().min(1),
              position: z.string().min(1),
              bio: z.string().optional(),
              isLeader: z.boolean().optional(),
              order: z.number().int().optional(),
            }),
          )
          .mutation(({ input }) => service.createTeamMember(input)),
        update: withCapability('settings:write')
          .input(
            z.object({
              id: z.string(),
              name: z.string().min(1).optional(),
              position: z.string().min(1).optional(),
              bio: z.string().nullable().optional(),
              isLeader: z.boolean().optional(),
              order: z.number().int().optional(),
            }),
          )
          .mutation(({ input: { id, ...data } }) => service.updateTeamMember(id, data)),
        delete: withCapability('settings:write')
          .input(z.object({ id: z.string() }))
          .mutation(({ input }) => service.deleteTeamMember(input.id)),
        setPhoto: withCapability('settings:write')
          .input(z.object({ id: z.string(), dataUrl: imageDataUrl }))
          .mutation(({ input }) => service.setTeamMemberPhoto(input.id, input.dataUrl)),
        removePhoto: withCapability('settings:write')
          .input(z.object({ id: z.string() }))
          .mutation(({ input }) => service.removeTeamMemberPhoto(input.id)),
      }),

      awards: router({
        list: withCapability('settings:write').query(() => service.listAwards()),
        create: withCapability('settings:write')
          .input(
            z.object({
              year: z.string().min(1),
              title: z.string().min(1),
              organization: z.string().min(1),
              description: z.string().optional(),
              order: z.number().int().optional(),
            }),
          )
          .mutation(({ input }) => service.createAward(input)),
        update: withCapability('settings:write')
          .input(
            z.object({
              id: z.string(),
              year: z.string().min(1).optional(),
              title: z.string().min(1).optional(),
              organization: z.string().min(1).optional(),
              description: z.string().nullable().optional(),
              order: z.number().int().optional(),
            }),
          )
          .mutation(({ input: { id, ...data } }) => service.updateAward(id, data)),
        delete: withCapability('settings:write')
          .input(z.object({ id: z.string() }))
          .mutation(({ input }) => service.deleteAward(input.id)),
      }),
    }),

    // No withCapability — apps/client is unauthenticated. One combined read for the whole
    // public About page; content itself carries no sensitivity (it's marketing copy meant
    // to be shown to anyone), unlike inventory/crm's public routers which project a safe subset.
    public: router({
      about: publicProcedure.query(() => service.getPublicAbout()),
    }),
  });
}
