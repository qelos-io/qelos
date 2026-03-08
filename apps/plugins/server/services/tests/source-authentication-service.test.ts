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

describe('storeEncryptedSourceAuthentication - PayPal', async () => {
  const { storeEncryptedSourceAuthentication } = await import('../source-authentication-service');

  afterEach(() => {
    setSecretMock.mock.resetCalls();
  });

  it('should store clientSecret via setSecret and return authId', async () => {
    const result = await storeEncryptedSourceAuthentication(
      'tenant-1',
      'paypal' as any,
      { clientSecret: 'my-secret' },
      'auth-123'
    );

    assert.strictEqual(result, 'auth-123');
    assert.strictEqual(setSecretMock.mock.calls.length, 1);

    const call = setSecretMock.mock.calls[0];
    assert.strictEqual(call.arguments[0], 'tenant-1');
    assert.strictEqual(call.arguments[1], 'integration-source-paypal-auth-123');
    assert.deepStrictEqual(call.arguments[2], { clientSecret: 'my-secret' });
  });

  it('should return undefined when clientSecret is not provided', async () => {
    const result = await storeEncryptedSourceAuthentication(
      'tenant-1',
      'paypal' as any,
      {},
      'auth-123'
    );

    assert.strictEqual(result, undefined);
    assert.strictEqual(setSecretMock.mock.calls.length, 0);
  });

  it('should return undefined when clientSecret is empty string', async () => {
    const result = await storeEncryptedSourceAuthentication(
      'tenant-1',
      'paypal' as any,
      { clientSecret: '' },
      'auth-123'
    );

    assert.strictEqual(result, undefined);
    assert.strictEqual(setSecretMock.mock.calls.length, 0);
  });
});
