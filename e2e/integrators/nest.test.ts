/**
 * Integration tests for `@qelos/integrator-nest` (middleware on Express) against
 * a real Qelos stack. See `express.test.ts` for skip behavior.
 *
 * One Express app hosts three routers, each with its own QelosMiddleware
 * instance, so the suite boots once per file rather than per test:
 *   /default — no requireAuth, default workspace resolution
 *   /auth    — requireAuth: true
 *   /tenant  — workspace resolved by the `x-tenant` request header
 */
import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import express from 'express';
import { QelosMiddleware } from '@qelos/integrator-nest';
import type { QelosModuleOptions } from '@qelos/integrator-nest';
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

describe('integrator-nest e2e', { skip: shouldSkip ? skipReason : false }, () => {
  if (shouldSkip) return;
  const env: IntegratorTestEnv = getEnv();
  let session: LoginResult;
  let blueprintKey: string;
  let handle: ListenHandle;

  before(async () => {
    const admin = await loginAdmin(env);
    blueprintKey = await ensureTestBlueprint(env, admin);
    session = await login(env);

    const app = express();
    app.use('/default', buildRouter({}));
    app.use('/auth', buildRouter({ requireAuth: true }));
    app.use(
      '/tenant',
      buildRouter({
        resolveWorkspace: ({ request, workspaces }) => {
          const slug = request.headers['x-tenant'];
          if (typeof slug === 'string' && slug) {
            return pickWorkspaceBySlug(workspaces, slug);
          }
          return null;
        },
      }),
    );

    handle = await listen(http.createServer(app));
  });

  after(async () => {
    if (handle) await handle.close();
  });

  function buildRouter(opts: {
    requireAuth?: boolean;
    resolveWorkspace?: QelosModuleOptions['resolveWorkspace'];
  }) {
    const router = express.Router();
    const mw = new QelosMiddleware({
      config: { appUrl: env.appUrl, requireAuth: opts.requireAuth },
      resolveWorkspace: opts.resolveWorkspace,
    });
    router.use((req, res, next) => {
      void mw.use(req, res, next);
    });
    router.get('/me', (req, res) => {
      const q = req.qelos;
      res.json({
        userId: q?.user?._id ?? null,
        username: q?.user?.username ?? null,
        workspaceId: q?.workspace?._id ?? null,
        workspaceName: q?.workspace?.name ?? null,
        workspaceCount: q?.workspaces?.length ?? 0,
      });
    });
    router.get('/secret', (req, res) => {
      if (!req.qelos?.user) {
        res.status(401).end();
        return;
      }
      res.json({ ok: true });
    });
    router.post('/entities', express.json(), async (req, res) => {
      try {
        const created = await req.qelos!.sdk
          .entities(blueprintKey)
          .create(req.body);
        res.json(created);
      } catch (err: any) {
        res.status(500).json({ error: String(err?.message || err) });
      }
    });
    router.get('/entities', async (req, res) => {
      try {
        const list = await req.qelos!.sdk.entities(blueprintKey).find();
        res.json(list);
      } catch (err: any) {
        res.status(500).json({ error: String(err?.message || err) });
      }
    });
    router.get('/entities/:id', async (req, res) => {
      try {
        const item = await req.qelos!.sdk
          .entities(blueprintKey)
          .findOne(req.params.id);
        res.json(item);
      } catch (err: any) {
        res.status(500).json({ error: String(err?.message || err) });
      }
    });
    router.delete('/entities/:id', async (req, res) => {
      try {
        await req.qelos!.sdk.entities(blueprintKey).remove(req.params.id);
        res.status(204).end();
      } catch (err: any) {
        res.status(500).json({ error: String(err?.message || err) });
      }
    });
    return router;
  }

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
    const title = `e2e-nest-${Date.now()}`;
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
