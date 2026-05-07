import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from 'fastify';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import qelosFastify, { requireUser } from '../src/plugin';

function jsonResponse(status: number, data: unknown): Response {
  const res = new Response(JSON.stringify(data));
  Object.defineProperty(res, 'status', { value: status });
  Object.defineProperty(res, 'ok', { value: status >= 200 && status < 300 });
  res.headers.set('Content-Type', 'application/json');
  return res;
}

const minimalUser: IUser = {
  _id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  fullName: 'Alice Example',
  firstName: 'Alice',
  lastName: 'Example',
  birthDate: '1990-01-01',
  roles: [],
  metadata: {},
};

const workspaceA: IWorkspace = {
  _id: 'ws-1',
  name: 'Primary',
  labels: [],
};

test('qelosFastify attaches user, workspace, and workspaces', async () => {
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(200, minimalUser);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA]);
    }
    return jsonResponse(404, { error: 'not found' });
  };

  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetch },
    },
  });
  app.get('/ctx', async (request) => {
    const q = request.qelos;
    return {
      userId: q?.user?._id ?? null,
      workspaceId: q?.workspace?._id ?? null,
      workspaceCount: q?.workspaces?.length ?? 0,
    };
  });

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/ctx',
      headers: { cookie: 'q_access_token=access-test; q_refresh_token=refresh-test' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      userId: string | null;
      workspaceId: string | null;
      workspaceCount: number;
    };
    assert.equal(body.userId, 'user-1');
    assert.equal(body.workspaceId, 'ws-1');
    assert.equal(body.workspaceCount, 1);
  } finally {
    await app.close();
  }
});

test('anonymous request leaves user null when requireAuth is false', async () => {
  const mockFetch = async () => jsonResponse(500, { error: 'should not call api' });

  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetch },
    },
  });
  app.get('/x', async (request) => ({ user: request.qelos?.user ?? null }));

  try {
    const res = await app.inject({ method: 'GET', url: '/x' });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { user: unknown };
    assert.equal(body.user, null);
  } finally {
    await app.close();
  }
});

test('requireAuth returns 401 without credentials', async () => {
  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      requireAuth: true,
      sdkOptions: { fetch: async () => jsonResponse(500, {}) },
    },
  });
  app.get('/x', async () => ({ ok: true }));

  try {
    const res = await app.inject({ method: 'GET', url: '/x' });
    assert.equal(res.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('skipPaths bypasses plugin', async () => {
  const mockFetch = async () => jsonResponse(500, { error: 'should not call' });

  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      skipPaths: ['/health'],
      sdkOptions: { fetch: mockFetch },
    },
  });
  app.get('/health', async (request) => ({ hasQelos: Boolean(request.qelos) }));

  try {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { hasQelos: boolean };
    assert.equal(body.hasQelos, false);
  } finally {
    await app.close();
  }
});

test('resolveWorkspace can pick a workspace', async () => {
  const wsB: IWorkspace = { _id: 'ws-2', name: 'Second', labels: [] };
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(200, minimalUser);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA, wsB]);
    }
    return jsonResponse(404, {});
  };

  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetch },
    },
    resolveWorkspace: ({ workspaces }) =>
      workspaces.find((w) => w._id === 'ws-2') ?? null,
  });
  app.get('/w', async (request) => ({ id: request.qelos?.workspace?._id ?? null }));

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/w',
      headers: { cookie: 'q_access_token=a; q_refresh_token=r' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { id: string | null };
    assert.equal(body.id, 'ws-2');
  } finally {
    await app.close();
  }
});

test('onTokenRefresh runs after automatic token refresh', async () => {
  let meCalls = 0;
  const mockFetch = async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/token/refresh')) {
      assert.ok(init?.method?.toLowerCase() === 'post');
      return jsonResponse(200, {
        payload: {
          token: 'new-access',
          refreshToken: 'new-refresh',
          user: minimalUser,
        },
      });
    }
    if (url.includes('/api/me')) {
      meCalls += 1;
      if (meCalls === 1) {
        return jsonResponse(401, { error: 'Unauthorized' });
      }
      return jsonResponse(200, minimalUser);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA]);
    }
    return jsonResponse(404, {});
  };

  let refreshed = false;
  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetch },
    },
    onTokenRefresh: async ({ newTokens }) => {
      refreshed = true;
      assert.equal(newTokens.accessToken, 'new-access');
      assert.equal(newTokens.refreshToken, 'new-refresh');
    },
  });
  app.get('/z', async (request) => ({
    userId: request.qelos?.user?._id ?? null,
    access: request.qelos?.tokens.accessToken ?? null,
  }));

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/z',
      headers: { cookie: 'q_access_token=stale; q_refresh_token=refresh-ok' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { userId: string | null; access: string | null };
    assert.equal(body.userId, 'user-1');
    assert.equal(body.access, 'new-access');
    assert.equal(refreshed, true);
    assert.ok(meCalls >= 2);
  } finally {
    await app.close();
  }
});

test('requireUser responds 401 when mounted without user', async () => {
  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: async () => jsonResponse(500, {}) },
    },
  });
  app.get('/secret', { preHandler: requireUser }, async () => ({ ok: true }));

  try {
    const res = await app.inject({ method: 'GET', url: '/secret' });
    assert.equal(res.statusCode, 401);
  } finally {
    await app.close();
  }
});
