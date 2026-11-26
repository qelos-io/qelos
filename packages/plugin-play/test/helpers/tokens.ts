import jwt from 'jsonwebtoken';

export const secrets = {
  accessTokenSecret: 'test-access-secret',
  refreshTokenSecret: 'test-refresh-secret',
  userPayloadSecret: 'test-user-payload-secret',
};

export const tenantPayload = { sub: 'tenant-1', identifier: 'abc123' };
export const user = { _id: 'user-9', username: 'ada@example.com', email: 'ada@example.com', firstName: 'Ada', lastName: 'L', roles: ['user'] };

export const accessToken = (payload: object = tenantPayload, secret = secrets.accessTokenSecret) => jwt.sign(payload, secret, { expiresIn: '1h' });
export const refreshToken = (payload: object = tenantPayload, secret = secrets.refreshTokenSecret) => jwt.sign(payload, secret, { expiresIn: '1h' });

/** Headers a Qelos gateway would send to a proxy endpoint: the bearer token and the (base64 encoded) user. */
export const proxyHeaders = (extra: Record<string, string> = {}, u: object = user) => ({
  authorization: `Bearer ${accessToken()}`,
  user: Buffer.from(JSON.stringify(u)).toString('base64'),
  ...extra,
});
