/**
 * Integration tests for `@qelos/integrator-nuxt` (h3 server middleware) against
 * a real Qelos stack. See `express.test.ts` for skip behavior.
 *
 * One h3 app hosts three prefixed sub-stacks so the suite boots once per file
 * rather than per test:
 *   /default — no requireAuth, default workspace resolution
 *   /auth    — requireAuth: true
 *   /tenant  — workspace resolved by the `x-tenant` request header
 *
 * h3 strips the matched prefix from `event.path` before invoking each layer,
 * so the shared route handler can discriminate by suffix (`/me`, `/entities`,
 * …) regardless of which prefix the request landed on.
 */
import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import {
  createApp,
  createError,
  eventHandler,
  getMethod,
  getRequestHeader,
  readBody,
  toNodeListener,
} from 'h3';
import { createQelosMiddleware } from '@qelos/integrator-nuxt';
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
import {
  buildCookieHeader,
  fetchJson,
  listen,
  parseSetCookies,
  type ListenHandle,
} from './helpers.js';

describe('integrator-nuxt e2e', { skip: shouldSkip ? skipReason : false }, () => {
  if (shouldSkip) return;
  const env: IntegratorTestEnv = getEnv();
  let session: LoginResult;
  let blueprintKey: string;
  let handle: ListenHandle;

  before(async () => {
    const admin = await loginAdmin(env);
    blueprintKey = await ensureTestBlueprint(env, admin);
    session = await login(env);

    const defaultMw = createQelosMiddleware({
      config: { appUrl: env.appUrl },
    });
    const authMw = createQelosMiddleware({
      config: { appUrl: env.appUrl, requireAuth: true },
    });
    const tenantMw = createQelosMiddleware({
      config: { appUrl: env.appUrl },
      resolveWorkspace: ({ event, workspaces }) => {
        const slug = getRequestHeader(event, 'x-tenant');
        if (slug) return pickWorkspaceBySlug(workspaces, slug);
        return null;
      },
    });

    const routes = eventHandler(async (event) => {
      const path = (event.path || event.node.req.url || '').split('?')[0];
      const method = getMethod(event);
      if (path === '/me') {
        const q = event.context.qelos;
        return {
          userId: q?.user?._id ?? null,
          username: q?.user?.username ?? null,
          workspaceId: q?.workspace?._id ?? null,
          workspaceName: q?.workspace?.name ?? null,
          workspaceCount: q?.workspaces?.length ?? 0,
        };
      }
      if (path === '/secret') {
        if (!event.context.qelos?.user) {
          throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
        }
        return { ok: true };
      }
      if (path === '/entities' && method === 'POST') {
        const body = await readBody<any>(event);
        return await event.context.qelos.sdk
          .entities(blueprintKey)
          .create(body);
      }
      if (path === '/entities' && method === 'GET') {
        return await event.context.qelos.sdk.entities(blueprintKey).find();
      }
      if (path.startsWith('/entities/') && method === 'GET') {
        const id = path.slice('/entities/'.length);
        return await event.context.qelos.sdk
          .entities(blueprintKey)
          .findOne(id);
      }
      if (path.startsWith('/entities/') && method === 'DELETE') {
        const id = path.slice('/entities/'.length);
        await event.context.qelos.sdk.entities(blueprintKey).remove(id);
        event.node.res.statusCode = 204;
        return null;
      }
      throw createError({ statusCode: 404, statusMessage: 'Not Found' });
    });

    const app = createApp();
    app.use('/default', defaultMw);
    app.use('/default', routes);
    app.use('/auth', authMw);
    app.use('/auth', routes);
    app.use('/tenant', tenantMw);
    app.use('/tenant', routes);

    handle = await listen(http.createServer(toNodeListener(app)));
  });

  after(async () => {
    if (handle) await handle.close();
  });

  it('attaches the authenticated user and a workspace', async () => {
    const res = await fetchJson(`${handle.url}/default/me`, {
      headers: { cookie: cookieHeader(session) },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, session.user._id);
    assert.equal(res.body.username, session.user.username);
    assert.ok(res.body.workspaceCount >= 1);
    assert.ok(res.body.workspaceId);
  });

  it('leaves user null on anonymous request when requireAuth is off', async () => {
    const res = await fetchJson(`${handle.url}/default/me`);
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, null);
    assert.equal(res.body.workspaceCount, 0);
  });

  it('returns 401 for anonymous request when requireAuth is on', async () => {
    const res = await fetchJson(`${handle.url}/auth/me`);
    assert.equal(res.status, 401);
  });

  it('refreshes tokens, sets new cookies, and a follow-up call succeeds', async () => {
    const res = await fetchJson(`${handle.url}/default/me`, {
      headers: {
        cookie: cookieHeader({
          accessToken: 'definitely-not-a-valid-access-token',
          refreshToken: session.refreshToken,
        }),
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, session.user._id);
    const refreshed = parseSetCookies(res.setCookies);
    const newAccess = refreshed.q_access_token;
    assert.ok(newAccess, 'expected a new q_access_token cookie after refresh');
    assert.notEqual(newAccess, 'definitely-not-a-valid-access-token');

    const followUp = await fetchJson(`${handle.url}/default/me`, {
      headers: { cookie: buildCookieHeader(refreshed) },
    });
    assert.equal(followUp.status, 200);
    assert.equal(followUp.body.userId, session.user._id);
  });

  it('resolveWorkspace picks the workspace named in the x-tenant header', async () => {
    const res = await fetchJson(`${handle.url}/tenant/me`, {
      headers: {
        cookie: cookieHeader(session),
        'x-tenant': env.workspaceSlug,
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.workspaceName, env.workspaceSlug);
    assert.equal(res.body.workspaceId, session.workspaceId);
  });

  it('SDK entity CRUD via the integrator works end-to-end', async () => {
    const title = `e2e-nuxt-${Date.now()}`;
    const created = await fetchJson(`${handle.url}/default/entities`, {
      method: 'POST',
      headers: {
        cookie: cookieHeader(session),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    assert.equal(created.status, 200, `create failed: ${JSON.stringify(created.body)}`);
    const id = created.body?.identifier;
    assert.ok(id, 'create response must include identifier');

    const fetched = await fetchJson(`${handle.url}/default/entities/${id}`, {
      headers: { cookie: cookieHeader(session) },
    });
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body?.identifier, id);
    assert.equal(fetched.body?.title, title);

    const list = await fetchJson(`${handle.url}/default/entities`, {
      headers: { cookie: cookieHeader(session) },
    });
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body));
    assert.ok(
      list.body.some((e: any) => e.identifier === id),
      'created entity should appear in the list',
    );

    const removed = await fetchJson(`${handle.url}/default/entities/${id}`, {
      method: 'DELETE',
      headers: { cookie: cookieHeader(session) },
    });
    assert.ok(
      removed.status === 200 || removed.status === 204,
      `delete failed: status=${removed.status}`,
    );
  });
});
