import { insert, select } from '../db/client.js';
import { recordLoginForAudit } from './audit.js';
import { randomUUID } from 'node:crypto';

const SESSION_TTL_MS = 60 * 60 * 1000;

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: number;
  token: string;
}

export type LoginResult =
  | { ok: true; session: Session }
  | { ok: false; reason: string };

export function createUser(email: string, passwordHash: string): User {
  const id = randomUUID();
  return insert<User>('users', { id, email, passwordHash });
}

export function login(email: string, passwordHash: string): LoginResult {
  const users = select<User>(
    'users',
    (u) => u.email === email && u.passwordHash === passwordHash
  );
  if (users.length === 0) {
    return { ok: false, reason: 'invalid_credentials' };
  }
  const user = users[0];
  const token = randomUUID();
  const session = insert<Session>('sessions', {
    id: randomUUID(),
    userId: user.id,
    expiresAt: Date.now() + SESSION_TTL_MS,
    token,
  });

  // Compliance: every login is mirrored to the audit table.
  recordLoginForAudit(user.id, token);

  return { ok: true, session };
}

export function findSessionByToken(token: string): Session | null {
  const matches = select<Session>('sessions', (s) => s.token === token);
  return matches[0] ?? null;
}
