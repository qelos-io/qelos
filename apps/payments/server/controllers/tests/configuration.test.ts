import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const getPaymentsConfigurationRecordMock = mock.fn();
const upsertPaymentsConfigurationMock = mock.fn();

mock.module('../../services/payments-configuration-service.js', {
  namedExports: {
    getPaymentsConfigurationRecord: getPaymentsConfigurationRecordMock,
    upsertPaymentsConfiguration: upsertPaymentsConfigurationMock,
    normalizePaymentsConfigurationMetadata: (metadata: any) => ({
      isEnabled: false,
      defaultCurrency: 'USD',
      gracePeriodDays: 3,
      ...metadata,
    }),
  },
});

describe('payments configuration controller', async () => {
  const ConfigurationController = await import('../configuration.js');

  beforeEach(() => {
    getPaymentsConfigurationRecordMock.mock.resetCalls();
    upsertPaymentsConfigurationMock.mock.resetCalls();
  });

  it('returns default metadata when configuration is missing', async () => {
    getPaymentsConfigurationRecordMock.mock.mockImplementation(async () => null);

    const res = createMockRes();
    await ConfigurationController.getPaymentsConfiguration({ headers: { tenant: 'tenant-1' } }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.key, 'payments-configuration');
    assert.strictEqual(res.body.metadata.isEnabled, false);
  });

  it('updates payments configuration metadata', async () => {
    upsertPaymentsConfigurationMock.mock.mockImplementation(async () => ({
      key: 'payments-configuration',
      metadata: {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      },
    }));

    const res = createMockRes();
    await ConfigurationController.updatePaymentsConfiguration({
      headers: { tenant: 'tenant-1' },
      body: {
        metadata: {
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
      },
    }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.metadata.successUrl, 'https://example.com/success');
    assert.strictEqual(upsertPaymentsConfigurationMock.mock.calls[0].arguments[1].successUrl, 'https://example.com/success');
  });
});

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
    end() {
      return res;
    },
  };
  return res;
}
