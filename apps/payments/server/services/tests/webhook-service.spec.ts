import * as WebhookService from '../webhook-service';
import Subscription from '../../models/subscription';
import WebhookEvent from '../../models/webhook-event';
import * as SubscriptionsService from '../subscriptions-service';
import * as CheckoutService from '../checkout-service';

jest.mock('../../models/subscription');
jest.mock('../../models/webhook-event');
jest.mock('../subscriptions-service');
jest.mock('../checkout-service');

const MockSubscription = Subscription as any;
const MockWebhookEvent = WebhookEvent as any;
const MockSubscriptionsService = SubscriptionsService as any;
const MockCheckoutService = CheckoutService as any;

describe('webhook-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    MockWebhookEvent.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    MockWebhookEvent.mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue(data),
    }));

    MockSubscription.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });
  });

  function mockSubscriptionFound(sub: any) {
    MockSubscription.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(sub),
      }),
    });
  }

  describe('isEventProcessed', () => {
    it('should return false when event not found', async () => {
      const result = await WebhookService.isEventProcessed('tenant-1', 'evt-1', 'paddle');
      expect(result).toBe(false);
    });

    it('should return true when event already exists', async () => {
      MockWebhookEvent.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ externalEventId: 'evt-1' }),
        }),
      });

      const result = await WebhookService.isEventProcessed('tenant-1', 'evt-1', 'paddle');
      expect(result).toBe(true);
    });
  });

  describe('processWebhook', () => {
    it('should throw UNSUPPORTED_PROVIDER for unknown provider', async () => {
      try {
        await WebhookService.processWebhook('stripe', {}, {});
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('UNSUPPORTED_PROVIDER');
      }
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
      try {
        await WebhookService.processWebhook('paddle', {}, { event_type: 'subscription.created' });
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_WEBHOOK');
      }
    });

    it('should throw INVALID_WEBHOOK when event_type is missing', async () => {
      try {
        await WebhookService.processWebhook('paddle', {}, { event_id: 'evt-1' });
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_WEBHOOK');
      }
    });

    it('should skip already processed events', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      MockWebhookEvent.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ externalEventId: 'evt-paddle-1' }),
        }),
      });

      const result = await WebhookService.processWebhook('paddle', {}, basePaddleEvent);
      expect(result).toEqual({ status: 'already_processed' });
      expect(MockCheckoutService.activateSubscription).not.toHaveBeenCalled();
    });

    it('should handle subscription.activated event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      MockCheckoutService.activateSubscription.mockResolvedValue({ _id: 'sub-1', status: 'active' } as any);

      await WebhookService.processWebhook('paddle', {}, basePaddleEvent);

      expect(MockCheckoutService.activateSubscription).toHaveBeenCalledWith(
        'tenant-1',
        'sub-1',
        expect.objectContaining({
          externalSubscriptionId: 'sub_paddle_1',
          currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
          currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
        }),
      );
    });

    it('should handle subscription.canceled event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      MockSubscriptionsService.updateSubscriptionStatus.mockResolvedValue({ _id: 'sub-1', status: 'canceled' } as any);

      await WebhookService.processWebhook('paddle', {}, {
        ...basePaddleEvent,
        event_type: 'subscription.canceled',
      });

      expect(MockSubscriptionsService.updateSubscriptionStatus).toHaveBeenCalledWith(
        'tenant-1', 'sub-1', 'canceled',
      );
    });

    it('should handle subscription.past_due event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      MockSubscriptionsService.updateSubscriptionStatus.mockResolvedValue({ _id: 'sub-1', status: 'past_due' } as any);

      await WebhookService.processWebhook('paddle', {}, {
        ...basePaddleEvent,
        event_type: 'subscription.past_due',
      });

      expect(MockSubscriptionsService.updateSubscriptionStatus).toHaveBeenCalledWith(
        'tenant-1', 'sub-1', 'past_due',
      );
    });

    it('should handle transaction.completed event and create invoice', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle', currency: 'USD' };
      mockSubscriptionFound(mockSub);
      MockCheckoutService.createInvoiceForPayment.mockResolvedValue({ _id: 'inv-1' } as any);

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

      expect(MockCheckoutService.createInvoiceForPayment).toHaveBeenCalledWith(
        'tenant-1',
        mockSub,
        expect.objectContaining({
          amount: 29,
          currency: 'USD',
          externalInvoiceId: 'txn_1',
        }),
      );
    });

    it('should handle transaction.payment_failed event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);
      MockSubscriptionsService.updateSubscriptionStatus.mockResolvedValue({ _id: 'sub-1', status: 'past_due' } as any);

      await WebhookService.processWebhook('paddle', {}, {
        event_id: 'evt-paddle-3',
        event_type: 'transaction.payment_failed',
        data: {
          id: 'txn_2',
          subscription_id: 'sub_paddle_1',
        },
      });

      expect(MockSubscriptionsService.updateSubscriptionStatus).toHaveBeenCalledWith(
        'tenant-1', 'sub-1', 'past_due',
      );
    });

    it('should return subscription_not_found when subscription does not exist', async () => {
      MockSubscription.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await WebhookService.processWebhook('paddle', {}, {
        event_id: 'evt-paddle-4',
        event_type: 'subscription.activated',
        data: {
          id: 'sub_nonexistent',
          custom_data: { tenant: 'tenant-1' },
        },
      });

      expect(result).toEqual({ status: 'subscription_not_found' });
    });

    it('should return unhandled for unknown event types', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paddle' };
      mockSubscriptionFound(mockSub);

      const result = await WebhookService.processWebhook('paddle', {}, {
        event_id: 'evt-paddle-5',
        event_type: 'unknown.event',
        data: { id: 'sub_paddle_1' },
      });

      expect(result).toEqual({ status: 'unhandled', eventType: 'unknown.event' });
    });
  });

  describe('PayPal webhooks', () => {
    it('should throw INVALID_WEBHOOK when id is missing', async () => {
      try {
        await WebhookService.processWebhook('paypal', {}, { event_type: 'BILLING.SUBSCRIPTION.ACTIVATED' });
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_WEBHOOK');
      }
    });

    it('should handle BILLING.SUBSCRIPTION.ACTIVATED event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paypal' };
      mockSubscriptionFound(mockSub);
      MockCheckoutService.activateSubscription.mockResolvedValue({ _id: 'sub-1', status: 'active' } as any);

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

      expect(MockCheckoutService.activateSubscription).toHaveBeenCalledWith(
        'tenant-1',
        'sub-1',
        expect.objectContaining({ externalSubscriptionId: 'sub_pp_1' }),
      );
    });

    it('should handle BILLING.SUBSCRIPTION.CANCELLED event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paypal' };
      mockSubscriptionFound(mockSub);
      MockSubscriptionsService.updateSubscriptionStatus.mockResolvedValue({ _id: 'sub-1', status: 'canceled' } as any);

      await WebhookService.processWebhook('paypal', {}, {
        id: 'evt-pp-2',
        event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource: { id: 'sub_pp_1' },
      });

      expect(MockSubscriptionsService.updateSubscriptionStatus).toHaveBeenCalledWith(
        'tenant-1', 'sub-1', 'canceled',
      );
    });

    it('should handle PAYMENT.SALE.COMPLETED event and create invoice', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'paypal' };
      mockSubscriptionFound(mockSub);
      MockCheckoutService.createInvoiceForPayment.mockResolvedValue({ _id: 'inv-1' } as any);

      await WebhookService.processWebhook('paypal', {}, {
        id: 'evt-pp-3',
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          id: 'sale-1',
          billing_agreement_id: 'sub_pp_1',
          amount: { total: '29.00', currency: 'USD' },
        },
      });

      expect(MockCheckoutService.createInvoiceForPayment).toHaveBeenCalledWith(
        'tenant-1',
        mockSub,
        expect.objectContaining({
          amount: 29,
          currency: 'USD',
          externalInvoiceId: 'sale-1',
        }),
      );
    });
  });

  describe('Sumit webhooks', () => {
    it('should throw TENANT_NOT_FOUND when tenant cannot be determined', async () => {
      try {
        await WebhookService.processWebhook('sumit', {}, {
          EventId: 'evt-1',
          EventType: 'payment_success',
        });
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('TENANT_NOT_FOUND');
      }
    });

    it('should handle payment_success event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'sumit', status: 'pending' };
      mockSubscriptionFound(mockSub);
      MockCheckoutService.activateSubscription.mockResolvedValue({ _id: 'sub-1', status: 'active' } as any);
      MockCheckoutService.createInvoiceForPayment.mockResolvedValue({ _id: 'inv-1' } as any);

      await WebhookService.processWebhook('sumit', {}, {
        EventId: 'evt-sumit-1',
        EventType: 'payment_success',
        RecurringPaymentId: 'rp-1',
        Amount: 29,
        Currency: 'ILS',
        TransactionId: 'txn-1',
        CustomData: JSON.stringify({ tenant: 'tenant-1' }),
      });

      expect(MockCheckoutService.activateSubscription).toHaveBeenCalled();
      expect(MockCheckoutService.createInvoiceForPayment).toHaveBeenCalledWith(
        'tenant-1',
        mockSub,
        expect.objectContaining({
          amount: 29,
          currency: 'ILS',
          externalInvoiceId: 'txn-1',
        }),
      );
    });

    it('should handle recurring_canceled event', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', providerKind: 'sumit' };
      mockSubscriptionFound(mockSub);
      MockSubscriptionsService.updateSubscriptionStatus.mockResolvedValue({ _id: 'sub-1', status: 'canceled' } as any);

      await WebhookService.processWebhook('sumit', {}, {
        EventId: 'evt-sumit-2',
        EventType: 'recurring_canceled',
        RecurringPaymentId: 'rp-1',
        CustomData: JSON.stringify({ tenant: 'tenant-1' }),
      });

      expect(MockSubscriptionsService.updateSubscriptionStatus).toHaveBeenCalledWith(
        'tenant-1', 'sub-1', 'canceled',
      );
    });
  });
});
