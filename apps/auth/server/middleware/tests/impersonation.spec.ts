import { getExpressResMock } from '../../../mocks/express-res.mock';

async function getAsyncHandleImpersonation() {
  const module = await import('../impersonation');
  return module.handleImpersonation;
}

describe('handleImpersonation middleware', () => {
  let handleImpersonation: Awaited<ReturnType<typeof getAsyncHandleImpersonation>>;
  let usersService: typeof import('../../services/users');
  let workspacesService: typeof import('../../services/workspaces');

  beforeEach(async () => {
    jest.mock('../../services/users');
    jest.mock('../../services/workspaces');
    usersService = await import('../../services/users');
    workspacesService = await import('../../services/workspaces');
    handleImpersonation = await getAsyncHandleImpersonation();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('When user is not privileged', () => {
    it('should call next without impersonation', async () => {
      const req: any = {
        userPayload: { isPrivileged: false, sub: 'user-1' },
        get: jest.fn().mockReturnValue(null),
      };
      const resMock = getExpressResMock();
      const nextMock = jest.fn();

      await handleImpersonation(req, resMock as any, nextMock);

      expect(nextMock).toBeCalled();
      expect(req.userPayload.sub).toBe('user-1');
    });
  });

  describe('When userPayload is missing', () => {
    it('should call next without impersonation', async () => {
      const req: any = {
        userPayload: null,
        get: jest.fn().mockReturnValue('some-user-id'),
      };
      const resMock = getExpressResMock();
      const nextMock = jest.fn();

      await handleImpersonation(req, resMock as any, nextMock);

      expect(nextMock).toBeCalled();
    });
  });

  describe('When x-impersonate-user header is missing', () => {
    it('should call next without impersonation', async () => {
      const req: any = {
        userPayload: { isPrivileged: true, sub: 'admin-1' },
        get: jest.fn().mockReturnValue(null),
      };
      const resMock = getExpressResMock();
      const nextMock = jest.fn();

      await handleImpersonation(req, resMock as any, nextMock);

      expect(nextMock).toBeCalled();
      expect(req.userPayload.sub).toBe('admin-1');
    });
  });

  describe('When privileged user impersonates another user', () => {
    it('should replace userPayload with impersonated user data', async () => {
      const impersonatedUser: any = {
        _id: { toString: () => 'impersonated-user-id' },
        username: 'impersonated',
        email: 'impersonated@example.com',
        phone: '555-1234',
        fullName: 'Impersonated User',
        firstName: 'Impersonated',
        lastName: 'User',
        birthDate: '1990-01-01',
        profileImage: 'img.png',
        roles: ['user'],
      };

      (usersService.getUser as any).mockResolvedValue(impersonatedUser);

      const req: any = {
        userPayload: {
          isPrivileged: true,
          sub: 'admin-1',
          tenant: 'tenant-1',
        },
        headers: { tenant: 'tenant-1' },
        get: jest.fn().mockImplementation((header: string) => {
          if (header === 'x-impersonate-user') return 'impersonated-user-id';
          if (header === 'x-impersonate-workspace') return null;
          return null;
        }),
      };
      const resMock = getExpressResMock();
      const nextMock = jest.fn();

      await handleImpersonation(req, resMock as any, nextMock);

      expect(nextMock).toBeCalled();
      expect(req.userPayload.sub).toBe('impersonated-user-id');
      expect(req.userPayload.isImpersonating).toBe(true);
      expect(req.userPayload.originalAdminId).toBe('admin-1');
      expect(req.userPayload.isPrivileged).toBe(true);
      expect(req.originalUserPayload.sub).toBe('admin-1');
    });

    it('should include workspace context when x-impersonate-workspace is set', async () => {
      const impersonatedUser: any = {
        _id: { toString: () => 'impersonated-user-id' },
        username: 'impersonated',
        email: 'impersonated@example.com',
        fullName: 'Impersonated User',
        firstName: 'Impersonated',
        lastName: 'User',
        roles: ['user'],
      };

      const mockWorkspace: any = {
        _id: 'workspace-1',
        name: 'Test Workspace',
        members: [{ roles: ['editor'] }],
        labels: ['label1'],
      };

      (usersService.getUser as any).mockResolvedValue(impersonatedUser);
      (workspacesService.getWorkspaceForUser as any).mockResolvedValue(mockWorkspace);

      const req: any = {
        userPayload: {
          isPrivileged: true,
          sub: 'admin-1',
          tenant: 'tenant-1',
        },
        headers: { tenant: 'tenant-1' },
        get: jest.fn().mockImplementation((header: string) => {
          if (header === 'x-impersonate-user') return 'impersonated-user-id';
          if (header === 'x-impersonate-workspace') return 'workspace-1';
          return null;
        }),
      };
      const resMock = getExpressResMock();
      const nextMock = jest.fn();

      await handleImpersonation(req, resMock as any, nextMock);

      expect(nextMock).toBeCalled();
      expect(req.userPayload.workspace).toEqual({
        _id: 'workspace-1',
        name: 'Test Workspace',
        roles: ['editor'],
        labels: ['label1'],
      });
    });
  });

  describe('When impersonation fails due to service error', () => {
    it('should respond with 500', async () => {
      (usersService.getUser as any).mockRejectedValue(new Error('DB error'));

      const req: any = {
        userPayload: {
          isPrivileged: true,
          sub: 'admin-1',
          tenant: 'tenant-1',
        },
        headers: { tenant: 'tenant-1' },
        get: jest.fn().mockImplementation((header: string) => {
          if (header === 'x-impersonate-user') return 'impersonated-user-id';
          return null;
        }),
      };
      const resMock = getExpressResMock();
      const nextMock = jest.fn();

      await handleImpersonation(req, resMock as any, nextMock);

      expect(resMock.status).toBeCalledWith(500);
      expect(resMock.json).toBeCalled();
      expect(resMock.end).toBeCalled();
      expect(nextMock).not.toBeCalled();
    });
  });
});
