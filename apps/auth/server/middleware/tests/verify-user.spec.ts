async function getAsyncVerifyUser() {
  const module = await import('../verify-user');
  return module.default;
}

describe('Auth Check middlewares - verifyUser', () => {
  let verifyUser: Awaited<ReturnType<typeof getAsyncVerifyUser>>;
  let tokens: typeof import('../../services/tokens');

  beforeEach(async () => {
    jest.mock('../../services/tokens');
    tokens = await import('../../services/tokens');

    verifyUser = await getAsyncVerifyUser();
  })

  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllMocks()
    jest.resetModules()
  })

  describe('When get request without any authorization', () => {
    test('should trigger next middleware', async () => {
      const req = {
        cookies: {},
        signedCookies: {},
        headers: {
          tenant: 'tenant-1',
        },
      };
      const res = {};
      const next = jest.fn();

      await verifyUser(req as any, res as any, next);

      expect(next).toBeCalled();
      expect(next.mock.calls.length).toBe(1);

      // next function should be called with not arguments
      expect(next.mock.calls[0][0]).toBeUndefined();
    })
  })

  describe('When get request with authorization header', () => {
    test('should check token and tenant using verifyToken', async () => {
      const req = {
        cookies: {},
        signedCookies: {},
        headers: {
          tenant: 'tenant-1',
          authorization: 'Bearer token-value',
        }
      };
      const res = {};
      const next = jest.fn();
      expect(tokens.verifyToken).not.toBeCalled();

      await verifyUser(req as any, res as any, next);

      expect(tokens.verifyToken).toBeCalled();
    })

    test('should trigger next middleware', async () => {
      const req = {
        cookies: {},
        signedCookies: {},
        headers: {
          tenant: 'tenant-1',
          authorization: 'Bearer token-value',
        }
      };
      const res = {};
      const next = jest.fn();
      expect(next).not.toBeCalled();

      (tokens.verifyToken as ReturnType<typeof jest.fn>).mockImplementation(async () => {
        return null;
      })

      await verifyUser(req as any, res as any, next);

      expect(next).toBeCalled();
    })

    test('should set payload on request when token is verified', async () => {
      const req = {
        userPayload: null,
        cookies: {},
        signedCookies: {},
        headers: {
          tenant: 'tenant-1',
          authorization: 'Bearer valid-token',
        }
      };
      const res = {};
      const userPayload = {
        user: 'demo',
        roles: ['admin'],
        workspace: 'workspace-1',
      };
      const next = jest.fn();
      expect(next).not.toBeCalled();
      (tokens.verifyToken as any as ReturnType<typeof jest.fn>).mockImplementation(async () => {
        return userPayload
      });

      await verifyUser(req as any, res as any, next);

      expect(req.userPayload).toEqual(userPayload);
    })

    test('should set isPrivileged as TRUE on request when token is verified', async () => {
      const req = {
        userPayload: null,
        isPrivileged: null,
        cookies: {},
        signedCookies: {},
        headers: {
          tenant: 'tenant-1',
          authorization: 'Bearer valid-token',
        }
      };
      const res = {};
      const userPayload = {
        user: 'demo',
        roles: ['admin'],
        workspace: 'workspace-1',
      };
      const next = jest.fn();
      expect(next).not.toBeCalled();
      (tokens.verifyToken as any as ReturnType<typeof jest.fn>).mockImplementation(async () => {
        return userPayload
      });

      await verifyUser(req as any, res as any, next);

      expect(req.userPayload.isPrivileged).toEqual(true);
    })

    test('should set isPrivileged as FALSE on request when token is verified', async () => {
      const req = {
        userPayload: null,
        isPrivileged: null,
        cookies: {},
        signedCookies: {},
        headers: {
          tenant: 'tenant-1',
          authorization: 'Bearer valid-token',
        }
      };
      const res = {};
      const userPayload = {
        user: 'demo',
        roles: ['user'],
        workspace: 'workspace-1',
      };
      const next = jest.fn();
      expect(next).not.toBeCalled();
      (tokens.verifyToken as any as ReturnType<typeof jest.fn>).mockImplementation(async () => {
        return userPayload
      });

      await verifyUser(req as any, res as any, next);

      expect(req.userPayload.isPrivileged).toEqual(false);
    })

    test('should set activeWorkspace on request when token is verified', async () => {
      const req = {
        userPayload: null,
        activeWorkspace: null,
        cookies: {},
        signedCookies: {},
        headers: {
          tenant: 'tenant-1',
          authorization: 'Bearer valid-token',
        }
      };
      const res = {};
      const userPayload = {
        user: 'demo',
        roles: ['admin'],
        workspace: 'workspace-1',
      };
      const next = jest.fn();
      expect(next).not.toBeCalled();
      (tokens.verifyToken as any as ReturnType<typeof jest.fn>).mockImplementation(async () => {
        return userPayload
      });

      await verifyUser(req as any, res as any, next);

      expect(req.activeWorkspace).toEqual('workspace-1');
    })
  })

  describe('When get request with cookie', () => {
    test('should trigger next middleware', async () => {
      const req = {
        cookies: {
          token: 'cookie-token'
        },
        signedCookies: {},
        headers: {
          tenant: 'tenant-1',
        }
      };
      const res = {};
      const next = jest.fn();
      expect(next).not.toBeCalled();
      (tokens.verifyToken as any as ReturnType<typeof jest.fn>).mockImplementation(async () => {
        return null
      });

      try {
        await verifyUser(req as any, res as any, next);
      } catch {
        // ignore
      }

      expect(next).toBeCalled();
    })
  })
});
