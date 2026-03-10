import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const webhookEventSaveMock = mock.fn(async () => ({}));
const webhookEventFindOneMock = mock.fn(() => ({
  lean: mock.fn(() => ({
    exec: mock.fn(async () => null),
  })),
}));

function WebhookEventConstructor(data: any) {
  return { ...data, save: webhookEventSaveMock };
}
Object.assign(WebhookEventConstructor, { findOne: webhookEventFindOneMock });

const subscriptionFindOneMock = mock.fn(() => ({
  lean: mock.fn(() => ({
    exec: mock.fn(async () => null),
  })),
}));
const SubscriptionMock = { findOne: subscriptionFindOneMock };

const updateSubscriptionStatusMock = mock.fn();
const activateSubscriptionMock = mock.fn();
const createInvoiceForPaymentMock = mock.fn();
const getPaymentsConfigurationMock = mock.fn();
const verifyPayPalWebhookMock = mock.fn();

mock.module('../../models/webhook-event', { defaultExport: WebhookEventConstructor });
mock.module('../../models/subscription', { defaultExport: SubscriptionMock });

mock.module('../subscriptions-service', {
  namedExports: {
    updateSubscriptionStatus: updateSubscriptionStatusMock,
    listSubscriptions: mock.fn(),
    getSubscriptionById: mock.fn(),
    getActiveSubscription: mock.fn(),
    createSubscription: mock.fn(),
    cancelSubscription: mock.fn(),
  },
});

mock.module('../checkout-service', {
  namedExports: {
    activateSubscription: activateSubscriptionMock,
    createInvoiceForPayment: createInvoiceForPaymentMock,
    initiateCheckout: mock.fn(),
    cancelCheckoutSubscription: mock.fn(),
    calculateDiscountedPrice: mock.fn(),
  },
});

mock.module('../provider-adapter', {
  namedExports: {
    getPaymentsConfiguration: getPaymentsConfigurationMock,
    verifyPayPalWebhook: verifyPayPalWebhookMock,
    createCheckout: mock.fn(),
    cancelProviderSubscription: mock.fn(),
    getProviderSubscription: mock.fn(),
  },
});

