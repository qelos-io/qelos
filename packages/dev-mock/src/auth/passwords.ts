import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// deliberately cheap cost: this is a local dev mock, not a credential store
const SCRYPT_OPTIONS = { N: 1024, r: 8, p: 1 };

export function hashPassword(password: string): string {
  const salt = randomBytes(8).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 32, SCRYPT_OPTIONS).toString('hex')}`;
}

/** Accounts without a stored hash (seeded personas without password) accept any non-empty password. */
export function verifyPassword(password: string, stored?: string): boolean {
  if (!stored) return !!password;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length, SCRYPT_OPTIONS);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
