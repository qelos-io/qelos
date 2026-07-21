import { describe, it, beforeEach, mock, afterEach } from 'node:test';
import assert from 'node:assert';

const emitPlatformEventMock = mock.fn();

mock.module('@qelos/api-kit', {
  namedExports: {
    emitPlatformEvent: emitPlatformEventMock,
  },
});

describe('platform-events', async () => {
  const PlatformEvents = await import('../platform-events');
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    emitPlatformEventMock.mock.resetCalls();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('serializeError', () => {
    it('returns null for falsy input', () => {
      assert.strictEqual(PlatformEvents.serializeError(null), null);
      assert.strictEqual(PlatformEvents.serializeError(undefined), null);
    });

    it('serializes error fields and sanitizes responseData', () => {
      const error = {
        message: 'Provider failed',
        code: 'PROVIDER_ERROR',
        type: 'provider_error',
        status: 400,
        stack: 'Error: Provider failed\n    at test',
        response: {
          status: 400,
          data: {
            ErrorCode: 'CARD_DECLINED',
            Message: 'Card was declined',
            Credentials: { APIKey: 'secret-key' },
          },
        },
      };

      const serialized = PlatformEvents.serializeError(error);
      assert.deepStrictEqual(serialized, {
        message: 'Provider failed',
        code: 'PROVIDER_ERROR',
        type: 'provider_error',
        status: 400,
        responseData: {
          ErrorCode: 'CARD_DECLINED',
          Message: 'Card was declined',
        },
        stack: error.stack,
      });
    });

    it('omits stack in production', () => {
      process.env.NODE_ENV = 'production';
      const serialized = PlatformEvents.serializeError(new Error('boom'));
      assert.strictEqual(serialized?.stack, undefined);
    });
  });

  describe('sanitizePaymentMetadata', () => {
    it('strips PCI, credentials, and secret fields recursively', () => {
      const sanitized = PlatformEvents.sanitizePaymentMetadata({
        providerKind: 'sumit',
        operation: 'setPaymentDetails',
        providerResponse: {
          Status: 'Error',
          ErrorCode: 42,
          Message: 'Invalid card',
          Credentials: { CompanyID: '123', APIKey: 'key' },
          CreditCardNumber: '4111111111111111',
          SecurityCode: '123',
          nested: {
            webhookSecret: 'whsec_abc',
            clientSecret: 'cs_live',
          },
        },
      });

      assert.deepStrictEqual(sanitized, {
        providerKind: 'sumit',
        operation: 'setPaymentDetails',
        providerResponse: {
          Status: 'Error',
          ErrorCode: 42,
          Message: 'Invalid card',
          nested: {},
        },
      });
    });
  });

  describe('emitCheckoutFailedEvent', () => {
    it('skips emit when tenant is missing', () => {
      PlatformEvents.emitCheckoutFailedEvent({
        error: { code: 'PLAN_NOT_ACTIVE', message: 'Plan inactive' },
      });
      assert.strictEqual(emitPlatformEventMock.mock.callCount(), 0);
    });

    it('emits checkout-failed with expected payload shape', () => {
      PlatformEvents.emitCheckoutFailedEvent({
        tenant: 'tenant-1',
        userId: 'user-1',
        providerKind: 'sumit',
        code: 'PLAN_NOT_ACTIVE',
        planId: 'plan-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        error: { code: 'PLAN_NOT_ACTIVE', message: 'Plan inactive' },
      });

      assert.strictEqual(emitPlatformEventMock.mock.callCount(), 1);
      assert.deepStrictEqual(emitPlatformEventMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        user: 'user-1',
        source: 'payments:sumit',
        kind: 'checkout',
        eventName: 'checkout-failed',
        description: 'Checkout initiation failed',
        metadata: {
          providerKind: 'sumit',
          operation: 'initiateCheckout',
          code: 'PLAN_NOT_ACTIVE',
          planId: 'plan-1',
          subscriptionId: undefined,
          billableEntityType: 'user',
          billableEntityId: 'user-1',
          externalSubscriptionId: undefined,
          couponCode: undefined,
          error: {
            message: 'Plan inactive',
            code: 'PLAN_NOT_ACTIVE',
            type: undefined,
            status: undefined,
            responseData: undefined,
            stack: undefined,
          },
        },
      });
    });
  });

  describe('emitProviderCallFailedEvent', () => {
    it('emits payment-method-save-failed for setPaymentDetails', () => {
      PlatformEvents.emitProviderCallFailedEvent({
        tenant: 'tenant-1',
        providerKind: 'sumit',
        operation: 'setPaymentDetails',
        error: { message: 'Save failed', code: 'SAVE_FAILED' },
        providerResponse: {
          ErrorCode: 99,
          Message: 'Invalid card',
          APIKey: 'secret',
        },
      });

      const event = emitPlatformEventMock.mock.calls[0].arguments[0];
      assert.strictEqual(event.eventName, 'payment-method-save-failed');
      assert.strictEqual(event.kind, 'provider');
      assert.strictEqual(event.source, 'payments:sumit');
      assert.deepStrictEqual(event.metadata.providerResponse, {
        ErrorCode: 99,
        Message: 'Invalid card',
      });
    });

    it('emits provider-call-failed for other operations', () => {
      PlatformEvents.emitProviderCallFailedEvent({
        tenant: 'tenant-1',
        providerKind: 'sumit',
        operation: 'createRecurringPayment',
        externalSubscriptionId: 'sub-ext-1',
        error: { message: 'Recurring payment failed' },
      });

      const event = emitPlatformEventMock.mock.calls[0].arguments[0];
      assert.strictEqual(event.eventName, 'provider-call-failed');
      assert.strictEqual(event.metadata.operation, 'createRecurringPayment');
      assert.strictEqual(event.metadata.externalSubscriptionId, 'sub-ext-1');
    });
  });

  describe('emitWebhookPaymentFailedEvent', () => {
    it('emits payment-failed webhook event', () => {
      PlatformEvents.emitWebhookPaymentFailedEvent({
        tenant: 'tenant-1',
        providerKind: 'paddle',
        subscriptionId: 'sub-1',
        externalSubscriptionId: 'ext-sub-1',
        externalEventId: 'evt-1',
        providerResponse: { status: 'past_due' },
      });

      const event = emitPlatformEventMock.mock.calls[0].arguments[0];
      assert.strictEqual(event.kind, 'webhook');
      assert.strictEqual(event.eventName, 'payment-failed');
      assert.strictEqual(event.source, 'payments:paddle');
      assert.strictEqual(event.metadata.externalEventId, 'evt-1');
    });
  });

  describe('emitWebhookProcessingFailedEvent', () => {
    it('emits webhook-processing-failed event', () => {
      PlatformEvents.emitWebhookProcessingFailedEvent({
        tenant: 'tenant-1',
        providerKind: 'sumit',
        operation: 'verifySignature',
        externalEventId: 'evt-99',
        code: 'INVALID_SIGNATURE',
        error: { message: 'Signature mismatch', code: 'INVALID_SIGNATURE' },
      });

      const event = emitPlatformEventMock.mock.calls[0].arguments[0];
      assert.strictEqual(event.eventName, 'webhook-processing-failed');
      assert.strictEqual(event.metadata.operation, 'verifySignature');
      assert.strictEqual(event.metadata.code, 'INVALID_SIGNATURE');
    });
  });

  describe('emitSafePlatformEvent', () => {
    it('swallows synchronous emit failures', () => {
      emitPlatformEventMock.mock.mockImplementation(() => {
        throw new Error('dispatch failed');
      });

      assert.doesNotThrow(() => {
        PlatformEvents.emitCheckoutFailedEvent({
          tenant: 'tenant-1',
          error: { message: 'Checkout failed' },
        });
      });
    });
  });
});
