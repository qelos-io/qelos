import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';

import { QelosMiddleware } from '../src/middleware';
import type { AnyRequest } from '../src/types';

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

function mockFetchOk(): typeof fetch {
  return async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(200, minimalUser);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA]);
    }
    return jsonResponse(404, { error: 'not found' });
  };
}

test('QelosMiddleware attaches user, workspace, and workspaces', async () => {
  const mw = new QelosMiddleware({
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetchOk() },
    },
  });

  const req: AnyRequest = {
    headers: { cookie: 'q_access_token=access-test; q_refresh_token=refresh-test' },
    path: '/ctx',
    url: '/ctx',
  };

  await new Promise<void>((resolve, reject) => {
    void mw.use(req, {}, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  assert.equal(req.qelos?.user?._id, 'user-1');
  assert.equal(req.qelos?.workspace?._id, 'ws-1');
  assert.equal(req.qelos?.workspaces?.length, 1);
});

test('anonymous request leaves user null when requireAuth is false', async () => {
  const mw = new QelosMiddleware({
    config: {
      appUrl: 'http://example.test',
      sdkOptions: {
        fetch: async () => jsonResponse(500, { error: 'should not call api' }),
      },
    },
  });

  const req: AnyRequest = {
    headers: {},
    path: '/',
    url: '/',
  };

  await new Promise<void>((resolve, reject) => {
    void mw.use(req, {}, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  assert.equal(req.qelos?.user ?? null, null);
});

test('requireAuth calls next with UnauthorizedException without credentials', async () => {
  const mw = new QelosMiddleware({
    config: {
      appUrl: 'http://example.test',
      requireAuth: true,
      sdkOptions: {
        fetch: async () => jsonResponse(500, {}),
      },
    },
  });

  const req: AnyRequest = {
    headers: {},
    path: '/',
    url: '/',
  };

  await new Promise<void>((resolve, reject) => {
    void mw.use(req, {}, (err?: unknown) => {
      try {
        assert.ok(err instanceof UnauthorizedException);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
});

test('skipPaths bypasses middleware', async () => {
  const mw = new QelosMiddleware({
    config: {
      appUrl: 'http://example.test',
      skipPaths: ['/health'],
      sdkOptions: {
        fetch: async () => jsonResponse(500, { error: 'should not call' }),
      },
    },
  });

  const req: AnyRequest = {
    headers: {},
    path: '/health',
    url: '/health',
  };

  await new Promise<void>((resolve, reject) => {
    void mw.use(req, {}, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  assert.equal(req.qelos, undefined);
});

test('resolveWorkspace can pick a workspace', async () => {
  const wsB: IWorkspace = { _id: 'ws-2', name: 'Second', labels: [] };

  const mockFetchList = async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/api/me')) {
      return jsonResponse(200, minimalUser);
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA, wsB]);
    }
    return jsonResponse(404, {});
  };

  const mw2 = new QelosMiddleware({
    config: {
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetchList },
    },
    resolveWorkspace: async ({ workspaces }) =>
      workspaces.find((w) => w._id === 'ws-2') ?? null,
  });

  const req: AnyRequest = {
    headers: { cookie: 'q_access_token=a; q_refresh_token=r' },
    path: '/',
    url: '/',
  };

  await new Promise<void>((resolve, reject) => {
    void mw2.use(req, {}, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  assert.equal(req.qelos?.workspace?._id, 'ws-2');
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
  const mw = new QelosMiddleware({
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

  const req: AnyRequest = {
    headers: { cookie: 'q_access_token=stale; q_refresh_token=refresh-ok' },
    path: '/',
    url: '/',
  };

  await new Promise<void>((resolve, reject) => {
    void mw.use(req, {}, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  assert.equal(req.qelos?.user?._id, 'user-1');
  assert.equal(req.qelos?.tokens.accessToken, 'new-access');
  assert.equal(refreshed, true);
  assert.ok(meCalls >= 2);
});
