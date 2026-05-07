/**
 * Integration tests for `@qelos/integrator-fastify` against a real Qelos stack.
 * See `express.test.ts` for the rationale and skip behavior.
 */
import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  qelosFastify,
  requireUser,
} from '@qelos/integrator-fastify';
import {
  assertE2eEnabled,
  cookieHeader,
  ensureTestBlueprint,
  login,
  loginAdmin,
  type IntegratorTestEnv,
  type LoginResult,
} from './setup.js';
import { fetchJson, findCookie } from './helpers.js';

const env = assertE2eEnabled();

interface AppHandle {
  url: string;
  close: () => Promise<void>;
}

describe('integrator-fastify e2e', { skip: !env }, () => {
  if (!env) return;
  const e: IntegratorTestEnv = env;
  let session: LoginResult;
  let blueprintKey: string;

  before(async () => {
    const admin = await loginAdmin(e);
    blueprintKey = await ensureTestBlueprint(e, admin);
    session = await login(e);
  });

  async function buildApp(opts?: {
    requireAuth?: boolean;
    resolveWorkspace?: (params: {
      request: any;
      user: any;
      workspaces: any[];
    }) => any;
  }): Promise<AppHandle> {
    const app: FastifyInstance = Fastify();
    await app.register(qelosFastify as any, {
      config: { appUrl: e.appUrl, requireAuth: opts?.requireAuth },
      resolveWorkspace: opts?.resolveWorkspace,
    });
    app.get('/me', async (request) => {
      const q = request.qelos;
      return {
        userId: q?.user?._id ?? null,
        username: q?.user?.username ?? null,
        workspaceId: q?.workspace?._id ?? null,
        workspaceCount: q?.workspaces?.length ?? 0,
      };
    });
    app.get('/secret', { preHandler: requireUser }, async () => ({ ok: true }));
    app.get('/entities', async (request, reply) => {
      try {
        const list = await request.qelos.sdk.entities(blueprintKey).find();
        return { ok: true, count: list?.length ?? 0 };
      } catch (err: any) {
        return reply
          .code(500)
          .send({ ok: false, error: String(err?.message || err) });
      }
    });
    const url = await app.listen({ port: 0, host: '127.0.0.1' });
    return { url, close: () => app.close() };
  }

  let active: AppHandle | null = null;
  after(async () => {
    if (active) await active.close();
  });

  async function withApp(
    opts: Parameters<typeof buildApp>[0],
    fn: (url: string) => Promise<void>,
  ) {
    active = await buildApp(opts);
    try {
      await fn(active.url);
    } finally {
      await active.close();
      active = null;
    }
  }

  it('attaches the authenticated user and a workspace', async () => {
    await withApp(undefined, async (url) => {
      const res = await fetchJson(`${url}/me`, {
        headers: { cookie: cookieHeader(session) },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.userId, session.user._id);
      assert.ok(res.body.workspaceId);
      assert.ok(res.body.workspaceCount >= 1);
    });
  });

  it('leaves user null on anonymous request when requireAuth is off', async () => {
    await withApp(undefined, async (url) => {
      const res = await fetchJson(`${url}/me`);
      assert.equal(res.status, 200);
      assert.equal(res.body.userId, null);
    });
  });

  it('returns 401 for anonymous request when requireAuth is on', async () => {
    await withApp({ requireAuth: true }, async (url) => {
      const res = await fetchJson(`${url}/me`);
      assert.equal(res.status, 401);
    });
  });

  it('refreshes tokens and writes new cookies when access token is stale', async () => {
    await withApp(undefined, async (url) => {
      const res = await fetchJson(`${url}/me`, {
        headers: {
          cookie: cookieHeader({
            accessToken: 'definitely-not-a-valid-access-token',
            refreshToken: session.refreshToken,
          }),
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.userId, session.user._id);
      const newAccess = findCookie(res.setCookies, 'q_access_token');
      assert.ok(newAccess, 'expected a new q_access_token cookie after refresh');
      assert.notEqual(newAccess, 'definitely-not-a-valid-access-token');
    });
  });

  it('resolveWorkspace receives all workspaces and its choice is persisted', async () => {
    let observed: string[] = [];
    await withApp(
      {
        resolveWorkspace: ({ workspaces }) => {
          observed = workspaces.map((w: any) => String(w._id));
          return workspaces[workspaces.length - 1] ?? null;
        },
      },
      async (url) => {
        const res = await fetchJson(`${url}/me`, {
          headers: { cookie: cookieHeader(session) },
        });
        assert.equal(res.status, 200);
        assert.ok(observed.length >= 1, 'resolveWorkspace was not invoked');
        assert.equal(res.body.workspaceId, observed[observed.length - 1]);
      },
    );
  });

  it('SDK entity operations succeed through the integrator', async () => {
    await withApp(undefined, async (url) => {
      const res = await fetchJson(`${url}/entities`, {
        headers: { cookie: cookieHeader(session) },
      });
      assert.equal(res.status, 200, `body: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.ok, true);
      assert.equal(typeof res.body.count, 'number');
    });
  });
});
