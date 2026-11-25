import { beforeEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { addEndpoint, addInternalEndpoint, addProxyEndpoint, endpoints, internalEndpoints } from '../../src/endpoints';
import manifest from '../../src/manifest';

const handler = async () => ({ ok: true });

describe('endpoint registries', () => {
  beforeEach(() => {
    endpoints.clear();
    internalEndpoints.clear();
  });

  test('addEndpoint keeps the path, defaults to GET and requires a token', () => {
    addEndpoint('/items', { handler });
    const route = endpoints.get('GET::/items')!;
    assert.equal(route.url, '/items');
    assert.equal(route.method, 'GET');
    assert.equal(route.verifyToken, true);
    assert.equal(route.handler, handler);
  });

  test('addEndpoint can opt out of token verification and uses the given method', () => {
    addEndpoint('/public', { method: 'POST', verifyToken: false, handler });
    assert.equal(endpoints.get('POST::/public')!.verifyToken, false);
    assert.equal(endpoints.has('GET::/public'), false);
  });

  test('addProxyEndpoint lives under the manifest proxy path and always verifies the token', () => {
    addProxyEndpoint('/sync', { handler });
    const route = endpoints.get(`GET::${manifest.proxyPath}/sync`)!;
    assert.equal(route.url, `${manifest.proxyPath}/sync`);
    assert.equal(route.verifyToken, true);
  });

  test('addInternalEndpoint goes to the internal registry only', () => {
    addInternalEndpoint('/internal/ping', { method: 'PUT', handler });
    assert.ok(internalEndpoints.has('PUT::/internal/ping'));
    assert.equal(endpoints.size, 0);
  });

  test('registering the same method and path twice replaces the first one', () => {
    const second = async () => ({ second: true });
    addEndpoint('/dup', { handler });
    addEndpoint('/dup', { handler: second });
    assert.equal(endpoints.size, 1);
    assert.equal(endpoints.get('GET::/dup')!.handler, second);
  });
});
