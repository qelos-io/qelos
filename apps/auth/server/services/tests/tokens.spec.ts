import jwt from 'jsonwebtoken';
import { verifyToken, verifyRefreshToken, getUniqueId, getSignedToken, setCookie } from '../tokens';

const jwtSecret = 'abcddddd';
const refreshTokenSecret = 'a secret 2 phrase!!';

describe('tokens service', () => {
  describe('verifyToken', () => {
    it('should resolve with decoded payload for a valid token', async () => {
      const payload = { sub: 'user-1', tenant: 'tenant-1', name: 'Test' };
      const token = jwt.sign(payload, jwtSecret);

      const decoded = await verifyToken(token, 'tenant-1') as any;

      expect(decoded.sub).toBe('user-1');
      expect(decoded.tenant).toBe('tenant-1');
      expect(decoded.name).toBe('Test');
    });

    it('should reject for an invalid token', async () => {
      await expect(verifyToken('invalid-token', 'tenant-1')).rejects.toBeDefined();
    });

    it('should reject for a token with wrong tenant', async () => {
      const payload = { sub: 'user-1', tenant: 'tenant-1', name: 'Test' };
      const token = jwt.sign(payload, jwtSecret);

      await expect(verifyToken(token, 'wrong-tenant')).rejects.toBeDefined();
    });

    it('should reject for an empty token', async () => {
      await expect(verifyToken('', 'tenant-1')).rejects.toBeUndefined();
    });

    it('should reject for a whitespace-only token', async () => {
      await expect(verifyToken('   ', 'tenant-1')).rejects.toBeUndefined();
    });

    it('should reject for a token signed with a different secret', async () => {
      const payload = { sub: 'user-1', tenant: 'tenant-1' };
      const token = jwt.sign(payload, 'wrong-secret');

      await expect(verifyToken(token, 'tenant-1')).rejects.toBeDefined();
    });

    it('should reject for an expired token', async () => {
      const payload = { sub: 'user-1', tenant: 'tenant-1' };
      const token = jwt.sign(payload, jwtSecret, { expiresIn: '0s' });

      await new Promise(resolve => setTimeout(resolve, 10));
      await expect(verifyToken(token, 'tenant-1')).rejects.toBeDefined();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should resolve with decoded payload for a valid refresh token', async () => {
      const payload = { sub: 'user-1', tenant: 'tenant-1' };
      const token = jwt.sign(payload, refreshTokenSecret);

      const decoded = await verifyRefreshToken(token, 'tenant-1') as any;

      expect(decoded.sub).toBe('user-1');
      expect(decoded.tenant).toBe('tenant-1');
    });

    it('should reject for a token signed with jwt secret instead of refresh secret', async () => {
      const payload = { sub: 'user-1', tenant: 'tenant-1' };
      const token = jwt.sign(payload, jwtSecret);

      await expect(verifyRefreshToken(token, 'tenant-1')).rejects.toBeDefined();
    });

    it('should reject when tenant does not match', async () => {
      const payload = { sub: 'user-1', tenant: 'tenant-1' };
      const token = jwt.sign(payload, refreshTokenSecret);

      await expect(verifyRefreshToken(token, 'tenant-2')).rejects.toBeDefined();
    });
  });

  describe('getUniqueId', () => {
    it('should return a string containing a colon separator', () => {
      const id = getUniqueId();
      expect(id).toContain(':');
    });

    it('should return unique ids on successive calls', () => {
      const id1 = getUniqueId();
      const id2 = getUniqueId();
      expect(id1).not.toBe(id2);
    });

    it('should use provided creationTime as prefix', () => {
      const id = getUniqueId('1234567890');
      expect(id.startsWith('1234567890:')).toBe(true);
    });

    it('should default to current timestamp as prefix', () => {
      const before = Date.now().toString();
      const id = getUniqueId();
      const prefix = id.split(':')[0];
      const after = Date.now().toString();
      expect(Number(prefix)).toBeGreaterThanOrEqual(Number(before));
      expect(Number(prefix)).toBeLessThanOrEqual(Number(after));
    });
  });

  describe('getSignedToken', () => {
    const mockUser = {
      _id: 'user-123',
      tenant: 'tenant-1',
      username: 'testuser',
      email: 'test@example.com',
      phone: '555-1234',
      name: 'Test User',
      fullName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      roles: ['user'],
      profileImage: 'image.png',
    };

    it('should return a token and payload', () => {
      const result = getSignedToken(mockUser, null, 'token-id-1');

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.payload).toBeDefined();
      expect(result.payload.sub).toBe('user-123');
      expect(result.payload.tenant).toBe('tenant-1');
    });

    it('should produce a valid JWT token', () => {
      const result = getSignedToken(mockUser, null, 'token-id-1');
      const decoded = jwt.verify(result.token, jwtSecret) as any;

      expect(decoded.sub).toBe('user-123');
      expect(decoded.tenant).toBe('tenant-1');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should include tokenIdentifier in the payload when provided', () => {
      const result = getSignedToken(mockUser, null, 'my-token-id');
      const decoded = jwt.verify(result.token, jwtSecret) as any;

      expect(decoded.tokenIdentifier).toBe('my-token-id');
    });

    it('should include workspace in the payload when provided', () => {
      const workspace = { _id: 'ws-1', name: 'My Workspace', roles: ['admin'] };
      const result = getSignedToken(mockUser, workspace, 'token-id-1');

      expect(result.payload.workspace).toBeDefined();
      expect(result.payload.workspace._id).toBe('ws-1');
    });

    it('should encode workspace name with special characters', () => {
      const workspace = { _id: 'ws-1', name: 'My Workspace / Special & Name', roles: ['admin'] };
      const result = getSignedToken(mockUser, workspace, 'token-id-1');

      expect(result.payload.workspace.name).toBe(encodeURIComponent('My Workspace / Special & Name'));
    });

    it('should encode user name with special characters', () => {
      const user = { ...mockUser, name: 'José García' };
      const result = getSignedToken(user, null, 'token-id-1');

      expect(result.payload.name).toBe(encodeURIComponent('José García'));
    });

    it('should not include workspace when it is null', () => {
      const result = getSignedToken(mockUser, null, 'token-id-1');
      expect(result.payload.workspace).toBeUndefined();
    });

    it('should use custom expiresIn when provided', () => {
      const result = getSignedToken(mockUser, null, 'token-id-1', '1h');
      const decoded = jwt.verify(result.token, jwtSecret) as any;

      expect(decoded.exp - decoded.iat).toBe(3600);
    });
  });

  describe('setCookie', () => {
    it('should call res.cookie with correct parameters', () => {
      const resMock: any = { cookie: jest.fn() };
      setCookie(resMock, 'my-cookie', 'cookie-value');

      expect(resMock.cookie).toBeCalled();
      expect(resMock.cookie.mock.calls[0][0]).toBe('my-cookie');
      expect(resMock.cookie.mock.calls[0][1]).toBe('cookie-value');
    });

    it('should set httpOnly and path in cookie parameters', () => {
      const resMock: any = { cookie: jest.fn() };
      setCookie(resMock, 'my-cookie', 'value');

      const params = resMock.cookie.mock.calls[0][2];
      expect(params.httpOnly).toBe(true);
      expect(params.path).toBe('/api');
    });

    it('should set domain, sameSite and secure when domain is provided', () => {
      const resMock: any = { cookie: jest.fn() };
      setCookie(resMock, 'my-cookie', 'value', null, 'example.com');

      const params = resMock.cookie.mock.calls[0][2];
      expect(params.domain).toBe('example.com');
      expect(params.sameSite).toBe('None');
      expect(params.secure).toBe(true);
    });

    it('should return the response object for chaining', () => {
      const resMock: any = { cookie: jest.fn() };
      const result = setCookie(resMock, 'my-cookie', 'value');

      expect(result).toBe(resMock);
    });
  });
});