describe('webhook-service', async () => {
  const WebhookService = await import('../webhook-service');

  function mockSubscriptionFound(sub: any) {
    subscriptionFindOneMock.mock.mockImplementation(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => sub),
      })),
    }));
  }

  beforeEach(() => {
    webhookEventSaveMock.mock.resetCalls();
    webhookEventFindOneMock.mock.resetCalls();
    subscriptionFindOneMock.mock.resetCalls();
    updateSubscriptionStatusMock.mock.resetCalls();
    activateSubscriptionMock.mock.resetCalls();
    createInvoiceForPaymentMock.mock.resetCalls();
    getPaymentsConfigurationMock.mock.resetCalls();
    verifyPayPalWebhookMock.mock.resetCalls();

    getPaymentsConfigurationMock.mock.mockImplementation(async () => ({
      providerSourceId: 'source-1',
      providerKind: 'paddle',
      webhookSecret: 'test-secret',
    }));

    webhookEventFindOneMock.mock.mockImplementation(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => null),
      })),
    }));

    webhookEventSaveMock.mock.mockImplementation(async () => ({}));

    subscriptionFindOneMock.mock.mockImplementation(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => null),
      })),
    }));

    verifyPayPalWebhookMock.mock.mockImplementation(async () => true);
  });

  describe('isEventProcessed', () => {
    it('should return false when event not found', async () => {
      const result = await WebhookService.isEventProcessed('tenant-1', 'evt-1', 'paddle');
      assert.strictEqual(result, false);
    });

    it('should return true when event already exists', async () => {
      webhookEventFindOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({ externalEventId: 'evt-1' })),
        })),
      }));

      const result = await WebhookService.isEventProcessed('tenant-1', 'evt-1', 'paddle');
      assert.strictEqual(result, true);
    });
  });

  describe('processWebhook', () => {
    it('should throw UNSUPPORTED_PROVIDER for unknown provider', async () => {
      await assert.rejects(() => WebhookService.processWebhook('stripe', {}, {}), (e: any) => {
        assert.strictEqual(e.code, 'UNSUPPORTED_PROVIDER');
        return true;
      });
    });
  });

  describe('Paddle webhooks', () => {
    const basePaddleEvent = {
      event_id: 'evt-paddle-1',
      event_type: 'subscription.activated',
      data: {
        id: 'sub_paddle_1',
        status: 'active',
        custom_data: { tenant: 'tenant-1' },
        current_billing_period: {
          starts_at: '2026-01-01T00:00:00Z',
          ends_at: '2026-02-01T00:00:00Z',
        },
      },
    };

    it('should throw INVALID_WEBHOOK when event_id is missing', async () => {
      await assert.rejects(
        () => WebhookService.processWebhook('paddle', {}, { event_type: 'subscription.created' }),
        (e: any) => {
          assert.strictEqual(e.code, 'INVALID_WEBHOOK');
          return true;
        },
      );
    });

    it('should throw INVALID_WEBHOOK when event_type is missing', async () => {
      await assert.rejects(
        () => WebhookService.processWebhook('paddle', {}, { event_id: 'evt-1' }),
        (e: any) => {
          assert.strictEqual(e.code, 'INVALID_WEBHOOK');
          return true;
        },
      );
    });

    it('should skip already processed events', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      webhookEventFindOneMock.mock.mockImplementation(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({ externalEventId: 'evt-paddle-1' })),
        })),
      }));

      const result = await WebhookService.processWebhook('paddle', {}, basePaddleEvent);
      assert.deepStrictEqual(result, { status: 'already_processed' });
      assert.strictEqual(activateSubscriptionMock.mock.calls.length, 0);
    });

    it('should handle subscription.activated event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      activateSubscriptionMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'active' }));

      await WebhookService.processWebhook('paddle', {}, basePaddleEvent);

      assert.strictEqual(activateSubscriptionMock.mock.calls.length, 1);
      assert.strictEqual(activateSubscriptionMock.mock.calls[0].arguments[0], 'tenant-1');
      assert.strictEqual(activateSubscriptionMock.mock.calls[0].arguments[1], 'sub-1');
      const updates = activateSubscriptionMock.mock.calls[0].arguments[2];
      assert.strictEqual(updates.externalSubscriptionId, 'sub_paddle_1');
    });

    it('should handle subscription.canceled event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'canceled' }));

      await WebhookService.processWebhook('paddle', {}, {
        ...basePaddleEvent,
        event_type: 'subscription.canceled',
      });

      assert.deepStrictEqual(updateSubscriptionStatusMock.mock.calls[0].arguments, ['tenant-1', 'sub-1', 'canceled']);
    });

    it('should handle subscription.past_due event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'past_due' }));

      await WebhookService.processWebhook('paddle', {}, {
        ...basePaddleEvent,
        event_type: 'subscription.past_due',
      });

      assert.deepStrictEqual(updateSubscriptionStatusMock.mock.calls[0].arguments, ['tenant-1', 'sub-1', 'past_due']);
    });

    it('should handle transaction.completed event and create invoice', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle', currency: 'USD' };
      mockSubscriptionFound(mockSub);
      createInvoiceForPaymentMock.mock.mockImplementation(async () => ({ _id: 'inv-1' }));

      await WebhookService.processWebhook('paddle', {}, {
        event_id: 'evt-paddle-2',
        event_type: 'transaction.completed',
        data: {
          id: 'txn_1',
          subscription_id: 'sub_paddle_1',
          details: { totals: { total: '2900' } },
          currency_code: 'USD',
          billing_period: {
            starts_at: '2026-01-01T00:00:00Z',
            ends_at: '2026-02-01T00:00:00Z',
          },
        },
      });

      assert.strictEqual(createInvoiceForPaymentMock.mock.calls.length, 1);
      const paymentData = createInvoiceForPaymentMock.mock.calls[0].arguments[2];
      assert.strictEqual(paymentData.amount, 29);
      assert.strictEqual(paymentData.currency, 'USD');
      assert.strictEqual(paymentData.externalInvoiceId, 'txn_1');
    });

    it('should handle transaction.payment_failed event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'past_due' }));

      await WebhookService.processWebhook('paddle', {}, {
        event_id: 'evt-paddle-3',
        event_type: 'transaction.payment_failed',
        data: {
          id: 'txn_2',
          subscription_id: 'sub_paddle_1',
        },
      });

      assert.deepStrictEqual(updateSubscriptionStatusMock.mock.calls[0].arguments, ['tenant-1', 'sub-1', 'past_due']);
    });

    it('should return subscription_not_found when subscription does not exist', async () => {
      const result = await WebhookService.processWebhook('paddle', {}, {
        event_id: 'evt-paddle-4',
        event_type: 'subscription.activated',
        data: {
          id: 'sub_nonexistent',
          custom_data: { tenant: 'tenant-1' },
        },
      });

      assert.deepStrictEqual(result, { status: 'subscription_not_found' });
    });

    it('should return unhandled for unknown event types', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);

      const result = await WebhookService.processWebhook('paddle', {}, {
        event_id: 'evt-paddle-5',
        event_type: 'unknown.event',
        data: { id: 'sub_paddle_1' },
      });

      assert.deepStrictEqual(result, { status: 'unhandled', eventType: 'unknown.event' });
    });

    it('should throw WEBHOOK_SECRET_NOT_CONFIGURED when webhook secret is missing', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      getPaymentsConfigurationMock.mock.mockImplementation(async () => ({
        providerSourceId: 'source-1',
        providerKind: 'paddle',
      }));

      await assert.rejects(
        () => WebhookService.processWebhook('paddle', {}, basePaddleEvent),
        (e: any) => {
          assert.strictEqual(e.code, 'WEBHOOK_SECRET_NOT_CONFIGURED');
          return true;
        },
      );
    });
  });

  describe('PayPal webhooks', () => {
    it('should throw INVALID_WEBHOOK when id is missing', async () => {
      await assert.rejects(
        () => WebhookService.processWebhook('paypal', {}, { event_type: 'BILLING.SUBSCRIPTION.ACTIVATED' }),
        (e: any) => {
          assert.strictEqual(e.code, 'INVALID_WEBHOOK');
          return true;
        },
      );
    });

    it('should handle BILLING.SUBSCRIPTION.ACTIVATED event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paypal' };
      mockSubscriptionFound(mockSub);
      activateSubscriptionMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'active' }));

      await WebhookService.processWebhook('paypal', {}, {
        id: 'evt-pp-1',
        event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
        resource: {
          id: 'sub_pp_1',
          start_time: '2026-01-01T00:00:00Z',
          billing_info: {
            next_billing_time: '2026-02-01T00:00:00Z',
          },
        },
      });

      assert.strictEqual(activateSubscriptionMock.mock.calls.length, 1);
      assert.strictEqual(activateSubscriptionMock.mock.calls[0].arguments[2].externalSubscriptionId, 'sub_pp_1');
    });

    it('should handle BILLING.SUBSCRIPTION.CANCELLED event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paypal' };
      mockSubscriptionFound(mockSub);
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'canceled' }));

      await WebhookService.processWebhook('paypal', {}, {
        id: 'evt-pp-2',
        event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource: { id: 'sub_pp_1' },
      });

      assert.deepStrictEqual(updateSubscriptionStatusMock.mock.calls[0].arguments, ['tenant-1', 'sub-1', 'canceled']);
    });

    it('should handle PAYMENT.SALE.COMPLETED event and create invoice', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paypal' };
      mockSubscriptionFound(mockSub);
      createInvoiceForPaymentMock.mock.mockImplementation(async () => ({ _id: 'inv-1' }));

      await WebhookService.processWebhook('paypal', {}, {
        id: 'evt-pp-3',
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          id: 'sale-1',
          billing_agreement_id: 'sub_pp_1',
          amount: { total: '29.00', currency: 'USD' },
        },
      });

      assert.strictEqual(createInvoiceForPaymentMock.mock.calls.length, 1);
      const paymentData = createInvoiceForPaymentMock.mock.calls[0].arguments[2];
      assert.strictEqual(paymentData.amount, 29);
      assert.strictEqual(paymentData.currency, 'USD');
    });

    it('should throw INVALID_SIGNATURE when PayPal verification fails', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paypal' };
      mockSubscriptionFound(mockSub);
      verifyPayPalWebhookMock.mock.mockImplementation(async () => false);

      await assert.rejects(
        () => WebhookService.processWebhook('paypal', {}, {
          id: 'evt-pp-4',
          event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
          resource: { id: 'sub_pp_1' },
        }),
        (e: any) => {
          assert.strictEqual(e.code, 'INVALID_SIGNATURE');
          return true;
        },
      );
    });
  });

  describe('Sumit webhooks', () => {
    it('should throw TENANT_NOT_FOUND when tenant cannot be determined', async () => {
      await assert.rejects(
        () => WebhookService.processWebhook('sumit', { 'x-webhook-secret': 'test-secret' }, {
          EventId: 'evt-1',
          EventType: 'payment_success',
        }),
        (e: any) => {
          assert.strictEqual(e.code, 'TENANT_NOT_FOUND');
          return true;
        },
      );
    });

    it('should handle payment_success event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'sumit', status: 'pending' };
      mockSubscriptionFound(mockSub);
      activateSubscriptionMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'active' }));
      createInvoiceForPaymentMock.mock.mockImplementation(async () => ({ _id: 'inv-1' }));

      await WebhookService.processWebhook('sumit', { 'x-webhook-secret': 'test-secret' }, {
        EventId: 'evt-sumit-1',
        EventType: 'payment_success',
        RecurringPaymentId: 'rp-1',
        Amount: 29,
        Currency: 'ILS',
        TransactionId: 'txn-1',
        CustomData: JSON.stringify({ tenant: 'tenant-1' }),
      });

      assert.strictEqual(activateSubscriptionMock.mock.calls.length, 1);
      assert.strictEqual(createInvoiceForPaymentMock.mock.calls.length, 1);
      const paymentData = createInvoiceForPaymentMock.mock.calls[0].arguments[2];
      assert.strictEqual(paymentData.amount, 29);
      assert.strictEqual(paymentData.currency, 'ILS');
    });

    it('should handle recurring_canceled event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'sumit' };
      mockSubscriptionFound(mockSub);
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'canceled' }));

      await WebhookService.processWebhook('sumit', { 'x-webhook-secret': 'test-secret' }, {
        EventId: 'evt-sumit-2',
        EventType: 'recurring_canceled',
        RecurringPaymentId: 'rp-1',
        CustomData: JSON.stringify({ tenant: 'tenant-1' }),
      });

      assert.deepStrictEqual(updateSubscriptionStatusMock.mock.calls[0].arguments, ['tenant-1', 'sub-1', 'canceled']);
    });

    it('should throw INVALID_SIGNATURE when sumit secret is wrong', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'sumit' };
      mockSubscriptionFound(mockSub);

      await assert.rejects(
        () => WebhookService.processWebhook('sumit', { 'x-webhook-secret': 'wrong-secret' }, {
          EventId: 'evt-sumit-3',
          EventType: 'payment_success',
          CustomData: JSON.stringify({ tenant: 'tenant-1' }),
        }),
        (e: any) => {
          assert.strictEqual(e.code, 'INVALID_SIGNATURE');
          return true;
        },
      );
    });
  });
});
