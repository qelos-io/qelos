import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from 'fastify';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import qelosFastify, { qelosPlugin, requireUser } from '../src/plugin';

function jsonResponse(
  status: number,
  data: unknown,
  setCookie: string[] = [],
): Response {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  for (const value of setCookie) {
    headers.append('set-cookie', value);
  }
  return new Response(JSON.stringify(data), { status, headers });
}

const workspaceA: IWorkspace = {
  _id: 'ws-1',
  name: 'Primary',
  labels: [],
};

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

const userWithWorkspace = {
  ...minimalUser,
  workspace: workspaceA,
} as IUser;

test('qelosFastify attaches user, workspace, and workspaces', async () => {
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(200, userWithWorkspace);
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
      headers: { cookie: 'qelos_session=opaque-value' },
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

test('forwards inbound cookie and authorization to /api/me', async () => {
  let observedCookie: string | null = null;
  let observedAuth: string | null = null;
  const mockFetch = async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      const headers = new Headers(init?.headers);
      observedCookie = headers.get('cookie');
      observedAuth = headers.get('authorization');
      return jsonResponse(200, minimalUser);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, []);
    }
    return jsonResponse(404, {});
  };

  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetch },
    },
  });
  app.get('/me', async (request) => ({ id: request.qelos.user?._id ?? null }));

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        cookie: 'qelos_session=opaque-value',
        authorization: 'Bearer header-token',
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(observedCookie, 'qelos_session=opaque-value');
    assert.equal(observedAuth, 'Bearer header-token');
  } finally {
    await app.close();
  }
});

test('Set-Cookie from /api/me is forwarded with Domain rewritten to inbound host', async () => {
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(200, minimalUser, [
        'qelos_session=rotated; Domain=.qelos.app; Path=/; HttpOnly',
        'qelos_other=value; Domain=*.qelos.app; Path=/; Secure',
      ]);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, []);
    }
    return jsonResponse(404, {});
  };

  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetch },
    },
  });
  app.get('/r', async () => ({ ok: true }));

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/r',
      headers: { cookie: 'qelos_session=opaque-value', host: 'app.example.com' },
    });
    assert.equal(res.statusCode, 200);
    const rawSetCookie = res.headers['set-cookie'];
    const setCookie = Array.isArray(rawSetCookie)
      ? rawSetCookie
      : rawSetCookie
        ? [rawSetCookie]
        : [];
    assert.equal(setCookie.length, 2);
    const joined = setCookie.join('\n');
    assert.ok(
      /qelos_session=rotated;\s*Domain=app\.example\.com/.test(joined),
      `expected first cookie Domain rewritten to inbound host, got: ${joined}`,
    );
    assert.ok(
      /qelos_other=value;\s*Domain=app\.example\.com/.test(joined),
      `expected second cookie Domain rewritten to inbound host, got: ${joined}`,
    );
  } finally {
    await app.close();
  }
});

test('anonymous request leaves user null when requireAuth is false', async () => {
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(401, { error: 'Unauthorized' });
    }
    return jsonResponse(404, {});
  };

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

test('requireAuth returns 401 when /api/me does not identify a user', async () => {
  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      requireAuth: true,
      sdkOptions: {
        fetch: async () => jsonResponse(401, { error: 'Unauthorized' }),
      },
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

test('skipPaths bypasses user and workspace resolution', async () => {
  const mockFetch = async () => jsonResponse(500, { error: 'should not call' });

  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      skipPaths: ['/health'],
      sdkOptions: { fetch: mockFetch },
    },
  });
  app.get('/health', async (request) => ({
    hasQelos: Boolean(request.qelos),
  }));

  try {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { hasQelos: boolean };
    assert.equal(body.hasQelos, false);
  } finally {
    await app.close();
  }
});

