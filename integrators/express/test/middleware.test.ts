import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { test } from 'node:test';
import express from 'express';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { createQelosMiddleware, requireUser } from '../src/middleware';

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
  const res = new Response(JSON.stringify(data), { status, headers });
  return res;
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

function listen(app: express.Application): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr && 'port' in addr) {
        resolve({ server, port: addr.port });
      } else {
        reject(new Error('no port'));
      }
    });
    server.on('error', reject);
  });
}

test('createQelosMiddleware attaches user, workspace, and workspaces', async () => {
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

  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        sdkOptions: { fetch: mockFetch },
      },
    }),
  );
  app.get('/ctx', (req, res) => {
    const q = req.qelos;
    res.json({
      userId: q?.user?._id ?? null,
      workspaceId: q?.workspace?._id ?? null,
      workspaceCount: q?.workspaces?.length ?? 0,
    });
  });

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/ctx`, {
      headers: {
        cookie: 'qelos_session=opaque-value',
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      userId: string | null;
      workspaceId: string | null;
      workspaceCount: number;
    };
    assert.equal(body.userId, 'user-1');
    assert.equal(body.workspaceId, 'ws-1');
    assert.equal(body.workspaceCount, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
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

  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        sdkOptions: { fetch: mockFetch },
      },
    }),
  );
  app.get('/me', (req, res) => res.json({ id: req.qelos.user?._id ?? null }));

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/me`, {
      headers: {
        cookie: 'qelos_session=opaque-value',
        authorization: 'Bearer header-token',
      },
    });
    assert.equal(res.status, 200);
    assert.equal(observedCookie, 'qelos_session=opaque-value');
    assert.equal(observedAuth, 'Bearer header-token');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
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

  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        sdkOptions: { fetch: mockFetch },
      },
    }),
  );
  app.get('/r', (_req, res) => res.json({ ok: true }));

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/r`, {
      headers: { cookie: 'qelos_session=opaque-value' },
    });
    assert.equal(res.status, 200);
    const setCookie = res.headers.getSetCookie?.() ?? [];
    assert.equal(setCookie.length, 2);
    const joined = setCookie.join('\n');
    assert.ok(
      /qelos_session=rotated;\s*Domain=127\.0\.0\.1/.test(joined),
      `expected first cookie Domain rewritten to inbound host, got: ${joined}`,
    );
    assert.ok(
      /qelos_other=value;\s*Domain=127\.0\.0\.1/.test(joined),
      `expected second cookie Domain rewritten to inbound host, got: ${joined}`,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
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

  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        sdkOptions: { fetch: mockFetch },
      },
    }),
  );
  app.get('/x', (req, res) => {
    res.json({ user: req.qelos?.user ?? null });
  });

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/x`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { user: unknown };
    assert.equal(body.user, null);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('requireAuth returns 401 when /api/me does not identify a user', async () => {
  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        requireAuth: true,
        sdkOptions: {
          fetch: async () => jsonResponse(401, { error: 'Unauthorized' }),
        },
      },
    }),
  );
  app.get('/x', (_req, res) => res.sendStatus(200));

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/x`);
    assert.equal(res.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('skipPaths bypasses middleware', async () => {
  const mockFetch = async () => jsonResponse(500, { error: 'should not call' });

  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        skipPaths: ['/health'],
        sdkOptions: { fetch: mockFetch },
      },
    }),
  );
  app.get('/health', (req, res) => {
    res.json({ hasQelos: Boolean(req.qelos) });
  });

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { hasQelos: boolean };
    assert.equal(body.hasQelos, false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
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

  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        sdkOptions: { fetch: mockFetch },
      },
      resolveWorkspace: ({ workspaces }) =>
        workspaces.find((w) => w._id === 'ws-2') ?? null,
    }),
  );
  app.get('/w', (req, res) => {
    res.json({ id: req.qelos?.workspace?._id ?? null });
  });

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/w`, {
      headers: { cookie: 'qelos_session=opaque-value' },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { id: string | null };
    assert.equal(body.id, 'ws-2');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('workspace defaults to user.workspace, not workspaces[0]', async () => {
  const wsB: IWorkspace = { _id: 'ws-2', name: 'Second', labels: [] };
  const mockFetch = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      // user.workspace is null — frontend must prompt to activate one.
      return jsonResponse(200, { ...minimalUser, workspace: null });
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA, wsB]);
    }
    return jsonResponse(404, {});
  };

  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        sdkOptions: { fetch: mockFetch },
      },
    }),
  );
  app.get('/w', (req, res) => {
    res.json({
      id: req.qelos?.workspace?._id ?? null,
      count: req.qelos?.workspaces?.length ?? 0,
    });
  });

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/w`, {
      headers: { cookie: 'qelos_session=opaque-value' },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { id: string | null; count: number };
    assert.equal(body.id, null);
    assert.equal(body.count, 2);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('requireUser responds 401 when mounted without user', async () => {
  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        sdkOptions: {
          fetch: async () => jsonResponse(401, {}),
        },
      },
    }),
  );
  app.get('/secret', requireUser((_req, res) => res.sendStatus(200)));

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/secret`);
    assert.equal(res.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('apiToken mode wires the SDK with x-api-key for downstream calls', async () => {
  const seen: Array<{ url: string; apiKey: string | null }> = [];
  const mockFetch = async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    seen.push({ url, apiKey: headers.get('x-api-key') });
    if (url.includes('/api/me')) {
      // /api/me is called via plain fetch with the inbound cookie forwarded,
      // not via the SDK, so it does not carry x-api-key.
      return jsonResponse(200, userWithWorkspace);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA]);
    }
    return jsonResponse(404, {});
  };

  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        apiToken: 'service-token',
        sdkOptions: { fetch: mockFetch },
      },
    }),
  );
  app.get('/svc', (req, res) =>
    res.json({ id: req.qelos.user?._id ?? null, ws: req.qelos.workspace?._id ?? null }),
  );

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/svc`, {
      headers: { cookie: 'qelos_session=opaque' },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { id: string | null; ws: string | null };
    assert.equal(body.id, 'user-1');
    assert.equal(body.ws, 'ws-1');
    // No token-refresh endpoints are hit — the apiToken is used by the SDK as
    // x-api-key on its own calls (e.g. /api/workspaces).
    assert.ok(!seen.some((s) => s.url.includes('/api/token/refresh')));
    assert.ok(!seen.some((s) => s.url.includes('/api/cookie/refresh')));
    const workspaceCall = seen.find(
      (s) => s.url.includes('/api/workspaces') && !s.url.includes('/api/workspaces/'),
    );
    assert.ok(workspaceCall, 'expected the SDK to call /api/workspaces');
    assert.equal(workspaceCall!.apiKey, 'service-token');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('skipPaths matches multiple prefixes', async () => {
  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        skipPaths: ['/health', '/metrics'],
        sdkOptions: {
          fetch: async () => jsonResponse(500, { error: 'should not call' }),
        },
      },
    }),
  );
  app.get('/health', (_req, res) => res.json({ p: 'health' }));
  app.get('/metrics', (_req, res) => res.json({ p: 'metrics' }));

  const { server, port } = await listen(app);
  try {
    const a = await fetch(`http://127.0.0.1:${port}/health`);
    const b = await fetch(`http://127.0.0.1:${port}/metrics`);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
