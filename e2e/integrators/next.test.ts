/**
 * Integration tests for `@qelos/integrator-next` (edge middleware + SDK factory)
 * against a real Qelos stack. Skips when QELOS_INTEGRATOR_E2E_URL is unset.
 *
 * Next.js forwards trusted identity headers on the middleware response as
 * `x-middleware-request-*` (see Next.js `handleMiddlewareField`).
 */
import { describe, it, before } from 'node:test';
import * as assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  createQelosMiddleware,
  createRequestSdk,
  QELOS_USER_HEADER,
  QELOS_WORKSPACE_HEADER,
} from '@qelos/integrator-next';
import {
  assertE2eEnabled,
  cookieHeader,
  ensureTestBlueprint,
  login,
  loginAdmin,
  type IntegratorTestEnv,
  type LoginResult,
} from './setup.js';
import { findCookie } from './helpers.js';

const env = assertE2eEnabled();

function forwardedRequestHeader(res: Response, logicalName: string): string | null {
  const want = `x-middleware-request-${logicalName}`.toLowerCase();
  for (const [k, v] of res.headers.entries()) {
    if (k.toLowerCase() === want) return v;
  }
  return null;
}

describe('integrator-next e2e', { skip: !env }, () => {
  if (!env) return;
  const e: IntegratorTestEnv = env;
  let session: LoginResult;
  let blueprintKey: string;

  before(async () => {
    const admin = await loginAdmin(e);
    blueprintKey = await ensureTestBlueprint(e, admin);
    session = await login(e);
  });

  it('attaches the authenticated user and workspace via forwarded request headers', async () => {
    const mw = createQelosMiddleware({ config: { appUrl: e.appUrl } });
    const req = new NextRequest('http://localhost/me', {
      headers: { cookie: cookieHeader(session) },
    });
    const res = await mw(req);
    assert.equal(res.status, 200);
    assert.equal(
      forwardedRequestHeader(res, QELOS_USER_HEADER),
      session.user._id,
    );
    assert.ok(forwardedRequestHeader(res, QELOS_WORKSPACE_HEADER));
  });

  it('does not forward identity headers for anonymous request when requireAuth is off', async () => {
    const mw = createQelosMiddleware({ config: { appUrl: e.appUrl } });
    const req = new NextRequest('http://localhost/me');
    const res = await mw(req);
    assert.equal(res.status, 200);
    assert.equal(forwardedRequestHeader(res, QELOS_USER_HEADER), null);
  });

  it('returns 401 for anonymous request when requireAuth is on', async () => {
    const mw = createQelosMiddleware({
      config: { appUrl: e.appUrl, requireAuth: true },
    });
    const req = new NextRequest('http://localhost/me');
    const res = await mw(req);
    assert.equal(res.status, 401);
  });

  it('refreshes tokens and writes new cookies when access token is stale', async () => {
    const mw = createQelosMiddleware({ config: { appUrl: e.appUrl } });
    const req = new NextRequest('http://localhost/me', {
      headers: {
        cookie: cookieHeader({
          accessToken: 'definitely-not-a-valid-access-token',
          refreshToken: session.refreshToken,
        }),
      },
    });
    const res = await mw(req);
    assert.equal(res.status, 200);
    assert.equal(
      forwardedRequestHeader(res, QELOS_USER_HEADER),
      session.user._id,
    );
    const setCookies = (res.headers as any).getSetCookie?.() ?? [];
    const newAccess = findCookie(setCookies, 'q_access_token');
    assert.ok(newAccess, 'expected a new q_access_token cookie after refresh');
    assert.notEqual(newAccess, 'definitely-not-a-valid-access-token');
  });

  it('resolveWorkspace receives all workspaces and its choice is forwarded', async () => {
    let observed: string[] = [];
    const mw = createQelosMiddleware({
      config: { appUrl: e.appUrl },
      resolveWorkspace: async ({ workspaces }) => {
        observed = workspaces.map((w) => String(w._id));
        return workspaces[workspaces.length - 1] ?? null;
      },
    });
    const req = new NextRequest('http://localhost/me', {
      headers: { cookie: cookieHeader(session) },
    });
    const res = await mw(req);
    assert.equal(res.status, 200);
    assert.ok(observed.length >= 1, 'resolveWorkspace was not invoked');
    assert.equal(
      forwardedRequestHeader(res, QELOS_WORKSPACE_HEADER),
      observed[observed.length - 1],
    );
  });

  it('SDK entity operations work through the integrator SDK factory', async () => {
    const tokens = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
    const sdk = createRequestSdk({
      config: { appUrl: e.appUrl },
      tokens,
      refreshTarget: null,
    });
    const list = await sdk.entities(blueprintKey).find();
    assert.ok(Array.isArray(list));
  });
});
