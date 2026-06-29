import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readTokensFromEvent,
  normalizeIntegratorConfig,
} from './request-parse.js';

test('readTokensFromEvent prefers Authorization bearer over cookie token', () => {
  const event = {
    headers: {
      authorization: 'Bearer from-header',
      cookie: 'q_access_token=from-cookie',
    },
  };
  const config = normalizeIntegratorConfig({
    appUrl: 'http://localhost',
  });
  const tokens = readTokensFromEvent(event, config);
  assert.equal(tokens.accessToken, 'from-header');
});

test('readTokensFromEvent reads refresh cookie', () => {
  const event = {
    headers: {
      cookie: 'q_refresh_token=abc; q_access_token=def',
    },
  };
  const config = normalizeIntegratorConfig({ appUrl: 'http://localhost' });
  const tokens = readTokensFromEvent(event, config);
  assert.equal(tokens.accessToken, 'def');
  assert.equal(tokens.refreshToken, 'abc');
});
