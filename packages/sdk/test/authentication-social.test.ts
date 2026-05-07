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
