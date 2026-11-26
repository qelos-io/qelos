import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const saveMock = mock.fn(async () => {});
const getWorkspaceConfigurationMock = mock.fn();

class WorkspaceModel {
  constructor(data: any) {
    Object.assign(this, data);
  }
  save = saveMock;
}

mock.module('../../models/workspace', { defaultExport: WorkspaceModel });
mock.module('../../models/user', { defaultExport: {} });
mock.module('@qelos/api-kit', { namedExports: { emitPlatformEvent: mock.fn() } });
mock.module('../../services/logger', { defaultExport: { log: mock.fn(), error: mock.fn() } });
mock.module('../../services/tokens', {
  namedExports: { getSignedToken: mock.fn(), getUniqueId: mock.fn(), setCookie: mock.fn(), verifyToken: mock.fn() },
});
mock.module('../../services/users', {
  namedExports: { getCookieTokenName: mock.fn(), getCookieTokenValue: mock.fn(), updateToken: mock.fn() },
});
mock.module('../../services/req-host', { namedExports: { getRequestHost: mock.fn() } });
mock.module('../../services/workspace-configuration', { namedExports: { getWorkspaceConfiguration: getWorkspaceConfigurationMock } });
mock.module('../../services/encrypted-data', { namedExports: { getEncryptedData: mock.fn(), setEncryptedData: mock.fn() } });
mock.module('../../../config', { namedExports: { cookieTokenExpiration: 1 } });

describe('createWorkspace labels', async () => {
  const controller = await import('../workspace');
  const configuration = {
    creationPrivilegedRoles: [],
    allowNonLabeledWorkspaces: false,
    labels: [{ value: ['free'] }, { value: ['partner'], allowedRolesForCreation: ['sales'] }],
  };

  beforeEach(() => {
    saveMock.mock.resetCalls();
    getWorkspaceConfigurationMock.mock.mockImplementation(async () => configuration);
  });

  async function create(labels: string[], userPayload: any = { sub: 'u1', roles: ['user'] }) {
    const res: any = { status: mock.fn(() => res), json: mock.fn(() => res), end: mock.fn(() => res) };
    await controller.createWorkspace({ headers: { tenant: 't1' }, body: { name: 'W', labels }, userPayload } as any, res);
    return res.status.mock.calls[0].arguments[0];
  }

  it('should create a workspace of an option the user may choose', async () => {
    assert.equal(await create(['free']), 200);
    assert.equal(await create(['partner'], { sub: 'u1', roles: ['sales'] }), 200);
    assert.equal(saveMock.mock.calls.length, 2);
  });

  it('should refuse other labels and options of other roles', async () => {
    assert.equal(await create(['other']), 400);
    assert.equal(await create(['partner']), 400);
    assert.equal(saveMock.mock.calls.length, 0);
  });

  it('should not limit a privileged user to the options of their roles', async () => {
    assert.equal(await create(['partner'], { sub: 'a1', roles: ['admin'], isPrivileged: true }), 200);
  });
});
