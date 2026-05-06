import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { test } from 'node:test';
import express from 'express';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { createQelosMiddleware, requireUser } from '../src/middleware';

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
      return jsonResponse(200, minimalUser);
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
        cookie: 'q_access_token=access-test; q_refresh_token=refresh-test',
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

test('anonymous request leaves user null when requireAuth is false', async () => {
  const mockFetch = async () => jsonResponse(500, { error: 'should not call api' });

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

test('requireAuth returns 401 without credentials', async () => {
  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        requireAuth: true,
        sdkOptions: {
          fetch: async () => jsonResponse(500, {}),
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
      headers: {
        cookie: 'q_access_token=a; q_refresh_token=r',
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { id: string | null };
    assert.equal(body.id, 'ws-2');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
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
  const app = express();
  app.use(
    createQelosMiddleware({
      config: {
        appUrl: 'http://example.test',
        sdkOptions: { fetch: mockFetch },
      },
      onTokenRefresh: async ({ newTokens }) => {
        refreshed = true;
        assert.equal(newTokens.accessToken, 'new-access');
        assert.equal(newTokens.refreshToken, 'new-refresh');
      },
    }),
  );
  app.get('/z', (req, res) => {
    res.json({
      userId: req.qelos?.user?._id ?? null,
      access: req.qelos?.tokens.accessToken ?? null,
    });
  });

  const { server, port } = await listen(app);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/z`, {
      headers: {
        cookie: 'q_access_token=stale; q_refresh_token=refresh-ok',
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { userId: string | null; access: string | null };
    assert.equal(body.userId, 'user-1');
    assert.equal(body.access, 'new-access');
    assert.equal(refreshed, true);
    assert.ok(meCalls >= 2);
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
          fetch: async () => jsonResponse(500, {}),
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
