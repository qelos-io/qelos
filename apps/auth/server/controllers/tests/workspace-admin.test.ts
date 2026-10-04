import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const findOneMock = mock.fn();

mock.module('../../models/workspace', {
  defaultExport: { findOne: findOneMock },
});
mock.module('../../models/user', { defaultExport: {} });
mock.module('@qelos/api-kit', { namedExports: { emitPlatformEvent: mock.fn() } });
mock.module('../../services/logger', { defaultExport: { log: mock.fn(), error: mock.fn() } });
mock.module('../../services/tokens', {
  namedExports: {
    getSignedToken: mock.fn(), getUniqueId: mock.fn(), setCookie: mock.fn(), verifyToken: mock.fn(),
  },
});
mock.module('../../services/users', {
  namedExports: { getCookieTokenName: mock.fn(), getCookieTokenValue: mock.fn(), updateToken: mock.fn() },
});
mock.module('../../services/req-host', { namedExports: { getRequestHost: mock.fn() } });
mock.module('../../services/workspace-configuration', { namedExports: { getWorkspaceConfiguration: mock.fn() } });
mock.module('../../services/encrypted-data', { namedExports: { getEncryptedData: mock.fn(), setEncryptedData: mock.fn() } });
mock.module('../../../config', { namedExports: { cookieTokenExpiration: 1 } });

function mockRes() {
  const res: any = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  res.end = mock.fn(() => res);
  return res;
}

describe('workspace admin controllers', async () => {
  const controller = await import('../workspace');

  beforeEach(() => findOneMock.mock.resetCalls());

  describe('deleteWorkspaceMember', () => {
    it('should look the member up only inside the workspace from the URL', async () => {
      const workspace = { members: [{ user: 'u1' }, { user: 'u2' }], save: mock.fn(async () => {}) };
      findOneMock.mock.mockImplementationOnce(() => ({ exec: async () => workspace }));
      const res = mockRes();

      await controller.deleteWorkspaceMember(
        { headers: { tenant: 't1' }, params: { workspaceId: 'w1', userId: 'u2' } } as any, res);

      assert.deepEqual(findOneMock.mock.calls[0].arguments[0], { tenant: 't1', _id: 'w1', 'members.user': 'u2' });
      assert.deepEqual(workspace.members.map((m) => m.user), ['u1']);
      assert.equal(workspace.save.mock.calls.length, 1);
    });

    it('should return 404 when the user is not a member of that workspace', async () => {
      findOneMock.mock.mockImplementationOnce(() => ({ exec: async () => null }));
      const res = mockRes();

      await controller.deleteWorkspaceMember(
        { headers: { tenant: 't1' }, params: { workspaceId: 'w1', userId: 'u2' } } as any, res);

      assert.equal(res.status.mock.calls[0].arguments[0], 404);
    });
  });

  describe('updateWorkspace', () => {
    const run = async (body: any, workspace: any) => {
      const res = mockRes();
      await controller.updateWorkspace({ body, workspace, userPayload: {} } as any, res);
      return res;
    };

    it('should clear the logo when an empty string is sent', async () => {
      const workspace: any = { logo: 'http://logo', save: mock.fn(async () => {}) };
      await run({ logo: '' }, workspace);
      assert.equal(workspace.logo, '');
    });

    it('should keep the logo when it is not part of the request', async () => {
      const workspace: any = { logo: 'http://logo', save: mock.fn(async () => {}) };
      await run({ name: 'New' }, workspace);
      assert.equal(workspace.logo, 'http://logo');
      assert.equal(workspace.name, 'New');
    });
  });
});
