import './../helpers/production-env';
import { beforeEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { setConfig } from '../../src/config';
import { verifyAccessToken, verifyCookieToken } from '../../src/authentication';
import { accessToken, secrets, tenantPayload, user } from '../helpers/tokens';

setConfig(secrets);

const fakeReply = () => {
  const headers: Record<string, string> = {};
  return { statusCode: 200, headers, header: (k: string, v: string) => (headers[k] = v) } as any;
};

describe('verifyAccessToken', () => {
  test('rejects a request without a bearer token', async () => {
    await assert.rejects(() => verifyAccessToken({ headers: {} } as any, fakeReply()), /authorization token was not provided/);
  });

  test('rejects an invalid token with status 407 and the x-q-auth header', async () => {
    const reply = fakeReply();
    await assert.rejects(() => verifyAccessToken({ headers: { authorization: 'Bearer nope' } } as any, reply), /authorization token was not valid/);
    assert.equal(reply.statusCode, 407);
    assert.equal(reply.headers['x-q-auth'], 'unauthorized');
  });

  test('rejects a token signed with another secret', async () => {
    const forged = accessToken(tenantPayload, 'another-secret');
    await assert.rejects(() => verifyAccessToken({ headers: { authorization: `Bearer ${forged}` } } as any, fakeReply()), /not valid/);
  });

  test('rejects an expired token', async () => {
    const expired = jwt.sign(tenantPayload, secrets.accessTokenSecret, { expiresIn: -10 });
    await assert.rejects(() => verifyAccessToken({ headers: { authorization: `Bearer ${expired}` } } as any, fakeReply()), /not valid/);
  });

  test('puts the tenant payload on the request and clears the user when there is no user header', async () => {
    const req: any = { headers: { authorization: `Bearer ${accessToken()}` } };
    await verifyAccessToken(req, fakeReply());
    assert.equal(req.tenantPayload.sub, tenantPayload.sub);
    assert.equal(req.user, null);
  });

  test('reads a base64 encoded user header', async () => {
    const req: any = { headers: { authorization: `Bearer ${accessToken()}`, user: Buffer.from(JSON.stringify(user)).toString('base64') } };
    await verifyAccessToken(req, fakeReply());
    assert.deepEqual(req.user, user);
  });

  test('still reads a plain JSON user header (backward compatibility)', async () => {
    const req: any = { headers: { authorization: `Bearer ${accessToken()}`, user: JSON.stringify(user) } };
    await verifyAccessToken(req, fakeReply());
    assert.deepEqual(req.user, user);
  });

  test('rejects (407) when the user header is neither base64 JSON nor JSON', async () => {
    const reply = fakeReply();
    await assert.rejects(() => verifyAccessToken({ headers: { authorization: `Bearer ${accessToken()}`, user: '%%%not-json%%%' } } as any, reply));
    assert.equal(reply.statusCode, 407);
  });
});

describe('verifyCookieToken', () => {
  const cookieToken = (data: object, secret = secrets.accessTokenSecret) => jwt.sign(data, secret, { expiresIn: '30min' });

  test('requires the code header', async () => {
    await assert.rejects(() => verifyCookieToken({ headers: {}, cookies: {} } as any), /authorization code was not provided/);
  });

  test('requires the cookie that belongs to that code', async () => {
    await assert.rejects(() => verifyCookieToken({ headers: { code: 'a1' }, cookies: { token_other: 'x' } } as any), /user is not authorized/);
  });

  test('rejects a cookie signed with another secret', async () => {
    const token = cookieToken({ user, tenant: tenantPayload }, 'another-secret');
    await assert.rejects(() => verifyCookieToken({ headers: { code: 'a1' }, cookies: { token_a1: token } } as any), /not valid/);
  });

  test('puts the tenant and the user from the cookie on the request', async () => {
    const req: any = { headers: { code: 'a1' }, cookies: { token_a1: cookieToken({ user, tenant: tenantPayload }) } };
    await verifyCookieToken(req);
    assert.deepEqual(req.user, user);
    assert.equal(req.tenantPayload.sub, tenantPayload.sub);
  });
});
