import type { Doc, MockState } from '../state/mock-state.js';
import { claimFor, ensureAuthSeeded, findUserByRef, isPrivilegedUser, pickWorkspace } from './accounts.js';
import { cookieTokenName, findSession, isMockToken, parseCookies, sha256, type WorkspaceClaim } from './tokens.js';

/** Header selecting the persona (id or email) for one request. */
export const PERSONA_HEADER = 'x-qelos-mock-persona';
/** Cookie selecting the persona (id or email) until cleared. */
export const PERSONA_COOKIE = 'qelos_mock_persona';

export interface AuthSession {
  _id: string;
  kind: 'access' | 'cookie' | 'api-token' | 'persona';
  userId: string;
  workspaceId?: string;
  /** groups the access + refresh tokens issued together */
  family?: string;
}

export interface AuthContext {
  user: Doc;
  /** active workspace with the user's roles in it, or null */
  workspace: WorkspaceClaim | null;
  session: AuthSession;
  isApiToken: boolean;
  /** the administrator who is acting as `user` */
  impersonator?: Doc;
}

/** Whether the auth service's administrator routes accept the caller; an impersonating administrator keeps access. */
export const isPrivilegedCaller = (auth: AuthContext) => !!auth.impersonator || isPrivilegedUser(auth.user);

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function bearer(request: Request): string | undefined {
  const header = request.headers.get('authorization');
  return header && /^bearer /i.test(header) ? header.slice(7).trim() : undefined;
}

function personaContext(state: MockState, ref: string): AuthContext | null {
  const user = findUserByRef(state, ref);
  if (!user) return null;
  const workspace = pickWorkspace(state, user);
  return {
    user,
    workspace,
    session: { _id: `persona:${user._id}`, kind: 'persona', userId: user._id, workspaceId: workspace?._id },
    isApiToken: false,
  };
}

function apiTokenContext(state: MockState, request: Request, rawToken: string): AuthContext | null {
  const hash = sha256(rawToken);
  const token = state.apiTokens.findOne((t) => t.tokenHash === hash);
  if (!token || new Date(token.expiresAt).getTime() <= Date.now()) return null;
  const user = state.users.get(token.userId);
  if (!user) return null;

  let workspace: WorkspaceClaim | null = null;
  const requested = token.workspace || request.headers.get('x-workspace');
  if (requested) {
    // membership is always verified, never trusted from the header alone
    workspace = claimFor(state.workspaces.get(requested), user._id);
    if (!workspace && !token.workspace) return null;
  }
  state.apiTokens.update(token._id, {
    lastUsedAt: new Date().toISOString(),
    usageCount: (token.usageCount || 0) + 1,
  });
  return {
    user,
    workspace,
    session: { _id: token._id, kind: 'api-token', userId: user._id, workspaceId: workspace?._id },
    isApiToken: true,
  };
}

function tokenContext(state: MockState, token: string, kind: 'cookie' | 'access'): AuthContext | null {
  const session = findSession(state, token, kind);
  const user = session && state.users.get(session.userId);
  if (!session || !user) return null;
  return {
    user,
    workspace: claimFor(state.workspaces.get(session.workspaceId), user._id),
    session: {
      _id: session._id,
      kind,
      userId: user._id,
      workspaceId: session.workspaceId,
      family: session.family,
    },
    isApiToken: false,
  };
}

/**
 * Whether the request carries a token of this mock that no longer signs anyone in: an expired or signed-out session,
 * or an API token that expired or is not allowed in the requested workspace. The real service treats such a caller
 * as a guest. Meant for requests `authenticate` returned null for.
 */
export function hasEndedCredentials(request: Request, state: MockState): boolean {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const hash = sha256(apiKey);
    return !!state.apiTokens.findOne((t) => t.tokenHash === hash);
  }
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[cookieTokenName(state)] || cookies.token || bearer(request);
  return !!token && isMockToken(token);
}

/**
 * An administrator acting as another user (`x-impersonate-user`, optionally `x-impersonate-workspace`), as the services
 * then see the caller. Null when the user or the workspace is unknown.
 */
function impersonate(request: Request, state: MockState, caller: AuthContext): AuthContext | null {
  const wanted = request.headers.get('x-impersonate-user');
  if (!wanted || !isPrivilegedUser(caller.user)) return caller;
  const user = state.users.get(wanted);
  const workspaceId = request.headers.get('x-impersonate-workspace');
  const workspace = user && workspaceId ? claimFor(state.workspaces.get(workspaceId), user._id) : null;
  if (!user || (workspaceId && !workspace)) return null;
  return { ...caller, user, workspace, impersonator: caller.user };
}

/**
 * Resolve who is calling, like the real auth service's `verifyUser`:
 * persona header/cookie override, then `x-api-key`, then the cookie token, then
 * a bearer access token. Requests without any credentials fall back to the
 * configured `defaultPersona`. Returns null when unauthenticated or when the
 * presented credentials are invalid/expired.
 *
 * An administrator may impersonate another user. Other route modules use it to enforce permissions and permission
 * scopes.
 */
export function authenticate(request: Request, state: MockState): AuthContext | null {
  const caller = identify(request, state);
  return caller && impersonate(request, state, caller);
}

function identify(request: Request, state: MockState): AuthContext | null {
  ensureAuthSeeded(state);
  const cookies = parseCookies(request.headers.get('cookie'));

  const persona = request.headers.get(PERSONA_HEADER) || cookies[PERSONA_COOKIE];
  if (persona) return personaContext(state, decode(persona));

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) return apiTokenContext(state, request, apiKey);

  const cookieToken = cookies[cookieTokenName(state)] || cookies.token;
  if (cookieToken) return tokenContext(state, cookieToken, 'cookie');

  const accessToken = bearer(request);
  if (accessToken) return tokenContext(state, accessToken, 'access');

  return state.settings.defaultPersona ? personaContext(state, state.settings.defaultPersona) : null;
}
