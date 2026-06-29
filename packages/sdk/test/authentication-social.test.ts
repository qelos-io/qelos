import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SocialAuthCallbackPayload } from '../src/authentication';
import {
  parseSocialCallbackRefreshToken,
  getSocialAuthSetCookieParts,
} from '../src/authentication';

test('parseSocialCallbackRefreshToken', async (t) => {
  await t.test('parses full URL and path-only string', () => {
    assert.equal(
      parseSocialCallbackRefreshToken('https://app.example/api/cb?rt=abc&x=1'),
      'abc',
    );
    assert.equal(parseSocialCallbackRefreshToken('/cb?rt=xyz'), 'xyz');
  });

  await t.test('parses URL / URLSearchParams / query objects', () => {
    assert.equal(parseSocialCallbackRefreshToken(new URL('http://_/p?rt=u')), 'u');
    assert.equal(parseSocialCallbackRefreshToken(new URLSearchParams('rt=v')), 'v');
    assert.equal(parseSocialCallbackRefreshToken({ rt: 'w' }), 'w');
    assert.equal(parseSocialCallbackRefreshToken({ rt: ['z'] }), 'z');
  });

  await t.test('returns undefined when rt missing', () => {
    assert.equal(parseSocialCallbackRefreshToken('/no-query'), undefined);
    assert.equal(parseSocialCallbackRefreshToken({}), undefined);
  });
});

test('getSocialLoginUrl', async (t) => {
  const { default: QelosSDK } = await import('../src/index');

  await t.test('builds provider URL with state, returnUrl, and redirectUrl', () => {
    const sdk = new QelosSDK({ appUrl: 'https://gateway.example.com' });
    const url = sdk.authentication.getSocialLoginUrl('google', {
      state: 'csrf-1',
      returnUrl: 'https://app.example.com/auth/finish',
      redirectUrl: 'https://app.example.com',
    });
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://gateway.example.com');
    assert.equal(parsed.pathname, '/api/auth/google');
    assert.equal(parsed.searchParams.get('state'), 'csrf-1');
    assert.equal(parsed.searchParams.get('returnUrl'), 'https://app.example.com/auth/finish');
    assert.equal(parsed.searchParams.get('redirectUrl'), 'https://app.example.com');
  });

  await t.test('omits query string when no options', () => {
    const sdk = new QelosSDK({ appUrl: 'http://localhost:3000' });
    assert.equal(sdk.authentication.getSocialLoginUrl('github'), 'http://localhost:3000/api/auth/github');
  });
});

test('getSocialAuthSetCookieParts', async (t) => {
  await t.test('prefers setCookieHeaders array', () => {
    const r = {
      payload: { user: {} },
      headers: { 'set-cookie': 'a=1' },
      setCookieHeaders: ['a=1', 'b=2'],
    } as SocialAuthCallbackPayload;
    assert.deepEqual(getSocialAuthSetCookieParts(r), ['a=1', 'b=2']);
  });

  await t.test('falls back to single header', () => {
    const r = {
      payload: { user: {} },
      headers: { 'set-cookie': 'x=9' },
    } as SocialAuthCallbackPayload;
    assert.deepEqual(getSocialAuthSetCookieParts(r), ['x=9']);
  });
});
