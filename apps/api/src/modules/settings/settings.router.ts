import { z } from 'zod';
import { router, withCapability } from '../../trpc/trpc.js';
import type { SettingsService } from './settings.service.js';

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
  });
}
