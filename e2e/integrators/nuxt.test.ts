/**
 * Integration tests for `@qelos/integrator-nuxt` (h3 server middleware) against
 * a real Qelos stack. See `express.test.ts` for skip behavior.
 */
import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { createApp, createError, eventHandler, toNodeListener } from 'h3';
import { createQelosMiddleware } from '@qelos/integrator-nuxt';
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

describe('integrator-nuxt e2e', { skip: !env }, () => {
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
  }) {
    const app = createApp();
    app.use(
      createQelosMiddleware({
        config: { appUrl: e.appUrl, requireAuth: opts?.requireAuth },
        resolveWorkspace: opts?.resolveWorkspace,
      }),
    );
    app.use(
      eventHandler(async (event) => {
        const path = (event.path || event.node.req.url || '').split('?')[0];
        if (path === '/me') {
          const q = event.context.qelos;
          return {
            userId: q?.user?._id ?? null,
            username: q?.user?.username ?? null,
            workspaceId: q?.workspace?._id ?? null,
            workspaceCount: q?.workspaces?.length ?? 0,
          };
        }
        if (path === '/secret') {
          if (!event.context.qelos?.user) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
          }
          return { ok: true };
        }
        if (path === '/entities') {
          try {
            const list = await event.context.qelos.sdk
              .entities(blueprintKey)
              .find();
            return { ok: true, count: list?.length ?? 0 };
          } catch (err: any) {
            throw createError({
              statusCode: 500,
              statusMessage: String(err?.message || err),
            });
          }
        }
        throw createError({ statusCode: 404, statusMessage: 'Not Found' });
      }),
    );
    return app;
  }

  let handle: ListenHandle | null = null;
  after(async () => {
    if (handle) await handle.close();
  });

  it('attaches the authenticated user and a workspace', async () => {
    handle = await listen(http.createServer(toNodeListener(buildApp())));
    const res = await fetchJson(`${handle.url}/me`, {
      headers: { cookie: cookieHeader(session) },
    });
    await handle.close();
    handle = null;
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, session.user._id);
    assert.equal(res.body.username, session.user.username);
    assert.ok(res.body.workspaceCount >= 1);
    assert.ok(res.body.workspaceId);
  });

  it('leaves user null on anonymous request when requireAuth is off', async () => {
    handle = await listen(http.createServer(toNodeListener(buildApp())));
    const res = await fetchJson(`${handle.url}/me`);
    await handle.close();
    handle = null;
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, null);
    assert.equal(res.body.workspaceCount, 0);
  });

  it('returns 401 for anonymous request when requireAuth is on', async () => {
    handle = await listen(http.createServer(toNodeListener(buildApp({ requireAuth: true }))));
    const res = await fetchJson(`${handle.url}/me`);
    await handle.close();
    handle = null;
    assert.equal(res.status, 401);
  });

  it('refreshes tokens and writes new cookies when access token is stale', async () => {
    handle = await listen(http.createServer(toNodeListener(buildApp())));
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
        toNodeListener(
          buildApp({
            resolveWorkspace: ({ workspaces }) => {
              observed = workspaces.map((w) => String(w._id));
              return workspaces[workspaces.length - 1] ?? null;
            },
          }),
        ),
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
    handle = await listen(http.createServer(toNodeListener(buildApp())));
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
