import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const callContentServiceMock = mock.fn();

mock.module('@qelos/api-kit', {
  namedExports: {
    service: () => callContentServiceMock,
  },
});

describe('payments-configuration-service', async () => {
  const PaymentsConfigurationService = await import('../payments-configuration-service.js');

  beforeEach(() => {
    callContentServiceMock.mock.resetCalls();
  });

  it('returns null when configuration is missing', async () => {
    callContentServiceMock.mock.mockImplementation(async () => {
      throw { response: { status: 404 } };
    });

    const record = await PaymentsConfigurationService.getPaymentsConfigurationRecord('tenant-1');
    assert.strictEqual(record, null);
  });

  it('normalizes paymentSourceId and redirect URLs when loading', async () => {
    callContentServiceMock.mock.mockImplementation(async () => ({
      data: {
        key: 'payments-configuration',
        metadata: {
          paymentSourceId: 'src-1',
          successUrl: ' https://example.com/success ',
          cancelUrl: '',
        },
      },
    }));

    const record = await PaymentsConfigurationService.getPaymentsConfigurationRecord('tenant-1');
    assert.strictEqual(record?.metadata.providerSourceId, 'src-1');
    assert.strictEqual(record?.metadata.successUrl, 'https://example.com/success');
    assert.strictEqual(record?.metadata.cancelUrl, undefined);
  });

  it('rejects invalid redirect URLs on update', async () => {
    await assert.rejects(
      () => PaymentsConfigurationService.upsertPaymentsConfiguration('tenant-1', {
        successUrl: 'not-a-url',
      }),
      (error: any) => {
        assert.strictEqual(error.code, 'INVALID_PAYMENTS_CONFIGURATION');
        return true;
      },
    );
  });

  it('creates configuration when missing', async () => {
    callContentServiceMock.mock.mockImplementation(async (opts: any) => {
      if (opts.method === 'GET') {
        throw { response: { status: 404 } };
      }

      assert.strictEqual(opts.method, 'POST');
      assert.strictEqual(opts.url, '/internal-api/configurations');
      assert.strictEqual(opts.data.metadata.successUrl, 'https://example.com/success');
      assert.strictEqual(opts.data.metadata.cancelUrl, 'https://example.com/cancel');
      return { data: {} };
    });

    const record = await PaymentsConfigurationService.upsertPaymentsConfiguration('tenant-1', {
      isEnabled: true,
      paymentSourceId: 'src-1',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });

    assert.strictEqual(record.metadata.isEnabled, true);
    assert.strictEqual(record.metadata.providerSourceId, 'src-1');
  });

  it('updates configuration when it already exists', async () => {
    callContentServiceMock.mock.mockImplementation(async (opts: any) => {
      if (opts.method === 'GET') {
        return {
          data: {
            metadata: {
              isEnabled: true,
              paymentSourceId: 'src-1',
            },
          },
        };
      }

      assert.strictEqual(opts.method, 'PUT');
      assert.strictEqual(opts.url, '/internal-api/configurations/payments-configuration');
      assert.strictEqual(opts.data.metadata.cancelUrl, 'https://example.com/cancel');
      return { data: {} };
    });

    const record = await PaymentsConfigurationService.upsertPaymentsConfiguration('tenant-1', {
      cancelUrl: 'https://example.com/cancel',
    });

    assert.strictEqual(record.metadata.cancelUrl, 'https://example.com/cancel');
    assert.strictEqual(record.metadata.paymentSourceId, 'src-1');
  });
});
