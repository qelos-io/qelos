import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import BaseSDK from '../src/base-sdk';
import { QelosSDKOptions } from '../src/types';

test('BaseSDK', async (t) => {
  let options: QelosSDKOptions;
  let sdk: BaseSDK;
  let fetchCalls: Array<[string, RequestInit]> = [];

  // Setup before each test
  const setup = () => {
    fetchCalls = [];
    // Initialize SDK with mocked fetch function
    options = {
      appUrl: 'http://localhost:3000',
      fetch: async (url, init) => {
        fetchCalls.push([url.toString(), init]);
        const res = new Response(JSON.stringify({ success: true }));
        res.headers.set('Content-Type', 'application/json');
        return res;
      },
      extraHeaders: async () => ({
        'x-test-header': 'test-value'
      })
    };

    sdk = new BaseSDK(options);
  };

  await t.test('should normalize appUrl by removing trailing slash', () => {
    setup();
    const optionsWithTrailingSlash = {
      ...options,
      appUrl: 'http://localhost:3000/'
    };
    const sdkWithTrailingSlash = new BaseSDK(optionsWithTrailingSlash);
    
    return sdkWithTrailingSlash.callApi('/test').then(() => {
      assert.equal(fetchCalls[0][0], 'http://localhost:3000/test');
    });
  });

  await t.test('should call API with correct URL and headers', () => {
    setup();
    return sdk.callApi('/test').then(() => {
      assert.equal(fetchCalls[0][0], 'http://localhost:3000/test');
      assert.equal(fetchCalls[0][1].headers['x-test-header'], 'test-value');
    });
  });

  await t.test('should parse JSON response correctly', () => {
    setup();
    return sdk.callJsonApi('/test').then(data => {
      assert.deepEqual(data, { success: true });
    });
  });

  await t.test('should handle query parameters correctly', () => {
    setup();
    const params = { foo: 'bar', baz: 'qux' };
    const queryString = sdk.getQueryParams(params);
    assert.equal(queryString, '?foo=bar&baz=qux');
  });

  await t.test('should handle empty query parameters', () => {
    setup();
    const queryString = sdk.getQueryParams();
    assert.equal(queryString, '');
  });

  await t.test('should handle extraQueryParams option', () => {
    setup();
    options.extraQueryParams = () => ({ global: 'param' });
    const sdkWithExtraParams = new BaseSDK(options);
    
    const queryString = sdkWithExtraParams.getQueryParams({ local: 'param' });
    assert.equal(queryString, '?global=param&local=param');
  });
});
