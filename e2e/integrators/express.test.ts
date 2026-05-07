/**
 * Integration tests for `@qelos/integrator-express` against a real Qelos stack.
 *
 * Skipped automatically when QELOS_INTEGRATOR_E2E_URL is not set so the unit
 * test pipeline does not wait on docker. Driven by `pnpm e2e:integrators`,
 * which spins up `compose/`, seeds via `pnpm populate-db`, then runs this
 * file against the live gateway.
 */
import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import express from 'express';
import {
  createQelosMiddleware,
  requireUser,
} from '@qelos/integrator-express';
import {
  assertE2eEnabled,
  cookieHeader,
  ensureTestBlueprint,
  login,
  loginAdmin,
  type IntegratorTestEnv,
  type LoginResult,
} from './setup.js';
import { listen, fetchJson, findCookie, type ListenHandle } from './helpers.js';

const env = assertE2eEnabled();

describe('integrator-express e2e', { skip: !env }, () => {
  if (!env) return;
  const e: IntegratorTestEnv = env;
  let session: LoginResult;
  let blueprintKey: string;

  before(async () => {
    const admin = await loginAdmin(e);
    blueprintKey = await ensureTestBlueprint(e, admin);
    session = await login(e);
  });

  function buildApp(opts?: {
    requireAuth?: boolean;
    resolveWorkspace?: Parameters<
      typeof createQelosMiddleware
    >[0]['resolveWorkspace'];
  }): express.Express {
    const app = express();
    app.use(
      createQelosMiddleware({
        config: { appUrl: e.appUrl, requireAuth: opts?.requireAuth },
        resolveWorkspace: opts?.resolveWorkspace,
      }),
    );
    app.get('/me', (req, res) => {
      const q = req.qelos;
      res.json({
        userId: q?.user?._id ?? null,
        username: q?.user?.username ?? null,
        workspaceId: q?.workspace?._id ?? null,
        workspaceCount: q?.workspaces?.length ?? 0,
      });
    });
    app.get('/secret', requireUser((_req, res) => res.json({ ok: true })));
    app.get('/entities', async (req, res) => {
      try {
        const list = await req.qelos.sdk.entities(blueprintKey).find();
        res.json({ ok: true, count: list?.length ?? 0 });
      } catch (err: any) {
        res.status(500).json({ ok: false, error: String(err?.message || err) });
      }
    });
    return app;
  }

  let handle: ListenHandle | null = null;
  after(async () => {
    if (handle) await handle.close();
  });

  it('attaches the authenticated user and a workspace', async () => {
    handle = await listen(http.createServer(buildApp()));
    const res = await fetchJson(`${handle.url}/me`, {
      headers: { cookie: cookieHeader(session) },
    });
    await handle.close();
    handle = null;
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, session.user._id);
    assert.equal(res.body.username, session.user.username);
    assert.ok(
      res.body.workspaceCount >= 1,
      `expected >= 1 workspace, got ${res.body.workspaceCount}`,
    );
    assert.ok(res.body.workspaceId, 'workspace was not resolved');
  });

  it('leaves user null on anonymous request when requireAuth is off', async () => {
    handle = await listen(http.createServer(buildApp()));
    const res = await fetchJson(`${handle.url}/me`);
    await handle.close();
    handle = null;
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, null);
    assert.equal(res.body.workspaceCount, 0);
  });

  it('returns 401 for anonymous request when requireAuth is on', async () => {
    handle = await listen(http.createServer(buildApp({ requireAuth: true })));
    const res = await fetchJson(`${handle.url}/me`);
    await handle.close();
    handle = null;
    assert.equal(res.status, 401);
  });

  it('refreshes tokens and writes new cookies when access token is stale', async () => {
    handle = await listen(http.createServer(buildApp()));
    const res = await fetchJson(`${handle.url}/me`, {
      headers: {
        cookie: cookieHeader({
          accessToken: 'definitely-not-a-valid-access-token',
          refreshToken: session.refreshToken,
        }),
      },
    });
    await handle.close();
    handle = null;
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, session.user._id);
    const newAccess = findCookie(res.setCookies, 'q_access_token');
    assert.ok(newAccess, 'expected a new q_access_token cookie after refresh');
    assert.notEqual(newAccess, 'definitely-not-a-valid-access-token');
  });

  it('resolveWorkspace receives all workspaces and its choice is persisted', async () => {
    let observed: string[] = [];
    handle = await listen(
      http.createServer(
        buildApp({
          resolveWorkspace: ({ workspaces }) => {
            observed = workspaces.map((w) => String(w._id));
            return workspaces[workspaces.length - 1] ?? null;
          },
        }),
      ),
    );
    const res = await fetchJson(`${handle.url}/me`, {
      headers: { cookie: cookieHeader(session) },
    });
    await handle.close();
    handle = null;
    assert.equal(res.status, 200);
    assert.ok(observed.length >= 1, 'resolveWorkspace was not invoked');
    assert.equal(res.body.workspaceId, observed[observed.length - 1]);
  });

  it('SDK entity operations succeed through the integrator', async () => {
    handle = await listen(http.createServer(buildApp()));
    const res = await fetchJson(`${handle.url}/entities`, {
      headers: { cookie: cookieHeader(session) },
    });
    await handle.close();
    handle = null;
    assert.equal(res.status, 200, `body: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.ok, true);
    assert.equal(typeof res.body.count, 'number');
  });
});
