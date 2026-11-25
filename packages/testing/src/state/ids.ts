import { randomBytes } from 'node:crypto';

/** Mongo-like ObjectId: 24 lowercase hex chars (timestamp + random). */
export function generateId(): string {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  return ts + randomBytes(8).toString('hex');
}

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{24}$/.test(value);
}
