import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert';

const setSecretMock = mock.fn(async () => {});

mock.module('../secrets-service', {
  namedExports: {
    getSecret: mock.fn(),
    setSecret: setSecretMock,
  }
});

mock.module('uniqid', {
  defaultExport: () => 'test-auth-id',
});

describe('storeEncryptedSourceAuthentication - Paddle', async () => {
  const { storeEncryptedSourceAuthentication } = await import('../source-authentication-service');

  afterEach(() => {
    setSecretMock.mock.resetCalls();
  });

  it('should store apikey via setSecret and return authId', async () => {
    const result = await storeEncryptedSourceAuthentication(
      'tenant-1',
      'paddle' as any,
      { apikey: 'pdl_test_key_123' },
      'auth-123'
    );

    assert.strictEqual(result, 'auth-123');
    assert.strictEqual(setSecretMock.mock.calls.length, 1);

    const call = setSecretMock.mock.calls[0];
    assert.strictEqual(call.arguments[0], 'tenant-1');
    assert.strictEqual(call.arguments[1], 'integration-source-paddle-auth-123');
    assert.deepStrictEqual(call.arguments[2], { apikey: 'pdl_test_key_123' });
  });

  it('should generate authId when not provided', async () => {
    const result = await storeEncryptedSourceAuthentication(
      'tenant-1',
      'paddle' as any,
      { apikey: 'pdl_test_key_456' },
    );

    assert.strictEqual(result, 'test-auth-id');
    assert.strictEqual(setSecretMock.mock.calls.length, 1);
  });
});
