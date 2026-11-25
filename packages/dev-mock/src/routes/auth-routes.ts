import { jsonResponse, type RouteContext, type RouteModule } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import {
  authenticate,
  PERSONA_COOKIE,
  PERSONA_HEADER,
  type AuthContext,
} from '../auth/authenticate.js';
import {
  claimFor,
  createPersonalWorkspace,
  ensureAuthSeeded,
  findUserByLogin,
  findUserByRef,
  isPrivilegedUser,
  meResponse,
  pickWorkspace,
  userSummary,
} from '../auth/accounts.js';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { getUserPermissions, checkPermission, rolesOf } from '../auth/permissions.js';
import {
  buildSetCookie,
  cookieTokenName,
  findSession,
  issueToken,
  parseCookies,
  purgeExpiredSessions,
  randomToken,
  removeFamily,
  sha256,
  type WorkspaceClaim,
} from '../auth/tokens.js';
import { workspaceRoutes } from './workspace-routes.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIRST_NAME = /^[a-zA-Z]+([-\s]?[a-zA-Z]+)*$/;
const SOCIAL_PROVIDERS = new Set(['linkedin', 'facebook', 'google', 'github']);

export const unauthorized = () =>
  jsonResponse({ message: 'you are not authorized. must be logged in.' }, 401);
const emptyResponse = (status: number, headers?: HeadersInit) => new Response(null, { status, headers });

function withCookie(body: unknown, cookies: string[], status = 200): Response {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(JSON.stringify(body), { status, headers });
}

/** Issue the session for a sign-in/sign-up, in the `cookie` (default) or `oauth` flavour. */
function sessionResponse(state: MockState, user: Doc, workspace: WorkspaceClaim | null, authType?: string) {
  purgeExpiredSessions(state);
  if (workspace) state.users.update(user._id, { activeWorkspace: workspace._id });
  if (authType === 'oauth') {
    const access = issueToken(state, user, 'access', workspace);
    const refresh = issueToken(state, user, 'refresh', workspace, access.session.family);
    return jsonResponse({
      payload: {
        token: access.token,
        refreshToken: refresh.token,
        user: userSummary(user),
        workspace: workspace && { _id: workspace._id, name: workspace.name, roles: workspace.roles, labels: workspace.labels },
      },
    });
  }
  const cookie = issueToken(state, user, 'cookie', workspace);
  return withCookie({ payload: { user: userSummary(user), workspace: workspace || undefined } }, [
    buildSetCookie(cookieTokenName(state), cookie.token, state.settings.auth.cookieTokenTtlMs),
  ]);
}

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get('authorization');
  return header?.split(' ')[1] || undefined;
}

