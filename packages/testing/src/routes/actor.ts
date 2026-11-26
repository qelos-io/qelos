import { MockHttpError, type RouteContext } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { authenticate, hasEndedCredentials, PERSONA_COOKIE, type AuthContext } from '../auth/authenticate.js';
import { claimFor, ensureAuthSeeded, findUserByRef, pickWorkspace } from '../auth/accounts.js';
import { parseCookies } from '../auth/tokens.js';

export interface MockActor {
  _id?: string;
  email?: string;
  roles: string[];
  workspace?: { _id: string; roles?: string[]; labels?: string[]; [key: string]: any };
  [key: string]: any;
}

/**
 * Resolve the caller of a request. Return `null`/`undefined` for "no identity":
 * the mock then does NOT enforce permissions (everything is allowed).
 */
export type Authenticate = (
  request: Request,
  state: MockState,
) => MockActor | null | undefined | Promise<MockActor | null | undefined>;

export const PERSONA_HEADER = 'x-qelos-mock-persona';

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** A workspace written on the user or persona document itself: `workspace: {...}` or a workspace id. */
function seededWorkspace(state: MockState, doc: Doc, userId: string) {
  const ws = doc.workspace;
  if (!ws || typeof ws === 'object') return ws || undefined;
  const found = state.workspaces.get(String(ws));
  return claimFor(found, userId) ?? found;
}

function toActor(user: Doc, workspace: any): MockActor {
  return { ...user, roles: Array.isArray(user.roles) ? user.roles : [], workspace: workspace || undefined };
}

function personaActor(state: MockState, ref: string): MockActor {
  const persona = state.resolvePersona(ref) ?? findUserByRef(state, ref);
  if (!persona) {
    throw new MockHttpError(401, `mock persona not found: ${ref}`, 'QELOS_MOCK_UNKNOWN_PERSONA');
  }
  // the user document is the live one: administrators change roles there
  const user = state.users.get(persona._id) ?? persona;
  return toActor(user, seededWorkspace(state, persona, user._id) ?? pickWorkspace(state, user));
}

function signedInActor(state: MockState, auth: AuthContext): MockActor {
  // an API token carries exactly the workspace it was given
  const fallback = auth.isApiToken ? undefined : seededWorkspace(state, auth.user, auth.user._id);
  return toActor(auth.user, auth.workspace ?? fallback);
}

/**
 * Default authentication, first match wins:
 * 1. the `x-qelos-mock-persona` header or the `qelos_mock_persona` cookie (persona/user id or email)
 * 2. the signed-in user: API token, session cookie or bearer access token issued by the mock
 * 3. a guest (no roles), for a token of the mock that expired or was signed out
 * 4. the configured `defaultPersona`
 *
 * Otherwise (no credentials, or ones the mock never issued) there is no actor, or with `strict` a guest.
 * The persona cookie matters behind an integrator: it forwards cookies, not custom headers.
 */
export function createDefaultAuthenticate(defaultPersona?: string, { strict = false }: { strict?: boolean } = {}): Authenticate {
  return (request, state) => {
    ensureAuthSeeded(state);
    const cookie = parseCookies(request.headers.get('cookie'))[PERSONA_COOKIE];
    const persona = request.headers.get(PERSONA_HEADER) || (cookie ? safeDecode(cookie) : '');
    if (persona) return personaActor(state, persona);
    const auth = authenticate(request, state);
    // `authenticate` falls back to the default persona too; that case is step 4
    if (auth && auth.session.kind !== 'persona') return signedInActor(state, auth);
    if (hasEndedCredentials(request, state)) return { roles: [] };
    if (defaultPersona) return personaActor(state, defaultPersona);
    return strict ? { roles: [] } : null;
  };
}

export type ActorResolver = (ctx: RouteContext) => Promise<MockActor | null>;

export function createActorResolver(authenticate: Authenticate): ActorResolver {
  return async (ctx) => (await authenticate(ctx.request, ctx.state)) || null;
}

/**
 * Whether the caller asks to be treated as a regular user, like `getBypassAdmin` of the services: `bypassAdmin` in
 * the body, else `?bypassAdmin=true`, else the `x-bypass-admin` header. The administrator SDK sends the query
 * parameter by default.
 */
export function wantsBypassAdmin(ctx: RouteContext, body?: { bypassAdmin?: unknown }): boolean {
  if (body?.bypassAdmin !== undefined) return !!body.bypassAdmin;
  if (ctx.query.get('bypassAdmin') === 'true') return true;
  return ['true', '1'].includes(ctx.request.headers.get('x-bypass-admin') ?? '');
}

/** Whether the caller may do what the roles may. No actor means the mock does not enforce permissions. */
export function mayAct(actor: MockActor | null, roles: string[]): boolean {
  return !actor || actor.roles.some((role) => roles.includes(role));
}

/** False for a guest only. */
export function isSignedIn(actor: MockActor | null): boolean {
  return !actor || !!actor._id || actor.roles.length > 0;
}
