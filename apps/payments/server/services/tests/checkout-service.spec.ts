import * as CheckoutService from '../checkout-service';
import * as PlansService from '../plans-service';
import * as SubscriptionsService from '../subscriptions-service';
import * as InvoicesService from '../invoices-service';
import * as CouponsService from '../coupons-service';
import * as ProviderAdapter from '../provider-adapter';

jest.mock('../plans-service');
jest.mock('../subscriptions-service');
jest.mock('../invoices-service');
jest.mock('../coupons-service');
jest.mock('../provider-adapter');

const MockPlans = PlansService as jest.Mocked<typeof PlansService>;
const MockSubscriptions = SubscriptionsService as jest.Mocked<typeof SubscriptionsService>;
const MockInvoices = InvoicesService as jest.Mocked<typeof InvoicesService>;
const MockCoupons = CouponsService as jest.Mocked<typeof CouponsService>;
const MockProvider = ProviderAdapter as jest.Mocked<typeof ProviderAdapter>;

describe('checkout-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPlan = {
    _id: 'plan-1',
    tenant: 'tenant-1',
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 290,
    currency: 'USD',
    isActive: true,
    features: [],
    externalIds: {
      paddle: { productId: 'prod-1', monthlyPriceId: 'pri-monthly', yearlyPriceId: 'pri-yearly' },
    },
  };

  const mockConfig: ProviderAdapter.PaymentsConfiguration = {
    providerSourceId: 'source-1',
    providerKind: 'paddle',
    successUrl: 'https://app.example.com/success',
    cancelUrl: 'https://app.example.com/cancel',
  };

  const defaultParams: CheckoutService.InitiateCheckoutParams = {
    planId: 'plan-1',
    billingCycle: 'monthly',
    billableEntityType: 'user',
    billableEntityId: 'user-1',
  };

  describe('calculateDiscountedPrice', () => {
    it('should apply percentage discount', () => {
      const result = CheckoutService.calculateDiscountedPrice(100, { discountType: 'percentage', discountValue: 20 });
      expect(result).toBe(80);
    });

    it('should apply fixed discount', () => {
      const result = CheckoutService.calculateDiscountedPrice(100, { discountType: 'fixed', discountValue: 15 });
      expect(result).toBe(85);
    });

    it('should not go below zero for fixed discount', () => {
      const result = CheckoutService.calculateDiscountedPrice(10, { discountType: 'fixed', discountValue: 25 });
      expect(result).toBe(0);
    });

    it('should handle 100% discount', () => {
      const result = CheckoutService.calculateDiscountedPrice(50, { discountType: 'percentage', discountValue: 100 });
      expect(result).toBe(0);
    });

    it('should round to two decimal places', () => {
      const result = CheckoutService.calculateDiscountedPrice(99.99, { discountType: 'percentage', discountValue: 33 });
      expect(result).toBe(66.99);
    });

    it('should return base price for unknown discount type', () => {
      const result = CheckoutService.calculateDiscountedPrice(100, { discountType: 'unknown', discountValue: 10 });
      expect(result).toBe(100);
    });
  });

  describe('initiateCheckout', () => {
    beforeEach(() => {
      MockPlans.getPlanById.mockResolvedValue(mockPlan);
      MockSubscriptions.getActiveSubscription.mockResolvedValue(null);
      MockProvider.getPaymentsConfiguration.mockResolvedValue(mockConfig);
      MockProvider.createCheckout.mockResolvedValue({
        checkoutUrl: 'https://checkout.paddle.com/xxx',
        externalSubscriptionId: 'sub-ext-1',
        providerData: {},
      });
      MockSubscriptions.createSubscription.mockResolvedValue({
        _id: 'sub-1',
        planId: 'plan-1',
        status: 'pending',
      } as any);
    });

    it('should initiate checkout successfully', async () => {
      const result = await CheckoutService.initiateCheckout('tenant-1', defaultParams);

      expect(result.subscriptionId).toBe('sub-1');
      expect(result.checkoutUrl).toBe('https://checkout.paddle.com/xxx');
      expect(MockPlans.getPlanById).toHaveBeenCalledWith('tenant-1', 'plan-1');
      expect(MockSubscriptions.getActiveSubscription).toHaveBeenCalledWith('tenant-1', 'user', 'user-1');
    });

    it('should use monthly price for monthly billing cycle', async () => {
      await CheckoutService.initiateCheckout('tenant-1', defaultParams);

      expect(MockProvider.createCheckout).toHaveBeenCalledWith(
        'tenant-1',
        'source-1',
        'paddle',
        expect.objectContaining({ amount: 29 }),
      );
    });

    it('should use yearly price for yearly billing cycle', async () => {
      await CheckoutService.initiateCheckout('tenant-1', {
        ...defaultParams,
        billingCycle: 'yearly',
      });

      expect(MockProvider.createCheckout).toHaveBeenCalledWith(
        'tenant-1',
        'source-1',
        'paddle',
        expect.objectContaining({ amount: 290 }),
      );
    });

    it('should throw PLAN_NOT_ACTIVE when plan is inactive', async () => {
      MockPlans.getPlanById.mockResolvedValue({ ...mockPlan, isActive: false });

      try {
        await CheckoutService.initiateCheckout('tenant-1', defaultParams);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('PLAN_NOT_ACTIVE');
      }
    });

    it('should throw ACTIVE_SUBSCRIPTION_EXISTS when there is an active subscription', async () => {
      MockSubscriptions.getActiveSubscription.mockResolvedValue({ _id: 'existing-sub' });

      try {
        await CheckoutService.initiateCheckout('tenant-1', defaultParams);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('ACTIVE_SUBSCRIPTION_EXISTS');
      }
    });

    it('should validate and apply coupon when provided', async () => {
      const mockCoupon = { _id: 'coupon-1', discountType: 'percentage', discountValue: 50 };
      MockCoupons.validateCoupon.mockResolvedValue(mockCoupon as any);

      await CheckoutService.initiateCheckout('tenant-1', {
        ...defaultParams,
        couponCode: 'HALF_OFF',
      });

      expect(MockCoupons.validateCoupon).toHaveBeenCalledWith('tenant-1', 'HALF_OFF', 'plan-1');
      expect(MockProvider.createCheckout).toHaveBeenCalledWith(
        'tenant-1',
        'source-1',
        'paddle',
        expect.objectContaining({ amount: 14.5 }),
      );
    });

    it('should store coupon metadata in subscription', async () => {
      const mockCoupon = { _id: 'coupon-1', discountType: 'fixed', discountValue: 5 };
      MockCoupons.validateCoupon.mockResolvedValue(mockCoupon as any);

      await CheckoutService.initiateCheckout('tenant-1', {
        ...defaultParams,
        couponCode: 'SAVE5',
      });

      expect(MockSubscriptions.createSubscription).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          couponId: 'coupon-1',
          metadata: expect.objectContaining({
            originalPrice: 29,
            finalPrice: 24,
            couponCode: 'SAVE5',
          }),
        }),
      );
    });

    it('should create subscription with pending status', async () => {
      await CheckoutService.initiateCheckout('tenant-1', defaultParams);

      expect(MockSubscriptions.createSubscription).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ status: 'pending' }),
      );
    });

    it('should propagate coupon validation errors', async () => {
      MockCoupons.validateCoupon.mockRejectedValue({ code: 'COUPON_EXPIRED', message: 'coupon has expired' });

      try {
        await CheckoutService.initiateCheckout('tenant-1', { ...defaultParams, couponCode: 'EXPIRED' });
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('COUPON_EXPIRED');
      }
    });

    it('should use config URLs when request URLs not provided', async () => {
      await CheckoutService.initiateCheckout('tenant-1', defaultParams);

      expect(MockProvider.createCheckout).toHaveBeenCalledWith(
        'tenant-1',
        'source-1',
        'paddle',
        expect.objectContaining({
          successUrl: 'https://app.example.com/success',
          cancelUrl: 'https://app.example.com/cancel',
        }),
      );
    });

    it('should prefer request URLs over config URLs', async () => {
      await CheckoutService.initiateCheckout('tenant-1', {
        ...defaultParams,
        successUrl: 'https://custom.example.com/done',
        cancelUrl: 'https://custom.example.com/back',
      });

      expect(MockProvider.createCheckout).toHaveBeenCalledWith(
        'tenant-1',
        'source-1',
        'paddle',
        expect.objectContaining({
          successUrl: 'https://custom.example.com/done',
          cancelUrl: 'https://custom.example.com/back',
        }),
      );
    });
  });

  describe('activateSubscription', () => {
    it('should update subscription to active and redeem coupon', async () => {
      MockSubscriptions.updateSubscriptionStatus.mockResolvedValue({
        _id: 'sub-1',
        status: 'active',
        couponId: 'coupon-1',
      } as any);
      MockCoupons.redeemCoupon.mockResolvedValue({} as any);

      const result = await CheckoutService.activateSubscription('tenant-1', 'sub-1', {
        currentPeriodStart: new Date('2026-01-01'),
        currentPeriodEnd: new Date('2026-02-01'),
      });

      expect(result.status).toBe('active');
      expect(MockSubscriptions.updateSubscriptionStatus).toHaveBeenCalledWith(
        'tenant-1',
        'sub-1',
        'active',
        expect.objectContaining({
          currentPeriodStart: new Date('2026-01-01'),
          currentPeriodEnd: new Date('2026-02-01'),
        }),
      );
      expect(MockCoupons.redeemCoupon).toHaveBeenCalledWith('tenant-1', 'coupon-1');
    });

    it('should not fail if coupon redemption fails', async () => {
      MockSubscriptions.updateSubscriptionStatus.mockResolvedValue({
        _id: 'sub-1',
        status: 'active',
        couponId: 'coupon-1',
      } as any);
      MockCoupons.redeemCoupon.mockRejectedValue(new Error('failed'));

      const result = await CheckoutService.activateSubscription('tenant-1', 'sub-1');
      expect(result.status).toBe('active');
    });

    it('should skip coupon redemption when no couponId', async () => {
      MockSubscriptions.updateSubscriptionStatus.mockResolvedValue({
        _id: 'sub-1',
        status: 'active',
      } as any);

      await CheckoutService.activateSubscription('tenant-1', 'sub-1');
      expect(MockCoupons.redeemCoupon).not.toHaveBeenCalled();
    });
  });

  describe('createInvoiceForPayment', () => {
    it('should create an invoice for the subscription payment', async () => {
      const mockSubscription = {
        _id: 'sub-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        providerKind: 'paddle',
        billingCycle: 'monthly',
      };

      MockInvoices.createInvoice.mockResolvedValue({ _id: 'inv-1' } as any);

      await CheckoutService.createInvoiceForPayment('tenant-1', mockSubscription, {
        amount: 29,
        currency: 'USD',
        externalInvoiceId: 'ext-inv-1',
      });

      expect(MockInvoices.createInvoice).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          subscriptionId: 'sub-1',
          billableEntityType: 'user',
          billableEntityId: 'user-1',
          amount: 29,
          currency: 'USD',
          status: 'paid',
          externalInvoiceId: 'ext-inv-1',
          providerKind: 'paddle',
        }),
      );
    });
  });

  describe('cancelCheckoutSubscription', () => {
    it('should cancel subscription at provider and locally', async () => {
      MockSubscriptions.getSubscriptionById.mockResolvedValue({
        _id: 'sub-1',
        externalSubscriptionId: 'ext-sub-1',
        providerKind: 'paddle',
        providerId: 'source-1',
      } as any);
      MockProvider.getPaymentsConfiguration.mockResolvedValue(mockConfig);
      MockProvider.cancelProviderSubscription.mockResolvedValue({ success: true, providerData: {} });
      MockSubscriptions.updateSubscriptionStatus.mockResolvedValue({ _id: 'sub-1', status: 'canceled' } as any);

      const result = await CheckoutService.cancelCheckoutSubscription('tenant-1', 'sub-1');
      expect(result.status).toBe('canceled');
      expect(MockProvider.cancelProviderSubscription).toHaveBeenCalledWith(
        'tenant-1', 'source-1', 'paddle', 'ext-sub-1',
      );
    });

    it('should cancel locally even if provider cancellation fails', async () => {
      MockSubscriptions.getSubscriptionById.mockResolvedValue({
        _id: 'sub-1',
        externalSubscriptionId: 'ext-sub-1',
        providerKind: 'paddle',
        providerId: 'source-1',
      } as any);
      MockProvider.getPaymentsConfiguration.mockResolvedValue(mockConfig);
      MockProvider.cancelProviderSubscription.mockRejectedValue(new Error('provider error'));
      MockSubscriptions.updateSubscriptionStatus.mockResolvedValue({ _id: 'sub-1', status: 'canceled' } as any);

      const result = await CheckoutService.cancelCheckoutSubscription('tenant-1', 'sub-1');
      expect(result.status).toBe('canceled');
    });

    it('should skip provider call when no external subscription', async () => {
      MockSubscriptions.getSubscriptionById.mockResolvedValue({
        _id: 'sub-1',
        externalSubscriptionId: null,
        providerKind: null,
        providerId: null,
      } as any);
      MockSubscriptions.updateSubscriptionStatus.mockResolvedValue({ _id: 'sub-1', status: 'canceled' } as any);

      await CheckoutService.cancelCheckoutSubscription('tenant-1', 'sub-1');
      expect(MockProvider.cancelProviderSubscription).not.toHaveBeenCalled();
    });
  });
});
