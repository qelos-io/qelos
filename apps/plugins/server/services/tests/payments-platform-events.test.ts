import { describe, it, beforeEach, mock, afterEach } from 'node:test';
import assert from 'node:assert';

let savedEvents: any[] = [];
const emitPlatformEventMock = mock.fn();

mock.module('../hook-events', { namedExports: { emitPlatformEvent: emitPlatformEventMock } });
mock.module('../../models/event', {
  defaultExport: class {
    data: any;
    constructor(data: any) {
      this.data = data;
      savedEvents.push(data);
    }
    save() { return Promise.resolve(this); }
  },
});

describe('payments-platform-events', async () => {
  const {
    sanitizePaymentsMetadata,
    serializePaymentsError,
    emitPaymentsProviderFailureEvent,
  } = await import('../payments-platform-events');

  beforeEach(() => {
    savedEvents = [];
    emitPlatformEventMock.mock.resetCalls();
  });

  describe('sanitizePaymentsMetadata', () => {
    it('should strip sensitive keys including singleusetoken', () => {
      const result = sanitizePaymentsMetadata({
        operation: 'setPaymentDetails',
        Credentials: { APIKey: 'secret', CompanyID: 123 },
        SingleUseToken: 'token-123',
        single_use_token: 'another-token',
        cardNumber: '4111111111111111',
        nested: {
          clientSecret: 'hidden',
          safe: 'visible',
        },
      }) as Record<string, unknown>;

      assert.strictEqual(result.operation, 'setPaymentDetails');
      assert.strictEqual(result.Credentials, undefined);
      assert.strictEqual(result.SingleUseToken, undefined);
      assert.strictEqual(result.single_use_token, undefined);
      assert.strictEqual(result.cardNumber, undefined);
      assert.deepStrictEqual(result.nested, { safe: 'visible' });
    });

    it('should sanitize arrays recursively', () => {
      const result = sanitizePaymentsMetadata([
        { apiKey: 'secret', label: 'keep' },
      ]) as Array<Record<string, unknown>>;

      assert.strictEqual(result[0].apiKey, undefined);
      assert.strictEqual(result[0].label, 'keep');
    });
  });

  describe('serializePaymentsError', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should serialize error shape with responseBody', () => {
      const error = {
        message: 'Provider failed',
        code: 'ERR_1',
        type: 'api_error',
        status: 502,
        responseBody: { Status: 'Error', Credentials: { APIKey: 'secret' } },
        stack: 'Error stack trace',
      };

      const result = serializePaymentsError(error);

      assert.deepStrictEqual(result, {
        message: 'Provider failed',
        code: 'ERR_1',
        type: 'api_error',
        status: 502,
        responseData: { Status: 'Error' },
        stack: 'Error stack trace',
      });
    });

    it('should omit stack in production', () => {
      process.env.NODE_ENV = 'production';

      const result = serializePaymentsError({
        message: 'fail',
        stack: 'trace',
      });

      assert.strictEqual(result?.stack, undefined);
    });

    it('should return null for falsy error', () => {
      assert.strictEqual(serializePaymentsError(null), null);
    });
  });

  describe('emitPaymentsProviderFailureEvent', () => {
    it('should emit provider-call-failed for createRecurringPayment', async () => {
      emitPaymentsProviderFailureEvent('tenant-1', 'sumit', 'createRecurringPayment', {
        status: 400,
        providerResponse: { Status: 'Error', UserErrorMessage: 'Invalid amount', Credentials: { APIKey: 'secret' } },
        error: { message: 'Sumit API request failed', status: 400 },
      });

      await new Promise(resolve => setImmediate(resolve));

      assert.strictEqual(savedEvents.length, 1);
      assert.strictEqual(savedEvents[0].tenant, 'tenant-1');
      assert.strictEqual(savedEvents[0].source, 'payments:sumit');
      assert.strictEqual(savedEvents[0].kind, 'provider');
      assert.strictEqual(savedEvents[0].eventName, 'provider-call-failed');
      assert.strictEqual(savedEvents[0].description, 'Provider call failed: createRecurringPayment');
      assert.strictEqual(savedEvents[0].metadata.providerKind, 'sumit');
      assert.strictEqual(savedEvents[0].metadata.operation, 'createRecurringPayment');
      assert.strictEqual(savedEvents[0].metadata.status, 400);
      assert.strictEqual(savedEvents[0].metadata.providerResponse.UserErrorMessage, 'Invalid amount');
      assert.strictEqual(savedEvents[0].metadata.providerResponse.Credentials, undefined);
      assert.ok(emitPlatformEventMock.mock.calls.length >= 1);
    });

    it('should emit payment-method-save-failed for setPaymentDetails', async () => {
      emitPaymentsProviderFailureEvent('tenant-1', 'sumit', 'setPaymentDetails', {
        status: 502,
        providerResponse: { Status: 'Error', TechnicalErrorDetails: 'Gateway timeout' },
        error: { message: 'Sumit API request failed with status 502', status: 502 },
      });

      await new Promise(resolve => setImmediate(resolve));

      assert.strictEqual(savedEvents.length, 1);
      assert.strictEqual(savedEvents[0].eventName, 'payment-method-save-failed');
      assert.strictEqual(savedEvents[0].description, 'Failed to save payment method via sumit');
      assert.strictEqual(savedEvents[0].metadata.operation, 'setPaymentDetails');
      assert.match(savedEvents[0].metadata.error.message, /502/);
    });

    it('should respect explicit eventName override', async () => {
      emitPaymentsProviderFailureEvent('tenant-1', 'paypal', 'captureOrder', {
        error: { message: 'capture failed' },
        eventName: 'payment-failed',
      });

      await new Promise(resolve => setImmediate(resolve));

      assert.strictEqual(savedEvents[0].eventName, 'payment-failed');
      assert.strictEqual(savedEvents[0].source, 'payments:paypal');
    });

    it('should not emit when tenant is missing', async () => {
      emitPaymentsProviderFailureEvent(undefined, 'sumit', 'createRecurringPayment', {
        error: { message: 'fail' },
      });

      await new Promise(resolve => setImmediate(resolve));

      assert.strictEqual(savedEvents.length, 0);
      assert.strictEqual(emitPlatformEventMock.mock.calls.length, 0);
    });
  });
});