export const authRoutes: RouteModule = (router, state) => {
  ensureAuthSeeded(state);
  const auth = (ctx: RouteContext) => authenticate(ctx.request, state);

  // ------------------------------------------------------------ sign in/up

  router.register('POST', '/api/signin', async ({ json }) => {
    const body = (await json()) || {};
    if (typeof body.password !== 'string' || !body.password.trim()) {
      return jsonResponse({ errors: { password: { code: 'EMPTY_PASSWORD' } } }, 401);
    }
    const login = (typeof body.username === 'string' && body.username.trim()) || body.email || '';
    const user = findUserByLogin(state, login);
    const rolesOk = !Array.isArray(body.roles) || body.roles.some((r: string) => user?.roles?.includes(r));
    if (!user || !rolesOk || !verifyPassword(body.password, user.passwordHash)) {
      return jsonResponse({ errors: { general: { message: 'Invalid username or password' } } }, 401);
    }
    return sessionResponse(state, user, pickWorkspace(state, user, body.workspace), body.authType);
  });

  router.register('POST', '/api/signup', async ({ json }) => {
    const body = (await json()) || {};
    const errors: Record<string, any> = {};
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const username = (typeof body.username === 'string' && body.username.trim()) || email;
    if (!EMAIL.test(email)) errors.email = { code: 'INVALID_EMAIL' };
    if (typeof body.firstName !== 'string' || !FIRST_NAME.test(body.firstName.trim())) {
      errors.firstName = { code: 'INVALID_NAME' };
    }
    if (typeof body.password !== 'string' || body.password.trim().length < 8) {
      errors.password = { code: 'INVALID_PASSWORD' };
    }
    // the real service answers form failures with 200 + `errors`
    if (Object.keys(errors).length) return jsonResponse({ errors });
    if (findUserByLogin(state, username) || findUserByLogin(state, email)) {
      return jsonResponse({ errors: { email: 'DUPLICATED_EMAIL' } });
    }

    const { firstName, lastName, name, fullName } = body;
    const full = fullName || name || `${firstName} ${lastName ?? ''}`.trim();
    const user = state.users.insert({
      tenant: state.settings.tenantId,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash: hashPassword(body.password.trim()),
      fullName: full,
      name: full,
      firstName,
      lastName,
      birthDate: body.birthDate,
      phone: body.phone,
      roles: [state.settings.auth.defaultRole],
      metadata: {},
      created: new Date().toISOString(),
    });
    const ws = state.settings.auth.personalWorkspace ? createPersonalWorkspace(state, user) : undefined;
    return sessionResponse(state, user, claimFor(ws, user._id), body.authType);
  });

  // --------------------------------------------------------------- refresh

  router.register('POST', '/api/token/refresh', ({ request }) => {
    const session = findSession(state, bearerToken(request), 'refresh');
    const user = session && state.users.get(session.userId);
    if (!session || !user) return emptyResponse(401);
    // rotation: a refresh token is single use
    state.sessions.remove(session._id);
    const workspace = claimFor(state.workspaces.get(session.workspaceId), user._id);
    const access = issueToken(state, user, 'access', workspace);
    const refresh = issueToken(state, user, 'refresh', workspace, access.session.family);
    return {
      payload: {
        user: { email: user.email, name: user.name, roles: user.roles },
        token: access.token,
        refreshToken: refresh.token,
      },
    };
  });

  router.register('POST', '/api/cookie/refresh', ({ request }) => {
    const cookies = parseCookies(request.headers.get('cookie'));
    const token = cookies[cookieTokenName(state)] || cookies.token || bearerToken(request);
    const session = findSession(state, token, 'cookie');
    const user = session && state.users.get(session.userId);
    if (!session || !user) return emptyResponse(401);
    state.sessions.remove(session._id);
    const workspace = claimFor(state.workspaces.get(session.workspaceId), user._id);
    const fresh = issueToken(state, user, 'cookie', workspace);
    return withCookie(
      {
        payload: {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            fullName: user.fullName,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            profileImage: user.profileImage,
          },
          workspace: workspace ? { _id: workspace._id } : null,
          cookieToken: fresh.token,
        },
      },
      [buildSetCookie(cookieTokenName(state), fresh.token, state.settings.auth.cookieTokenTtlMs)],
    );
  });

  /** exchange a refresh token (social login redirect `?rt=`) for a cookie session */
  router.register('POST', '/api/auth/callback', ({ query }) => {
    const rt = query.get('rt');
    if (!rt) return emptyResponse(401);
    const session = findSession(state, rt, 'refresh');
    const user = session && state.users.get(session.userId);
    if (!session || !user) return jsonResponse({ error: 'Invalid refresh token' }, 401);
    state.sessions.remove(session._id);
    const workspace = claimFor(state.workspaces.get(session.workspaceId), user._id);
    const cookie = issueToken(state, user, 'cookie', workspace);
    return withCookie({ payload: { user: userSummary(user), workspace } }, [
      buildSetCookie(cookieTokenName(state), cookie.token, state.settings.auth.cookieTokenTtlMs),
    ]);
  });

  router.register('POST', '/api/logout', (ctx) => {
    const current = auth(ctx);
    if (!current) return unauthorized();
    const { session } = current;
    if (session.kind === 'cookie') {
      state.sessions.remove(session._id);
      return emptyResponse(200, { 'set-cookie': buildSetCookie(cookieTokenName(state), '', 0) });
    }
    if (session.kind === 'access' && session.family) removeFamily(state, session.family);
    return emptyResponse(200);
  });

  // ---------------------------------------------------------------- social

  /** Social login stub: no provider round trip, signs in the selected persona and redirects with `?rt=`. */
  const socialLogin = ({ request, url, params }: RouteContext) => {
    if (!SOCIAL_PROVIDERS.has(params.provider)) {
      return jsonResponse({ code: 'QELOS_MOCK_NOT_IMPLEMENTED', message: `unknown provider "${params.provider}"` }, 404);
    }
    const current = authenticate(request, state);
    const user = current?.user || state.users.list()[0];
    if (!user) return jsonResponse({ message: 'no mock users to sign in as' }, 404);
    const workspace = current?.workspace || pickWorkspace(state, user);
    const access = issueToken(state, user, 'access', workspace);
    const refresh = issueToken(state, user, 'refresh', workspace, access.session.family);
    const target = new URL(url.searchParams.get('returnUrl') || '/', url);
    target.searchParams.set('rt', refresh.token);
    const passState = url.searchParams.get('state');
    if (passState) target.searchParams.set('state', passState);
    return emptyResponse(302, { location: target.toString() });
  };
  router.register('GET', '/api/auth/:provider', socialLogin);
  router.register('GET', '/api/auth/:provider/callback', socialLogin);

  // -------------------------------------------------------------------- me

  router.register('GET', '/api/me', (ctx) => {
    const current = auth(ctx);
    return current ? meResponse(state, current.user, current.workspace) : unauthorized();
  });

  router.register('POST', '/api/me', async (ctx) => {
    const current = auth(ctx);
    if (!current) return unauthorized();
    const body = (await ctx.json()) || {};
    const { user } = current;
    const patch: Record<string, unknown> = {};
    const fullName = body.fullName || body.name;
    if (fullName) {
      patch.fullName = fullName;
      patch.name = fullName;
    }
    for (const key of ['firstName', 'lastName', 'birthDate', 'profileImage', 'metadata'] as const) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    if (typeof body.password === 'string' && body.password.trim()) patch.passwordHash = hashPassword(body.password.trim());
    const updated = state.users.update(user._id, patch) || user;
    return { ...meResponse(state, updated, current.workspace), username: body.username || updated.username };
  });

  // ------------------------------------------------------------ api tokens

  const manageTokens = (ctx: RouteContext): AuthContext | Response => {
    const current = auth(ctx);
    if (!current) return unauthorized();
    if (current.isApiToken) {
      return jsonResponse({ message: 'API token management is not allowed via token authentication' }, 403);
    }
    return current;
  };
  const tokenView = (t: Doc) => ({
    _id: t._id,
    nickname: t.nickname,
    tokenPrefix: t.tokenPrefix,
    expiresAt: t.expiresAt,
    lastUsedAt: t.lastUsedAt,
    workspace: t.workspace ? { _id: t.workspace, name: state.workspaces.get(t.workspace)?.name } : null,
    usageCount: t.usageCount || 0,
    created: t.created,
  });

  router.register('GET', '/api/me/api-tokens', (ctx) => {
    const current = manageTokens(ctx);
    if (current instanceof Response) return current;
    return state.apiTokens.list((t) => t.userId === current.user._id).map(tokenView);
  });

  router.register('POST', '/api/me/api-tokens', async (ctx) => {
    const current = manageTokens(ctx);
    if (current instanceof Response) return current;
    const { nickname, workspace, expiresAt } = (await ctx.json()) || {};
    if (!nickname || !expiresAt) return jsonResponse({ message: 'nickname and expiresAt are required' }, 400);
    const expires = new Date(expiresAt);
    if (isNaN(expires.getTime()) || expires <= new Date()) {
      return jsonResponse({ message: 'expiresAt must be a valid future date' }, 400);
    }
    const raw = randomToken('qlk_');
    const apiToken = state.apiTokens.insert({
      userId: current.user._id,
      workspace: workspace || null,
      nickname,
      tokenHash: sha256(raw),
      tokenPrefix: raw.slice(0, 8),
      expiresAt: expires.toISOString(),
      usageCount: 0,
      created: new Date().toISOString(),
    });
    return jsonResponse({ token: raw, apiToken: tokenView(apiToken) }, 201);
  });

  router.register('DELETE', '/api/me/api-tokens/:tokenId', (ctx) => {
    const current = manageTokens(ctx);
    if (current instanceof Response) return current;
    const token = state.apiTokens.get(ctx.params.tokenId);
    if (!token || token.userId !== current.user._id) return jsonResponse({ message: 'Token not found' }, 404);
    state.apiTokens.remove(token._id);
    return { message: 'Token revoked' };
  });

  // ----------------------------------------------------------- permissions

  router.register('GET', '/api/me/permissions', (ctx) => {
    const current = auth(ctx);
    if (!current) return unauthorized();
    return {
      roles: current.user.roles,
      workspaceRoles: current.workspace?.roles || [],
      permissions: getUserPermissions(current, state),
    };
  });

  /** body: `{ permission: string }` or `{ permissions: string[] }` */
  router.register('POST', '/api/permissions/check', async (ctx) => {
    const current = auth(ctx);
    if (!current) return unauthorized();
    const body = (await ctx.json()) || {};
    const wanted: string[] = [body.permission, ...(Array.isArray(body.permissions) ? body.permissions : [])].filter(
      (p) => typeof p === 'string',
    );
    if (!wanted.length) return jsonResponse({ message: 'missing "permission" or "permissions"' }, 400);
    const results = Object.fromEntries(wanted.map((p) => [p, checkPermission(current, state, p)]));
    return { allowed: Object.values(results).every(Boolean), results, roles: rolesOf(current) };
  });

  router.register('GET', '/api/roles', (ctx) => {
    const current = auth(ctx);
    if (!current) return unauthorized();
    if (!isPrivilegedUser(current.user)) return jsonResponse({ message: 'you are not privileged.' }, 401);
    return [...new Set([...state.users.list().flatMap((u) => u.roles || []), ...Object.keys(state.settings.roles)])];
  });

  // -------------------------------------------------------------- personas

  router.register('GET', '/api/mock/personas', () =>
    state.personas.list().map((p) => ({ _id: p._id, email: p.email, name: p.name, roles: p.roles })),
  );

  /** select a persona for this browser via cookie: `{ persona: "<id|email>" }` */
  router.register('POST', '/api/mock/persona', async ({ json }) => {
    const { persona } = (await json()) || {};
    const user = typeof persona === 'string' ? findUserByRef(state, persona) : undefined;
    if (!user) return jsonResponse({ message: 'persona not found' }, 404);
    const cookie = `${PERSONA_COOKIE}=${encodeURIComponent(user._id)}; Path=/; HttpOnly`;
    return withCookie({ persona: user._id, header: PERSONA_HEADER }, [cookie]);
  });

  router.register('DELETE', '/api/mock/persona', () =>
    withCookie({ cleared: true }, [`${PERSONA_COOKIE}=; Max-Age=0; Path=/; HttpOnly`]),
  );

  workspaceRoutes(router, state);
};
