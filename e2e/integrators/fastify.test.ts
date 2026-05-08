/**
 * Integration tests for `@qelos/integrator-fastify` against a real Qelos stack.
 * See `express.test.ts` for the rationale and skip behavior.
 *
 * One Fastify instance hosts three encapsulated plugin scopes so the suite
 * boots once per file rather than per test:
 *   /default — no requireAuth, default workspace resolution
 *   /auth    — requireAuth: true
 *   /tenant  — workspace resolved by the `x-tenant` request header
 */
import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  qelosFastify,
  requireUser,
} from '@qelos/integrator-fastify';
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
  parseSetCookies,
} from './helpers.js';

describe('integrator-fastify e2e', { skip: shouldSkip ? skipReason : false }, () => {
  if (shouldSkip) return;
  const env: IntegratorTestEnv = getEnv();
  let session: LoginResult;
  let blueprintKey: string;
  let app: FastifyInstance;
  let baseUrl: string;

  before(async () => {
    const admin = await loginAdmin(env);
    blueprintKey = await ensureTestBlueprint(env, admin);
    session = await login(env);

    app = Fastify();
    await app.register(scope({}), { prefix: '/default' });
    await app.register(scope({ requireAuth: true }), { prefix: '/auth' });
    await app.register(
      scope({
        resolveWorkspace: ({ request, workspaces }) => {
          const slug = request.headers['x-tenant'];
          if (typeof slug === 'string' && slug) {
            return pickWorkspaceBySlug(workspaces, slug);
          }
          return null;
        },
      }),
      { prefix: '/tenant' },
    );

    baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
  });

  after(async () => {
    if (app) await app.close();
  });

  function scope(opts: {
    requireAuth?: boolean;
    resolveWorkspace?: (params: {
      request: any;
      user: any;
      workspaces: any[];
    }) => any;
  }) {
    return async (instance: FastifyInstance) => {
      await instance.register(qelosFastify as any, {
        config: { appUrl: env.appUrl, requireAuth: opts.requireAuth },
        resolveWorkspace: opts.resolveWorkspace,
      });
      instance.get('/me', async (request) => {
        const q = request.qelos;
        return {
          userId: q?.user?._id ?? null,
          username: q?.user?.username ?? null,
          workspaceId: q?.workspace?._id ?? null,
          workspaceName: q?.workspace?.name ?? null,
          workspaceCount: q?.workspaces?.length ?? 0,
        };
      });
      instance.get('/secret', { preHandler: requireUser }, async () => ({ ok: true }));
      instance.post('/entities', async (request, reply) => {
        try {
          const created = await request.qelos.sdk
            .entities(blueprintKey)
            .create(request.body as any);
          return created;
        } catch (err: any) {
          return reply.code(500).send({ error: String(err?.message || err) });
        }
      });
      instance.get('/entities', async (request, reply) => {
        try {
          return await request.qelos.sdk.entities(blueprintKey).find();
        } catch (err: any) {
          return reply.code(500).send({ error: String(err?.message || err) });
        }
      });
      instance.get<{ Params: { id: string } }>('/entities/:id', async (request, reply) => {
        try {
          return await request.qelos.sdk
            .entities(blueprintKey)
            .findOne(request.params.id);
        } catch (err: any) {
          return reply.code(500).send({ error: String(err?.message || err) });
        }
      });
      instance.delete<{ Params: { id: string } }>('/entities/:id', async (request, reply) => {
        try {
          await request.qelos.sdk.entities(blueprintKey).remove(request.params.id);
          return reply.code(204).send();
        } catch (err: any) {
          return reply.code(500).send({ error: String(err?.message || err) });
        }
      });
    };
  }

  it('attaches the authenticated user and a workspace', async () => {
    const res = await fetchJson(`${baseUrl}/default/me`, {
      headers: { cookie: cookieHeader(session) },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, session.user._id);
    assert.equal(res.body.username, session.user.username);
    assert.ok(res.body.workspaceId);
    assert.ok(res.body.workspaceCount >= 1);
  });

  it('leaves user null on anonymous request when requireAuth is off', async () => {
    const res = await fetchJson(`${baseUrl}/default/me`);
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, null);
    assert.equal(res.body.workspaceCount, 0);
  });

  it('returns 401 for anonymous request when requireAuth is on', async () => {
    const res = await fetchJson(`${baseUrl}/auth/me`);
    assert.equal(res.status, 401);
  });

  it('refreshes tokens, sets new cookies, and a follow-up call succeeds', async () => {
    const res = await fetchJson(`${baseUrl}/default/me`, {
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

    const followUp = await fetchJson(`${baseUrl}/default/me`, {
      headers: { cookie: buildCookieHeader(refreshed) },
    });
    assert.equal(followUp.status, 200);
    assert.equal(followUp.body.userId, session.user._id);
  });

  it('resolveWorkspace picks the workspace named in the x-tenant header', async () => {
    const res = await fetchJson(`${baseUrl}/tenant/me`, {
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
    const title = `e2e-fastify-${Date.now()}`;
    const created = await fetchJson(`${baseUrl}/default/entities`, {
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

    const fetched = await fetchJson(`${baseUrl}/default/entities/${id}`, {
      headers: { cookie: cookieHeader(session) },
    });
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body?.identifier, id);
    assert.equal(fetched.body?.title, title);

    const list = await fetchJson(`${baseUrl}/default/entities`, {
      headers: { cookie: cookieHeader(session) },
    });
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body));
    assert.ok(
      list.body.some((e: any) => e.identifier === id),
      'created entity should appear in the list',
    );

    const removed = await fetchJson(`${baseUrl}/default/entities/${id}`, {
      method: 'DELETE',
      headers: { cookie: cookieHeader(session) },
    });
    assert.ok(
      removed.status === 200 || removed.status === 204,
      `delete failed: status=${removed.status}`,
    );
  });
});
