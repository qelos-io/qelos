import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IntegrationSourceKind } from '@qelos/global-types';
import { validateSourceMetadata } from '../source-metadata-service';

describe('validateSourceMetadata - Paddle', () => {
  it('should return sanitized metadata with default sandbox environment', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Paddle, {});
    assert.deepStrictEqual(result, { environment: 'sandbox' });
  });

  it('should accept sandbox environment explicitly', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Paddle, {
      environment: 'sandbox',
    });
    assert.deepStrictEqual(result, { environment: 'sandbox' });
  });

  it('should accept live environment', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Paddle, {
      environment: 'live',
    });
    assert.deepStrictEqual(result, { environment: 'live' });
  });

  it('should throw 400 when environment is invalid', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.Paddle, { environment: 'staging' }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /environment/);
        return true;
      }
    );
  });

  it('should strip extra fields from metadata', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Paddle, {
      environment: 'live',
      extraField: 'should be ignored',
    });
    assert.deepStrictEqual(result, { environment: 'live' });
  });
});
