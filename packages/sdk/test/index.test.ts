import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import QelosSDK from '../src/index';
import { QelosSDKOptions } from '../src/types';

test('QelosSDK', async (t) => {
  let options: QelosSDKOptions;
  let sdk: QelosSDK;

  // Setup before each test
  const setup = () => {
    // Initialize SDK with mocked options
    options = {
      appUrl: 'http://localhost:3000',
      fetch: async () => {
        const res = new Response(JSON.stringify({ success: true }));
        res.headers.set('Content-Type', 'application/json');
        return res;
      },
      refreshToken: 'mock-refresh-token'
    };

    sdk = new QelosSDK(options);
  };

  await t.test('should initialize QelosSDK with all required properties', () => {
    setup();
    assert.ok(sdk);
    assert.ok(sdk.blocks);
    assert.ok(sdk.appConfigurations);
    assert.ok(sdk.authentication);
    assert.ok(sdk.workspaces);
    assert.ok(sdk.invites);
    assert.ok(sdk.blueprints);
  });

  await t.test('should set and remove custom headers', async () => {
    setup();
    // Mock the authentication.accessToken to prevent token-related errors
    Object.defineProperty(sdk.authentication, 'accessToken', {
      get: () => 'mock-access-token'
    });
    
    // Set a custom header
    sdk.setCustomHeader('x-test-header', 'test-value');
    
    // Test that the header is included in extraHeaders
    const headersWithCustom = await options.extraHeaders('/api/test');
    assert.equal(headersWithCustom['x-test-header'], 'test-value');

    // Remove the custom header
    sdk.removeCustomHeader('x-test-header');
    
    // Test that the header is no longer included
    const headersWithoutCustom = await options.extraHeaders('/api/test');
    assert.equal(headersWithoutCustom['x-test-header'], undefined);
  });

  await t.test('should not include authorization header for specific URLs', async () => {
    setup();
    // Test URLs that should not have authorization headers
    const noAuthUrls = [
      '/api/token/refresh',
      '/api/signin',
      '/api/signup'
    ];

    for (const url of noAuthUrls) {
      const headers = await options.extraHeaders(url);
      assert.equal(headers.authorization, undefined);
    }
  });

  await t.test('should include authorization header for regular URLs', async () => {
    setup();
    // Mock the authentication.accessToken
    Object.defineProperty(sdk.authentication, 'accessToken', {
      get: () => 'mock-access-token'
    });

    const headers = await options.extraHeaders('/api/regular-endpoint');
    assert.equal(headers.authorization, 'Bearer mock-access-token');
  });
});
