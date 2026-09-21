import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Capability } from '@era/contracts';
import type { Db } from '../../platform/db.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const SESSION_COOKIE = 'era_sid';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: { id: string; key: string; name: string };
  capabilities: Capability[];
}

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

/**
 * A one-time temporary credential for a newly-created or reset account —
 * never chosen by an admin, so it can't be weak or reused. Base64url keeps it
 * readable/copy-pasteable (no quoting issues) with no ambiguous characters.
 * The user is expected to sign in once and change it (self-service password
 * change isn't built yet — see CLAUDE.md).
 */
export function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url'); // 12 chars, ~72 bits of entropy
}

/** The session id IS the cookie token — one round trip to validate, one to revoke. */
export async function createSession(db: Db, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { id: token, userId, expiresAt } });
  return { token, expiresAt };
}

export async function destroySession(db: Db, token: string): Promise<void> {
  await db.session.deleteMany({ where: { id: token } });
}

export async function getSessionUser(db: Db, token: string): Promise<AuthUser | null> {
  const session = await db.session.findUnique({
    where: { id: token },
    include: { user: { include: { role: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now() || !session.user.active) return null;
  const u = session.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: { id: u.role.id, key: u.role.key, name: u.role.name },
    capabilities: u.role.capabilities as Capability[],
  };
}
