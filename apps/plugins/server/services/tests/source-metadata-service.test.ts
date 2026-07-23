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

describe('validateSourceMetadata - AWS', () => {
  it('should return region and accessKeyId when both are provided', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.AWS, {
      region: 'us-east-1',
      accessKeyId: 'AKIAEXAMPLE',
      extraField: 'should be ignored',
    });
    assert.deepStrictEqual(result, { region: 'us-east-1', accessKeyId: 'AKIAEXAMPLE' });
  });

  it('should throw 400 when region is missing', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.AWS, { accessKeyId: 'AKIAEXAMPLE' }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /region/);
        return true;
      }
    );
  });

  it('should throw 400 when accessKeyId is missing', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.AWS, { region: 'us-east-1' }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /accessKeyId/);
        return true;
      }
    );
  });
});

describe('validateSourceMetadata - Cloudflare', () => {
  it('should return accountId and workersDevSubdomain when both are provided', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Cloudflare, {
      accountId: 'acc-123',
      workersDevSubdomain: 'my-subdomain',
    });
    assert.deepStrictEqual(result, { accountId: 'acc-123', workersDevSubdomain: 'my-subdomain' });
  });

  it('should default workersDevSubdomain to empty string when omitted', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Cloudflare, {
      accountId: 'acc-123',
    });
    assert.deepStrictEqual(result, { accountId: 'acc-123', workersDevSubdomain: '' });
  });

  it('should throw 400 when accountId is missing', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.Cloudflare, {}),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /accountId/);
        return true;
      }
    );
  });
});