test('flat register options (appUrl at top level)', async () => {
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(200, userWithWorkspace);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA]);
    }
    return jsonResponse(404, { error: 'not found' });
  };

  const app = Fastify();
  await app.register(qelosPlugin, {
    appUrl: 'http://example.test',
    apiToken: 'service-token',
    sdkOptions: { fetch: mockFetch },
  });
  app.get('/me', async (request) => ({
    id: request.qelos.user?._id ?? null,
  }));

  try {
    const res = await app.inject({ method: 'GET', url: '/me' });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { id: string | null }).id, 'user-1');
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
      headers: { cookie: 'qelos_session=opaque-value' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { id: string | null };
    assert.equal(body.id, 'ws-2');
  } finally {
    await app.close();
  }
});

test('workspace defaults to user.workspace, not workspaces[0]', async () => {
  const wsB: IWorkspace = { _id: 'ws-2', name: 'Second', labels: [] };
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(200, { ...minimalUser, workspace: null });
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
  });
  app.get('/w', async (request) => ({
    id: request.qelos?.workspace?._id ?? null,
    count: request.qelos?.workspaces?.length ?? 0,
  }));

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/w',
      headers: { cookie: 'qelos_session=opaque-value' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { id: string | null; count: number };
    assert.equal(body.id, null);
    assert.equal(body.count, 2);
  } finally {
    await app.close();
  }
});

test('requireUser responds 401 when mounted without user', async () => {
  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: async () => jsonResponse(401, {}) },
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

test('proxy enabled auto-skips /api/ from user resolution', async () => {
  let meCalls = 0;
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      meCalls += 1;
      return jsonResponse(200, userWithWorkspace);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA]);
    }
    return jsonResponse(404, {});
  };

  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetch },
    },
  });
  // User-defined /api/* route — registered before the wildcard, so it wins.
  app.get('/api/local-handled', async (request) => ({
    handled: 'local',
    hasUser: Boolean(request.qelos?.user),
  }));

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/api/local-handled',
      headers: { cookie: 'qelos_session=opaque-value' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { handled: string; hasUser: boolean };
    assert.equal(body.handled, 'local');
    // The preHandler is skipped on /api/* paths, so the user is not resolved
    // — and the upstream /api/me was never hit by the preHandler.
    assert.equal(body.hasUser, false);
    assert.equal(meCalls, 0);
  } finally {
    await app.close();
  }
});

test('proxy returns 503 when no proxy target is configured', async () => {
  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: '',
      apiToken: 'service-token',
      sdkOptions: { fetch: async () => jsonResponse(500, {}) },
    },
  });

  try {
    const res = await app.inject({ method: 'GET', url: '/api/anything' });
    assert.equal(res.statusCode, 503);
    const body = res.json() as { code: string };
    assert.equal(body.code, 'QELOS_PROXY_NOT_CONFIGURED');
  } finally {
    await app.close();
  }
});

test('disableProxy: true skips proxy registration and does not auto-add /api/ to skipPaths', async () => {
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(200, userWithWorkspace);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA]);
    }
    return jsonResponse(404, {});
  };

  const app = Fastify();
  await app.register(qelosFastify, {
    config: {
      appUrl: 'http://example.test',
      disableProxy: true,
      sdkOptions: { fetch: mockFetch },
    },
  });
  app.get('/api/users', async (request) => ({
    hasUser: Boolean(request.qelos?.user),
    userId: request.qelos?.user?._id ?? null,
  }));

  try {
    // /api/anything returns 404 — no catch-all proxy is registered.
    const proxyRes = await app.inject({ method: 'GET', url: '/api/anything' });
    assert.equal(proxyRes.statusCode, 404);

    // User-defined /api/users runs through the preHandler (no auto-skip).
    const handledRes = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { cookie: 'qelos_session=opaque-value' },
    });
    assert.equal(handledRes.statusCode, 200);
    const body = handledRes.json() as { hasUser: boolean; userId: string | null };
    assert.equal(body.hasUser, true);
    assert.equal(body.userId, 'user-1');
  } finally {
    await app.close();
  }
});
