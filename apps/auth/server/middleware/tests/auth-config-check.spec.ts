import { getExpressResMock } from '../../../mocks/express-res.mock';

async function getAsyncAuthConfigCheck() {
  const module = await import('../auth-config-check');
  return module.authConfigCheck;
}

describe('authConfigCheck middleware', () => {
  let authConfigCheck: Awaited<ReturnType<typeof getAsyncAuthConfigCheck>>;
  let authConfiguration: typeof import('../../services/auth-configuration');

  beforeEach(async () => {
    jest.mock('../../services/auth-configuration');
    authConfiguration = await import('../../services/auth-configuration');
    authConfigCheck = await getAsyncAuthConfigCheck();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('When auth configuration exists for tenant', () => {
    it('should set authConfig on request and call next', async () => {
      const mockConfig = {
        treatUsernameAs: 'email',
        showLoginPage: true,
        showRegisterPage: false,
      };
      (authConfiguration.getAuthConfiguration as any).mockResolvedValue(mockConfig);

      const req: any = {
        headers: { tenant: 'tenant-1' },
      };
      const resMock = getExpressResMock();
      const nextMock = jest.fn();

      await authConfigCheck(req, resMock as any, nextMock);

      expect(authConfiguration.getAuthConfiguration).toBeCalledWith('tenant-1');
      expect(req.authConfig).toEqual(mockConfig);
      expect(nextMock).toBeCalled();
    });
  });

  describe('When auth configuration does not exist for tenant', () => {
    it('should respond with 403', async () => {
      (authConfiguration.getAuthConfiguration as any).mockResolvedValue(null);

      const req: any = {
        headers: { tenant: 'unknown-tenant' },
      };
      const resMock = getExpressResMock();
      const nextMock = jest.fn();

      await authConfigCheck(req, resMock as any, nextMock);

      expect(resMock.status).toBeCalledWith(403);
      expect(resMock.json).toBeCalledWith({ message: 'tenant auth config does not exist' });
      expect(resMock.end).toBeCalled();
      expect(nextMock).not.toBeCalled();
    });
  });

  describe('When auth configuration returns undefined', () => {
    it('should respond with 403', async () => {
      (authConfiguration.getAuthConfiguration as any).mockResolvedValue(undefined);

      const req: any = {
        headers: { tenant: 'tenant-1' },
      };
      const resMock = getExpressResMock();
      const nextMock = jest.fn();

      await authConfigCheck(req, resMock as any, nextMock);

      expect(resMock.status).toBeCalledWith(403);
      expect(nextMock).not.toBeCalled();
    });
  });
});
