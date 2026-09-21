import { TRPCError } from '@trpc/server';
import type { Capability } from '@era/contracts';
import type { ModuleContext } from '../../platform/module.js';
import { generateTemporaryPassword, hashPassword } from './auth.service.js';
import { deleteImage, saveImage } from '../../platform/uploads.js';

/**
 * Every db.user query in this service uses this instead of `include: { role: true }` —
 * their results go straight back to the tRPC client (identity.router.ts has no projection
 * of its own), so passwordHash must never be among the selected columns. (This installed
 * Prisma client doesn't generate the newer `omit` API's types, so an explicit `select`
 * listing every column except passwordHash is the safe equivalent.) auth.router.ts's login
 * check and this module's own index.ts read passwordHash directly where they actually need
 * it and are unaffected by this constant.
 */
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  nameKhmer: true,
  licenseNumber: true,
  photoUrl: true,
  phone: true,
  roleId: true,
  role: true,
  teamId: true,
  avatarColor: true,
  target: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function createIdentityService({ db }: ModuleContext) {
  return {
    listUsers(filter?: { roleId?: string; teamId?: string; active?: boolean }) {
      return db.user.findMany({
        where: { roleId: filter?.roleId, teamId: filter?.teamId, active: filter?.active },
        orderBy: { name: 'asc' },
        select: USER_SELECT,
      });
    },

    getUser(id: string) {
      return db.user.findUnique({ where: { id }, select: USER_SELECT });
    },

    /**
     * The password is never chosen by the caller — a random temporary one is
     * generated here and returned in plaintext exactly once (the response),
     * alongside the created user. Only its hash is ever persisted.
     */
    async createUser(input: {
      email: string;
      name: string;
      roleId: string;
      phone?: string;
      teamId?: string;
      avatarColor?: string;
      target?: number;
      nameKhmer?: string;
      licenseNumber?: string;
    }) {
      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(temporaryPassword);
      const user = await db.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          roleId: input.roleId,
          phone: input.phone,
          teamId: input.teamId,
          avatarColor: input.avatarColor,
          target: input.target,
          nameKhmer: input.nameKhmer,
          licenseNumber: input.licenseNumber,
        },
        select: USER_SELECT,
      });
      return { user, temporaryPassword };
    },

    /**
     * Issues a fresh random credential for an existing account (lost/forgotten
     * password, or an admin rotating it) and signs the user out everywhere —
     * the old password and every existing session stop working immediately.
     */
    async resetPassword(id: string) {
      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(temporaryPassword);
      await db.$transaction([
        db.user.update({ where: { id }, data: { passwordHash } }),
        db.session.deleteMany({ where: { userId: id } }),
      ]);
      return { temporaryPassword };
    },

    updateUser(
      id: string,
      input: Partial<{
        name: string;
        phone: string | null;
        roleId: string;
        teamId: string | null;
        avatarColor: string | null;
        target: number | null;
        active: boolean;
        nameKhmer: string | null;
        licenseNumber: string | null;
      }>,
    ) {
      return db.user.update({ where: { id }, data: input, select: USER_SELECT });
    },

    /** Single-slot headshot for customer-facing documents — reuses the same upload pipeline as project/unit-type photos. */
    async setUserPhoto(id: string, dataUrl: string) {
      const user = await db.user.findUniqueOrThrow({ where: { id } });
      if (user.photoUrl) await deleteImage(user.photoUrl);
      const { url } = await saveImage(`users/${id}`, dataUrl);
      return db.user.update({ where: { id }, data: { photoUrl: url }, select: USER_SELECT });
    },

    async removeUserPhoto(id: string) {
      const user = await db.user.findUniqueOrThrow({ where: { id } });
      if (user.photoUrl) await deleteImage(user.photoUrl);
      return db.user.update({ where: { id }, data: { photoUrl: null }, select: USER_SELECT });
    },

    /**
     * Hard delete — for cleaning up a mistakenly-created account, not for
     * offboarding someone with history. `Contact.ownerId`, `Lead.ownerId`,
     * `Reservation.agentId`, etc. are plain id columns (no FK, per the
     * no-cross-module-FK rule), so deleting a user with real activity leaves
     * those pointing at an id `userLabel()` can no longer resolve — prefer
     * `updateUser(id, { active: false })` once a user has done real work.
     */
    async deleteUser(id: string, requesterId: string) {
      if (id === requesterId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot delete your own account' });
      }
      const target = await db.user.findUniqueOrThrow({ where: { id }, include: { role: true } });
      if (target.role.capabilities.includes('settings:write')) {
        const otherAdmins = await db.user.count({
          where: { id: { not: id }, active: true, role: { capabilities: { has: 'settings:write' } } },
        });
        if (otherAdmins === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'At least one other active admin must exist first' });
        }
      }
      await db.session.deleteMany({ where: { userId: id } });
      await db.user.delete({ where: { id } });
      return { ok: true };
    },

    listTeams() {
      return db.team.findMany({ orderBy: { name: 'asc' } });
    },

    createTeam(input: { name: string; branch: string; managerId: string }) {
      return db.team.create({ data: input });
    },

    updateTeam(id: string, input: Partial<{ name: string; branch: string; managerId: string }>) {
      return db.team.update({ where: { id }, data: input });
    },

    /* ── Roles (RBAC) ── */

    listRoles() {
      return db.role.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { users: true } } } });
    },

    getRole(id: string) {
      return db.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    },

    createRole(input: { key: string; name: string; description?: string; capabilities: Capability[] }) {
      return db.role.create({ data: { ...input, isSystem: false } });
    },

    updateRole(id: string, input: Partial<{ name: string; description: string | null; capabilities: Capability[] }>) {
      return db.role.update({ where: { id }, data: input });
    },

    async deleteRole(id: string) {
      const role = await db.role.findUniqueOrThrow({ where: { id }, include: { _count: { select: { users: true } } } });
      if (role.isSystem) throw new TRPCError({ code: 'BAD_REQUEST', message: 'System roles cannot be deleted' });
      if (role._count.users > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `${role._count.users} user(s) still hold this role` });
      }
      await db.role.delete({ where: { id } });
      return { ok: true };
    },
  };
}

export type IdentityService = ReturnType<typeof createIdentityService>;
