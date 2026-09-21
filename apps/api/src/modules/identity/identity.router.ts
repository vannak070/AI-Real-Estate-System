import { z } from 'zod';
import { ALL_CAPABILITIES, type Capability } from '@era/contracts';
import { router, protectedProcedure, withCapability } from '../../trpc/trpc.js';
import type { IdentityService } from './identity.service.js';

const capability = z.enum(ALL_CAPABILITIES as [Capability, ...Capability[]]);
const imageDataUrl = z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, 'invalid_image_data_url');

// User/team/role administration is ADMIN-only (settings:write) — everyone
// signed in can still browse the directory (list/get) to assign owners,
// teams, and roles.
export function identityRouter(service: IdentityService) {
  return router({
    users: router({
      list: protectedProcedure
        .input(
          z
            .object({
              roleId: z.string().optional(),
              teamId: z.string().optional(),
              active: z.boolean().optional(),
            })
            .optional(),
        )
        .query(({ input }) => service.listUsers(input)),

      get: protectedProcedure.input(z.object({ id: z.string() })).query(({ input }) => service.getUser(input.id)),

      create: withCapability('settings:write')
        .input(
          z.object({
            email: z.string().email(),
            name: z.string().min(1),
            roleId: z.string(),
            phone: z.string().optional(),
            teamId: z.string().optional(),
            avatarColor: z.string().optional(),
            target: z.number().int().nonnegative().optional(),
            nameKhmer: z.string().optional(),
            licenseNumber: z.string().optional(),
          }),
        )
        .mutation(({ input }) => service.createUser(input)),

      update: withCapability('settings:write')
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            phone: z.string().nullable().optional(),
            roleId: z.string().optional(),
            teamId: z.string().nullable().optional(),
            avatarColor: z.string().nullable().optional(),
            target: z.number().int().nonnegative().nullable().optional(),
            active: z.boolean().optional(),
            nameKhmer: z.string().nullable().optional(),
            licenseNumber: z.string().nullable().optional(),
          }),
        )
        .mutation(({ input: { id, ...data } }) => service.updateUser(id, data)),

      delete: withCapability('settings:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input, ctx }) => service.deleteUser(input.id, ctx.user.id)),

      resetPassword: withCapability('settings:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.resetPassword(input.id)),

      setPhoto: withCapability('settings:write')
        .input(z.object({ id: z.string(), dataUrl: imageDataUrl }))
        .mutation(({ input }) => service.setUserPhoto(input.id, input.dataUrl)),

      removePhoto: withCapability('settings:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.removeUserPhoto(input.id)),
    }),

    teams: router({
      list: protectedProcedure.query(() => service.listTeams()),

      create: withCapability('settings:write')
        .input(z.object({ name: z.string().min(1), branch: z.string().min(1), managerId: z.string() }))
        .mutation(({ input }) => service.createTeam(input)),

      update: withCapability('settings:write')
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            branch: z.string().min(1).optional(),
            managerId: z.string().optional(),
          }),
        )
        .mutation(({ input: { id, ...data } }) => service.updateTeam(id, data)),
    }),

    roles: router({
      list: protectedProcedure.query(() => service.listRoles()),

      get: protectedProcedure.input(z.object({ id: z.string() })).query(({ input }) => service.getRole(input.id)),

      create: withCapability('settings:write')
        .input(
          z.object({
            key: z
              .string()
              .min(2)
              .max(40)
              .regex(/^[A-Z][A-Z0-9_]*$/, 'Use SCREAMING_SNAKE_CASE, e.g. REGIONAL_MANAGER'),
            name: z.string().min(1),
            description: z.string().optional(),
            capabilities: z.array(capability),
          }),
        )
        .mutation(({ input }) => service.createRole(input)),

      update: withCapability('settings:write')
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            description: z.string().nullable().optional(),
            capabilities: z.array(capability).optional(),
          }),
        )
        .mutation(({ input: { id, ...data } }) => service.updateRole(id, data)),

      delete: withCapability('settings:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.deleteRole(input.id)),
    }),
  });
}
