import assert from 'node:assert/strict';
import test from 'node:test';
import {
  __resetDefaultQelosConfig,
  getDefaultQelosConfig,
  loadQelosConfigFromEnv,
} from './env-config';

test('loadQelosConfigFromEnv reads QELOS_APP_URL', () => {
  const config = loadQelosConfigFromEnv({ QELOS_APP_URL: 'https://example.com' });
  assert.equal(config.appUrl, 'https://example.com');
  assert.equal(config.apiToken, undefined);
  assert.equal(config.requireAuth, undefined);
});

test('loadQelosConfigFromEnv parses optional fields', () => {
  const config = loadQelosConfigFromEnv({
    QELOS_APP_URL: 'https://example.com',
    QELOS_API_TOKEN: 'svc-token',
    QELOS_REQUIRE_AUTH: 'true',
    QELOS_SKIP_PATHS: '/_next, /favicon.ico,/api/_health',
    QELOS_DISABLE_PROXY: 'true',
  });
  assert.equal(config.appUrl, 'https://example.com');
  assert.equal(config.apiToken, 'svc-token');
  assert.equal(config.requireAuth, true);
  assert.equal(config.disableProxy, true);
  assert.deepEqual(config.skipPaths, ['/_next', '/favicon.ico', '/api/_health']);
});

test('loadQelosConfigFromEnv treats QELOS_REQUIRE_AUTH=false as anonymous-ok', () => {
  const config = loadQelosConfigFromEnv({
    QELOS_APP_URL: 'https://example.com',
    QELOS_REQUIRE_AUTH: 'false',
  });
  assert.equal(config.requireAuth, undefined);
});

test('loadQelosConfigFromEnv throws when QELOS_APP_URL is missing', () => {
  assert.throws(() => loadQelosConfigFromEnv({}), /QELOS_APP_URL is required/);
});

test('getDefaultQelosConfig memoizes', () => {
  __resetDefaultQelosConfig();
  const prev = process.env.QELOS_APP_URL;
  process.env.QELOS_APP_URL = 'https://example.com';
  try {
    const a = getDefaultQelosConfig();
    const b = getDefaultQelosConfig();
    assert.equal(a, b);
  } finally {
    if (prev === undefined) delete process.env.QELOS_APP_URL;
    else process.env.QELOS_APP_URL = prev;
    __resetDefaultQelosConfig();
  }
});
