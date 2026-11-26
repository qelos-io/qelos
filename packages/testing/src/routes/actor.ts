import { MockHttpError, type RouteContext } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { PERSONA_COOKIE } from '../auth/authenticate.js';
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

function toActor(state: MockState, doc: Doc): MockActor {
  const ws = doc.workspace;
  const workspace = ws && typeof ws === 'object' ? ws : ws ? state.workspaces.get(String(ws)) : undefined;
  return { ...doc, roles: Array.isArray(doc.roles) ? doc.roles : [], workspace };
}

/**
 * Default authentication: the `x-qelos-mock-persona` header or the `qelos_mock_persona` cookie (persona/user id
 * or email), falling back to the configured `defaultPersona`. Without any of them there is no actor.
 * The cookie matters behind an integrator: it forwards cookies, not custom headers.
 */
export function createDefaultAuthenticate(defaultPersona?: string): Authenticate {
  return (request, state) => {
    const cookie = parseCookies(request.headers.get('cookie'))[PERSONA_COOKIE];
    const wanted = request.headers.get(PERSONA_HEADER) || (cookie ? safeDecode(cookie) : '') || defaultPersona;
    if (!wanted) return null;
    const doc = state.resolvePersona(wanted);
    if (!doc) {
      throw new MockHttpError(401, `mock persona not found: ${wanted}`, 'QELOS_MOCK_UNKNOWN_PERSONA');
    }
    return toActor(state, doc);
  };
}

export type ActorResolver = (ctx: RouteContext) => Promise<MockActor | null>;

export function createActorResolver(authenticate: Authenticate): ActorResolver {
  return async (ctx) => (await authenticate(ctx.request, ctx.state)) || null;
}

/** No actor means the mock does not enforce permissions. */
export function isAdmin(actor: MockActor | null): boolean {
  return !actor || actor.roles.includes('admin');
}

export function requireAdmin(actor: MockActor | null) {
  if (!isAdmin(actor)) throw new MockHttpError(403, 'not permitted');
}
