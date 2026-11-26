import { createHash, randomBytes } from 'node:crypto';
import type { Doc, MockState } from '../state/mock-state.js';
import { generateId } from '../state/ids.js';

export type SessionKind = 'access' | 'refresh' | 'cookie';

export interface TokenPayload {
  jti: string;
  sub: string;
  tenant: string;
  kind: SessionKind;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

export interface WorkspaceClaim {
  _id: string;
  name: string;
  roles: string[];
  labels: string[];
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Unsigned JWT-shaped token (`alg: none`): readable by clients, authorized only through the stored session. */
export function encodeToken(payload: TokenPayload): string {
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
}

export function decodeToken(token: string | undefined | null): TokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload && typeof payload.jti === 'string' ? payload : null;
  } catch {
    return null;
  }
}

/** Whether this mock issued the token: its tokens are unsigned, a real one ends with a signature. */
export const isMockToken = (token: string) => token.endsWith('.') && !!decodeToken(token);

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = (prefix: string) => `${prefix}${randomBytes(24).toString('hex')}`;

/** Same cookie name the real auth service uses: `qlt_<first 8 chars of the tenant>`. */
export function cookieTokenName(state: MockState): string {
  return `qlt_${state.settings.tenantId.substring(0, 8)}`.trim();
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of (header || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx < 1) continue;
    const key = part.slice(0, idx).trim();
    if (key in result) continue;
    const raw = part.slice(idx + 1).trim();
    try {
      result[key] = decodeURIComponent(raw);
    } catch {
      result[key] = raw;
    }
  }
  return result;
}

/** Same attributes as the real service: HttpOnly, Path=/api. A zero max age clears the cookie. */
export function buildSetCookie(name: string, value: string, maxAgeMs: number): string {
  const maxAge = Math.max(0, Math.floor(maxAgeMs / 1000));
  const expires = new Date(maxAgeMs > 0 ? Date.now() + maxAgeMs : 0).toUTCString();
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/api; Expires=${expires}; HttpOnly`;
}

const TTL_KEY = { access: 'accessTokenTtlMs', refresh: 'refreshTokenTtlMs', cookie: 'cookieTokenTtlMs' } as const;

/** Create a stored session and its opaque token. */
export function issueToken(
  state: MockState,
  user: Doc,
  kind: SessionKind,
  workspace: WorkspaceClaim | null,
  family: string = generateId(),
): { token: string; session: Doc } {
  const now = Date.now();
  const expiresAt = now + state.settings.auth[TTL_KEY[kind]];
  const session = state.sessions.insert({
    kind,
    userId: user._id,
    workspaceId: workspace?._id,
    family,
    expiresAt,
    created: now,
  });
  const token = encodeToken({
    jti: session._id,
    sub: user._id,
    tenant: state.settings.tenantId,
    kind,
    iat: Math.floor(now / 1000),
    exp: Math.floor(expiresAt / 1000),
    username: user.username,
    email: user.email,
    name: user.name,
    roles: user.roles,
    workspace: workspace || undefined,
  });
  return { token, session };
}

/** Resolve the live session behind a token (kind and expiry enforced). */
export function findSession(state: MockState, token: string | undefined | null, kind: SessionKind): Doc | undefined {
  const payload = decodeToken(token);
  if (!payload) return undefined;
  const session = state.sessions.get(payload.jti);
  if (!session || session.kind !== kind || session.expiresAt <= Date.now()) return undefined;
  return session;
}

export function removeFamily(state: MockState, family: string) {
  for (const s of state.sessions.list((s) => s.family === family)) state.sessions.remove(s._id);
}

export function purgeExpiredSessions(state: MockState) {
  const now = Date.now();
  for (const s of state.sessions.list((s) => s.expiresAt <= now)) state.sessions.remove(s._id);
}
