import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';

import { QelosMiddleware } from '../src/middleware';
import { normalizeModuleOptions } from '../src/module-options';
import type { AnyRequest } from '../src/types';

function jsonResponse(status: number, data: unknown): Response {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  const res = new Response(JSON.stringify(data), { status, headers });
  Object.defineProperty(res, 'ok', { value: status >= 200 && status < 300 });
  return res;
}

function jsonMeResponse(user: unknown, setCookies?: string[]): Response {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (setCookies) {
    for (const c of setCookies) {
      headers.append('set-cookie', c);
    }
  }
  const res = new Response(JSON.stringify(user), { status: 200, headers });
  Object.defineProperty(res, 'ok', { value: true });
  return res;
}

function createMockResponse(): {
  cookies: string[];
  setHeader: (name: string, value: string | string[]) => void;
  getHeader: () => undefined;
} {
  const cookies: string[] = [];
  return {
    cookies,
    setHeader(name: string, value: string | string[]) {
      if (name.toLowerCase() === 'set-cookie') {
        const vals = Array.isArray(value) ? value : [value];
        cookies.push(...vals);
      }
    },
    getHeader() {
      return undefined;
    },
  };
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
      return jsonMeResponse({ ...minimalUser, workspace: workspaceA });
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA]);
    }
    return jsonResponse(404, { error: 'not found' });
  };
}

test('QelosMiddleware attaches user, workspace, and workspaces', async () => {
  const mw = new QelosMiddleware(
    normalizeModuleOptions({
      appUrl: 'http://example.test',
      sdkOptions: { fetch: mockFetchOk() },
    }),
  );

  const req: AnyRequest = {
    headers: { cookie: 'session=opaque', host: 'example.test' },
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

test('forwards Set-Cookie from /api/me with Domain rewritten to inbound Host', async () => {
  const mw = new QelosMiddleware(
    normalizeModuleOptions({
      appUrl: 'http://example.test',
      sdkOptions: {
        fetch: async (input: RequestInfo) => {
          const url = String(input);
          if (url.includes('/api/me')) {
            return jsonMeResponse(
              { ...minimalUser, workspace: workspaceA },
              ['sid=x; Path=/; Domain=.qelos.app; HttpOnly'],
            );
          }
          if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
            return jsonResponse(200, [workspaceA]);
          }
          return jsonResponse(404, {});
        },
      },
    }),
  );

  const mockRes = createMockResponse();
  const req: AnyRequest = {
    headers: { cookie: 'session=opaque', host: 'app.example.test' },
    path: '/',
    url: '/',
  };

  await new Promise<void>((resolve, reject) => {
    void mw.use(req, mockRes, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  assert.ok(
    mockRes.cookies.some((c) => c.includes('Domain=app.example.test')),
    mockRes.cookies.join(' | '),
  );
});

test('anonymous request leaves user null when requireAuth is false', async () => {
  const mw = new QelosMiddleware(
    normalizeModuleOptions({
      appUrl: 'http://example.test',
      sdkOptions: {
        fetch: async () => jsonResponse(500, { error: 'should not call api' }),
      },
    }),
  );

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
  const mw = new QelosMiddleware(
    normalizeModuleOptions({
      appUrl: 'http://example.test',
      requireAuth: true,
      sdkOptions: {
        fetch: async () => jsonResponse(500, {}),
      },
    }),
  );

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
  const mw = new QelosMiddleware(
    normalizeModuleOptions({
      appUrl: 'http://example.test',
      skipPaths: ['/health'],
      sdkOptions: {
        fetch: async () => jsonResponse(500, { error: 'should not call' }),
      },
    }),
  );

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
      return jsonMeResponse({ ...minimalUser, workspace: workspaceA });
    }
    if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
      return jsonResponse(200, [workspaceA, wsB]);
    }
    return jsonResponse(404, {});
  };

  const mw2 = new QelosMiddleware(
    normalizeModuleOptions({
      config: {
        appUrl: 'http://example.test',
        sdkOptions: { fetch: mockFetchList },
      },
      resolveWorkspace: async ({ workspaces }) =>
        workspaces.find((w) => w._id === 'ws-2') ?? null,
    }),
  );

  const req: AnyRequest = {
    headers: { cookie: 'session=opaque' },
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

test('active workspace defaults to user.workspace, not workspaces[0]', async () => {
  const mw = new QelosMiddleware(
    normalizeModuleOptions({
      appUrl: 'http://example.test',
      sdkOptions: {
        fetch: async (input: RequestInfo) => {
          const url = String(input);
          if (url.includes('/api/me')) {
            return jsonMeResponse({
              ...minimalUser,
              workspace: null,
            } as IUser & { workspace: null });
          }
          if (url.includes('/api/workspaces') && !url.includes('/api/workspaces/')) {
            return jsonResponse(200, [workspaceA]);
          }
          return jsonResponse(404, {});
        },
      },
    }),
  );

  const req: AnyRequest = {
    headers: { cookie: 'session=opaque' },
    path: '/page',
    url: '/page',
  };

  await new Promise<void>((resolve, reject) => {
    void mw.use(req, {}, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  assert.equal(req.qelos?.workspace, null);
  assert.equal(req.qelos?.workspaces?.length, 1);
});
