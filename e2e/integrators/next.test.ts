/**
 * Integration tests for `@qelos/integrator-next` (edge middleware + SDK factory)
 * against a real Qelos stack. Skips when QELOS_INTEGRATOR_E2E_URL is unset.
 *
 * Next.js forwards trusted identity headers on the middleware response as
 * `x-middleware-request-*` (see Next.js `handleMiddlewareField`).
 *
 * The middleware is a plain function — there is no per-request server boot —
 * so we construct the three middleware variants once at file scope and reuse
 * them across tests:
 *   `defaultMw` — no requireAuth, default workspace resolution
 *   `authMw`    — requireAuth: true
 *   `tenantMw`  — workspace resolved by the `x-tenant` request header
 */
import { describe, it, before } from 'node:test';
import * as assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  createQelosMiddleware,
  type QelosMiddleware,
} from '@qelos/integrator-next/middleware';
import { createRequestSdk } from '@qelos/integrator-next/sdk-factory';
import {
  QELOS_USER_HEADER,
  QELOS_WORKSPACE_HEADER,
} from '@qelos/integrator-next/types';
import {
  cookieHeader,
  ensureTestBlueprint,
  getEnv,
  login,
  loginAdmin,
  pickWorkspaceBySlug,
  shouldSkip,
  skipReason,
  type IntegratorTestEnv,
  type LoginResult,
} from './setup.js';
import { buildCookieHeader, parseSetCookies } from './helpers.js';

function forwardedRequestHeader(res: Response, logicalName: string): string | null {
  const want = `x-middleware-request-${logicalName}`.toLowerCase();
  for (const [k, v] of res.headers.entries()) {
    if (k.toLowerCase() === want) return v;
  }
  return null;
}

function setCookiesFromResponse(res: Response): string[] {
  const getter = (res.headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  if (typeof getter === 'function') return getter();
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

describe('integrator-next e2e', { skip: shouldSkip ? skipReason : false }, () => {
  if (shouldSkip) return;
  const env: IntegratorTestEnv = getEnv();
  let session: LoginResult;
  let blueprintKey: string;

  let defaultMw: QelosMiddleware;
  let authMw: QelosMiddleware;
  let tenantMw: QelosMiddleware;

  before(async () => {
    const admin = await loginAdmin(env);
    blueprintKey = await ensureTestBlueprint(env, admin);
    session = await login(env);

    defaultMw = createQelosMiddleware({ config: { appUrl: env.appUrl } });
    authMw = createQelosMiddleware({
      config: { appUrl: env.appUrl, requireAuth: true },
    });
    tenantMw = createQelosMiddleware({
      config: { appUrl: env.appUrl },
      resolveWorkspace: ({ req, workspaces }) => {
        const slug = req.headers.get('x-tenant');
        if (slug) return pickWorkspaceBySlug(workspaces, slug);
        return null;
      },
    });
  });

  it('attaches the authenticated user and a workspace', async () => {
    const req = new NextRequest('http://localhost/me', {
      headers: { cookie: cookieHeader(session) },
    });
    const res = await defaultMw(req);
    assert.equal(res.status, 200);
    assert.equal(
      forwardedRequestHeader(res, QELOS_USER_HEADER),
      session.user._id,
    );
    assert.ok(forwardedRequestHeader(res, QELOS_WORKSPACE_HEADER));
  });

  it('leaves user null on anonymous request when requireAuth is off', async () => {
    const req = new NextRequest('http://localhost/me');
    const res = await defaultMw(req);
    assert.equal(res.status, 200);
    assert.equal(forwardedRequestHeader(res, QELOS_USER_HEADER), null);
    assert.equal(forwardedRequestHeader(res, QELOS_WORKSPACE_HEADER), null);
  });

  it('returns 401 for anonymous request when requireAuth is on', async () => {
    const req = new NextRequest('http://localhost/me');
    const res = await authMw(req);
    assert.equal(res.status, 401);
  });

  it('refreshes tokens, sets new cookies, and a follow-up call succeeds', async () => {
    const req = new NextRequest('http://localhost/me', {
      headers: {
        cookie: cookieHeader({
          accessToken: 'definitely-not-a-valid-access-token',
          refreshToken: session.refreshToken,
        }),
      },
    });
    const res = await defaultMw(req);
    assert.equal(res.status, 200);
    assert.equal(
      forwardedRequestHeader(res, QELOS_USER_HEADER),
      session.user._id,
    );
    const refreshed = parseSetCookies(setCookiesFromResponse(res));
    const newAccess = refreshed.q_access_token;
    assert.ok(newAccess, 'expected a new q_access_token cookie after refresh');
    assert.notEqual(newAccess, 'definitely-not-a-valid-access-token');

    const followUpReq = new NextRequest('http://localhost/me', {
      headers: { cookie: buildCookieHeader(refreshed) },
    });
    const followUp = await defaultMw(followUpReq);
    assert.equal(followUp.status, 200);
    assert.equal(
      forwardedRequestHeader(followUp, QELOS_USER_HEADER),
      session.user._id,
    );
  });

  it('resolveWorkspace picks the workspace named in the x-tenant header', async () => {
    const req = new NextRequest('http://localhost/me', {
      headers: {
        cookie: cookieHeader(session),
        'x-tenant': env.workspaceSlug,
      },
    });
    const res = await tenantMw(req);
    assert.equal(res.status, 200);
    assert.equal(
      forwardedRequestHeader(res, QELOS_WORKSPACE_HEADER),
      session.workspaceId,
    );
  });

  it('SDK entity CRUD via the integrator works end-to-end', async () => {
    const sdk = createRequestSdk({
      config: { appUrl: env.appUrl },
      tokens: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      },
      refreshTarget: null,
    });
    const title = `e2e-next-${Date.now()}`;
    const created = await sdk.entities(blueprintKey).create({ title } as any);
    const id = (created as any)?.identifier;
    assert.ok(id, 'create response must include identifier');

    const fetched = await sdk.entities(blueprintKey).findOne(id);
    assert.equal((fetched as any).identifier, id);
    assert.equal((fetched as any).title, title);

    const list = await sdk.entities(blueprintKey).find();
    assert.ok(Array.isArray(list));
    assert.ok(
      list.some((e: any) => e.identifier === id),
      'created entity should appear in the list',
    );

    await sdk.entities(blueprintKey).remove(id);
  });
});
