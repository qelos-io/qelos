import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IntegrationSourceKind } from '@qelos/global-types';
import { validateSourceMetadata } from '../source-metadata-service';

describe('validateSourceMetadata - PayPal', () => {
  it('should return sanitized metadata with valid clientId and environment', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.PayPal, {
      clientId: 'AaBbCc123',
      environment: 'live',
    });
    assert.deepStrictEqual(result, { clientId: 'AaBbCc123', environment: 'live' });
  });

  it('should default environment to sandbox when not provided', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.PayPal, {
      clientId: 'AaBbCc123',
    });
    assert.deepStrictEqual(result, { clientId: 'AaBbCc123', environment: 'sandbox' });
  });

  it('should accept sandbox environment explicitly', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.PayPal, {
      clientId: 'AaBbCc123',
      environment: 'sandbox',
    });
    assert.deepStrictEqual(result, { clientId: 'AaBbCc123', environment: 'sandbox' });
  });

  it('should throw 400 when clientId is missing', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.PayPal, { environment: 'sandbox' }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /clientId/);
        return true;
      }
    );
  });

  it('should throw 400 when clientId is empty string', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.PayPal, { clientId: '', environment: 'sandbox' }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        return true;
      }
    );
  });

  it('should throw 400 when clientId is not a string', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.PayPal, { clientId: 123, environment: 'sandbox' }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        return true;
      }
    );
  });

  it('should throw 400 when environment is invalid', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.PayPal, { clientId: 'AaBbCc123', environment: 'staging' }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /environment/);
        return true;
      }
    );
  });

  it('should strip extra fields from metadata', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.PayPal, {
      clientId: 'AaBbCc123',
      environment: 'live',
      extraField: 'should be ignored',
    });
    assert.deepStrictEqual(result, { clientId: 'AaBbCc123', environment: 'live' });
  });
});
