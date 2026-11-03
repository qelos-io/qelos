import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { beforeEach, describe, it, mock } from 'node:test';

const require = createRequire(import.meta.url);

const user = { _id: 'u1', tenant: 't1', roles: ['user'] };
const authenticateMock = mock.fn(async (): Promise<any> => ({ user, workspace: null }));
const getWorkspaceMock = mock.fn(async (..._args: any[]): Promise<any> => ({ _id: 'w1', name: 'ws', roles: ['admin'], labels: [] }));

mock.module('../../services/api-tokens', {
  namedExports: { authenticateByApiToken: authenticateMock },
});
mock.module('../../services/workspaces', {
  namedExports: { getWorkspaceForUser: getWorkspaceMock },
});

const verifyUser = require('../verify-user').default;

function createRes() {
  const res: any = { statusCode: 200 };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = () => res;
  res.end = () => res;
  return res;
}

function createReq(extra: Record<string, string> = {}): any {
  const headers: Record<string, string> = { tenant: 't1', 'x-api-key': 'ql_token', ...extra };
  return { cookies: {}, signedCookies: {}, headers, get: (name: string) => headers[name.toLowerCase()] };
}

describe('verifyUser - x-workspace header with api token', () => {
  beforeEach(() => {
    authenticateMock.mock.resetCalls();
    getWorkspaceMock.mock.resetCalls();
    authenticateMock.mock.mockImplementation(async () => ({ user, workspace: null }));
    getWorkspaceMock.mock.mockImplementation(async () => ({ _id: 'w1', name: 'ws', roles: ['admin'], labels: [] }));
  });

  it('sets the active workspace when the token has none and the user is a member', async () => {
    const req = createReq({ 'x-workspace': 'w1' });
    let nextCalled = false;
    await verifyUser(req, createRes(), () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.deepEqual(getWorkspaceMock.mock.calls[0].arguments, ['t1', 'u1', 'w1']);
    assert.equal(req.activeWorkspace._id, 'w1');
  });

  it('responds 403 when the user is not a member of the workspace', async () => {
    getWorkspaceMock.mock.mockImplementation(async () => { throw new Error('not a member'); });
    const req = createReq({ 'x-workspace': 'w1' });
    const res = createRes();
    let nextCalled = false;
    await verifyUser(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  it('ignores the header when the token is bound to a workspace', async () => {
    authenticateMock.mock.mockImplementation(async () => ({ user, workspace: { _id: 'bound', name: 'b', roles: [], labels: [] } }));
    const req = createReq({ 'x-workspace': 'w1' });
    await verifyUser(req, createRes(), () => {});

    assert.equal(getWorkspaceMock.mock.callCount(), 0);
    assert.equal(req.activeWorkspace._id, 'bound');
  });

  it('leaves workspace unset when no header is sent', async () => {
    const req = createReq();
    await verifyUser(req, createRes(), () => {});

    assert.equal(getWorkspaceMock.mock.callCount(), 0);
    assert.equal(req.activeWorkspace, undefined);
  });
});
