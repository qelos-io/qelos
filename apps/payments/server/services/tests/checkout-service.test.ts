import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const getPlanByIdMock = mock.fn();
const getActiveSubscriptionMock = mock.fn();
const createSubscriptionMock = mock.fn();
const updateSubscriptionStatusMock = mock.fn();
const createInvoiceMock = mock.fn();
const validateCouponMock = mock.fn();
const redeemCouponMock = mock.fn();
const getPaymentsConfigurationMock = mock.fn();
const createCheckoutMock = mock.fn();
const cancelProviderSubscriptionMock = mock.fn();
const getSubscriptionByIdMock = mock.fn();

mock.module('../plans-service', {
  namedExports: {
    getPlanById: getPlanByIdMock,
    listPlans: mock.fn(),
    getPublicPlans: mock.fn(),
    createPlan: mock.fn(),
    updatePlan: mock.fn(),
    deactivatePlan: mock.fn(),
  },
});

mock.module('../subscriptions-service', {
  namedExports: {
    getActiveSubscription: getActiveSubscriptionMock,
    createSubscription: createSubscriptionMock,
    updateSubscriptionStatus: updateSubscriptionStatusMock,
    getSubscriptionById: getSubscriptionByIdMock,
    listSubscriptions: mock.fn(),
    cancelSubscription: mock.fn(),
  },
});

mock.module('../invoices-service', {
  namedExports: {
    createInvoice: createInvoiceMock,
    listInvoices: mock.fn(),
    getInvoiceById: mock.fn(),
    listByEntity: mock.fn(),
    updateInvoiceStatus: mock.fn(),
  },
});

mock.module('../coupons-service', {
  namedExports: {
    validateCoupon: validateCouponMock,
    redeemCoupon: redeemCouponMock,
    createCoupon: mock.fn(),
    listCoupons: mock.fn(),
    getCouponById: mock.fn(),
    updateCoupon: mock.fn(),
    deactivateCoupon: mock.fn(),
  },
});

mock.module('../provider-adapter', {
  namedExports: {
    getPaymentsConfiguration: getPaymentsConfigurationMock,
    createCheckout: createCheckoutMock,
    cancelProviderSubscription: cancelProviderSubscriptionMock,
    verifyPayPalWebhook: mock.fn(),
    getProviderSubscription: mock.fn(),
  },
});

describe('checkout-service', async () => {
  const CheckoutService = await import('../checkout-service');

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

  const mockConfig = {
    providerSourceId: 'source-1',
    providerKind: 'paddle',
    successUrl: 'https://app.example.com/success',
    cancelUrl: 'https://app.example.com/cancel',
  };

  const defaultParams: any = {
    planId: 'plan-1',
    billingCycle: 'monthly',
    billableEntityType: 'user',
    billableEntityId: 'user-1',
  };

  beforeEach(() => {
    getPlanByIdMock.mock.resetCalls();
    getActiveSubscriptionMock.mock.resetCalls();
    createSubscriptionMock.mock.resetCalls();
    updateSubscriptionStatusMock.mock.resetCalls();
    createInvoiceMock.mock.resetCalls();
    validateCouponMock.mock.resetCalls();
    redeemCouponMock.mock.resetCalls();
    getPaymentsConfigurationMock.mock.resetCalls();
    createCheckoutMock.mock.resetCalls();
    cancelProviderSubscriptionMock.mock.resetCalls();
    getSubscriptionByIdMock.mock.resetCalls();

    getPlanByIdMock.mock.mockImplementation(async () => mockPlan);
    getActiveSubscriptionMock.mock.mockImplementation(async () => null);
    getPaymentsConfigurationMock.mock.mockImplementation(async () => mockConfig);
    createCheckoutMock.mock.mockImplementation(async () => ({
      checkoutUrl: 'https://checkout.paddle.com/xxx',
      externalSubscriptionId: 'sub-ext-1',
      providerData: {},
    }));
    createSubscriptionMock.mock.mockImplementation(async () => ({
      _id: 'sub-1',
      planId: 'plan-1',
      status: 'pending',
    }));
  });

  describe('calculateDiscountedPrice', () => {
    it('should apply percentage discount', () => {
      const result = CheckoutService.calculateDiscountedPrice(100, { discountType: 'percentage', discountValue: 20 });
      assert.strictEqual(result, 80);
    });

    it('should apply fixed discount', () => {
      const result = CheckoutService.calculateDiscountedPrice(100, { discountType: 'fixed', discountValue: 15 });
      assert.strictEqual(result, 85);
    });

    it('should not go below zero for fixed discount', () => {
      const result = CheckoutService.calculateDiscountedPrice(10, { discountType: 'fixed', discountValue: 25 });
      assert.strictEqual(result, 0);
    });

    it('should handle 100% discount', () => {
      const result = CheckoutService.calculateDiscountedPrice(50, { discountType: 'percentage', discountValue: 100 });
      assert.strictEqual(result, 0);
    });

    it('should round to two decimal places', () => {
      const result = CheckoutService.calculateDiscountedPrice(99.99, { discountType: 'percentage', discountValue: 33 });
      assert.strictEqual(result, 66.99);
    });

    it('should return base price for unknown discount type', () => {
      const result = CheckoutService.calculateDiscountedPrice(100, { discountType: 'unknown', discountValue: 10 });
      assert.strictEqual(result, 100);
    });
  });

  describe('initiateCheckout', () => {
    it('should initiate checkout successfully', async () => {
      const result = await CheckoutService.initiateCheckout('tenant-1', defaultParams);

      assert.strictEqual(result.subscriptionId, 'sub-1');
      assert.strictEqual(result.checkoutUrl, 'https://checkout.paddle.com/xxx');
      assert.strictEqual(getPlanByIdMock.mock.calls.length, 1);
      assert.deepStrictEqual(getPlanByIdMock.mock.calls[0].arguments, ['tenant-1', 'plan-1']);
    });

    it('should use monthly price for monthly billing cycle', async () => {
      await CheckoutService.initiateCheckout('tenant-1', defaultParams);
      const checkoutArgs = createCheckoutMock.mock.calls[0].arguments;
      assert.strictEqual(checkoutArgs[3].amount, 29);
    });

    it('should use yearly price for yearly billing cycle', async () => {
      await CheckoutService.initiateCheckout('tenant-1', { ...defaultParams, billingCycle: 'yearly' });
      const checkoutArgs = createCheckoutMock.mock.calls[0].arguments;
      assert.strictEqual(checkoutArgs[3].amount, 290);
    });

    it('should throw PLAN_NOT_ACTIVE when plan is inactive', async () => {
      getPlanByIdMock.mock.mockImplementation(async () => ({ ...mockPlan, isActive: false }));

      await assert.rejects(() => CheckoutService.initiateCheckout('tenant-1', defaultParams), (e: any) => {
        assert.strictEqual(e.code, 'PLAN_NOT_ACTIVE');
        return true;
      });
    });

    it('should throw ACTIVE_SUBSCRIPTION_EXISTS when there is an active subscription', async () => {
      getActiveSubscriptionMock.mock.mockImplementation(async () => ({ _id: 'existing-sub' }));

      await assert.rejects(() => CheckoutService.initiateCheckout('tenant-1', defaultParams), (e: any) => {
        assert.strictEqual(e.code, 'ACTIVE_SUBSCRIPTION_EXISTS');
        return true;
      });
    });

    it('should validate and apply coupon when provided', async () => {
      validateCouponMock.mock.mockImplementation(async () => ({ _id: 'coupon-1', discountType: 'percentage', discountValue: 50 }));

      await CheckoutService.initiateCheckout('tenant-1', { ...defaultParams, couponCode: 'HALF_OFF' });

      assert.strictEqual(validateCouponMock.mock.calls.length, 1);
      assert.deepStrictEqual(validateCouponMock.mock.calls[0].arguments, ['tenant-1', 'HALF_OFF', 'plan-1']);
      assert.strictEqual(createCheckoutMock.mock.calls[0].arguments[3].amount, 14.5);
    });

    it('should store coupon metadata in subscription', async () => {
      validateCouponMock.mock.mockImplementation(async () => ({ _id: 'coupon-1', discountType: 'fixed', discountValue: 5 }));

      await CheckoutService.initiateCheckout('tenant-1', { ...defaultParams, couponCode: 'SAVE5' });

      const subArgs = createSubscriptionMock.mock.calls[0].arguments[1];
      assert.strictEqual(subArgs.couponId, 'coupon-1');
      assert.strictEqual(subArgs.metadata.originalPrice, 29);
      assert.strictEqual(subArgs.metadata.finalPrice, 24);
      assert.strictEqual(subArgs.metadata.couponCode, 'SAVE5');
    });

    it('should create subscription with pending status', async () => {
      await CheckoutService.initiateCheckout('tenant-1', defaultParams);
      assert.strictEqual(createSubscriptionMock.mock.calls[0].arguments[1].status, 'pending');
    });

    it('should propagate coupon validation errors', async () => {
      validateCouponMock.mock.mockImplementation(async () => { throw { code: 'COUPON_EXPIRED', message: 'coupon has expired' }; });

      await assert.rejects(() => CheckoutService.initiateCheckout('tenant-1', { ...defaultParams, couponCode: 'EXPIRED' }), (e: any) => {
        assert.strictEqual(e.code, 'COUPON_EXPIRED');
        return true;
      });
    });

    it('should use config URLs when request URLs not provided', async () => {
      await CheckoutService.initiateCheckout('tenant-1', defaultParams);
      const checkoutArgs = createCheckoutMock.mock.calls[0].arguments[3];
      assert.strictEqual(checkoutArgs.successUrl, 'https://app.example.com/success');
      assert.strictEqual(checkoutArgs.cancelUrl, 'https://app.example.com/cancel');
    });

    it('should prefer request URLs over config URLs', async () => {
      await CheckoutService.initiateCheckout('tenant-1', {
        ...defaultParams,
        successUrl: 'https://custom.example.com/done',
        cancelUrl: 'https://custom.example.com/back',
      });
      const checkoutArgs = createCheckoutMock.mock.calls[0].arguments[3];
      assert.strictEqual(checkoutArgs.successUrl, 'https://custom.example.com/done');
      assert.strictEqual(checkoutArgs.cancelUrl, 'https://custom.example.com/back');
    });
  });

  describe('activateSubscription', () => {
    it('should update subscription to active and redeem coupon', async () => {
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({
        _id: 'sub-1', status: 'active', couponId: 'coupon-1',
      }));
      redeemCouponMock.mock.mockImplementation(async () => ({}));

      const result = await CheckoutService.activateSubscription('tenant-1', 'sub-1', {
        currentPeriodStart: new Date('2026-01-01'),
        currentPeriodEnd: new Date('2026-02-01'),
      });

      assert.strictEqual(result.status, 'active');
      assert.strictEqual(updateSubscriptionStatusMock.mock.calls[0].arguments[2], 'active');
      assert.strictEqual(redeemCouponMock.mock.calls.length, 1);
      assert.deepStrictEqual(redeemCouponMock.mock.calls[0].arguments, ['tenant-1', 'coupon-1']);
    });

    it('should not fail if coupon redemption fails', async () => {
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({
        _id: 'sub-1', status: 'active', couponId: 'coupon-1',
      }));
      redeemCouponMock.mock.mockImplementation(async () => { throw new Error('failed'); });

      const result = await CheckoutService.activateSubscription('tenant-1', 'sub-1');
      assert.strictEqual(result.status, 'active');
    });

    it('should skip coupon redemption when no couponId', async () => {
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({
        _id: 'sub-1', status: 'active',
      }));

      await CheckoutService.activateSubscription('tenant-1', 'sub-1');
      assert.strictEqual(redeemCouponMock.mock.calls.length, 0);
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

      createInvoiceMock.mock.mockImplementation(async () => ({ _id: 'inv-1' }));

      await CheckoutService.createInvoiceForPayment('tenant-1', mockSubscription, {
        amount: 29,
        currency: 'USD',
        externalInvoiceId: 'ext-inv-1',
      });

      assert.strictEqual(createInvoiceMock.mock.calls.length, 1);
      const invoiceArgs = createInvoiceMock.mock.calls[0].arguments[1];
      assert.strictEqual(invoiceArgs.subscriptionId, 'sub-1');
      assert.strictEqual(invoiceArgs.billableEntityType, 'user');
      assert.strictEqual(invoiceArgs.amount, 29);
      assert.strictEqual(invoiceArgs.status, 'paid');
      assert.strictEqual(invoiceArgs.providerKind, 'paddle');
    });
  });

  describe('cancelCheckoutSubscription', () => {
    it('should cancel subscription at provider and locally', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => ({
        _id: 'sub-1',
        externalSubscriptionId: 'ext-sub-1',
        providerKind: 'paddle',
        providerId: 'source-1',
      }));
      cancelProviderSubscriptionMock.mock.mockImplementation(async () => ({ success: true, providerData: {} }));
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'canceled' }));

      const result = await CheckoutService.cancelCheckoutSubscription('tenant-1', 'sub-1');
      assert.strictEqual(result.status, 'canceled');
      assert.strictEqual(cancelProviderSubscriptionMock.mock.calls.length, 1);
      assert.deepStrictEqual(cancelProviderSubscriptionMock.mock.calls[0].arguments, [
        'tenant-1', 'source-1', 'paddle', 'ext-sub-1',
      ]);
    });

    it('should cancel locally even if provider cancellation fails', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => ({
        _id: 'sub-1',
        externalSubscriptionId: 'ext-sub-1',
        providerKind: 'paddle',
        providerId: 'source-1',
      }));
      cancelProviderSubscriptionMock.mock.mockImplementation(async () => { throw new Error('provider error'); });
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'canceled' }));

      const result = await CheckoutService.cancelCheckoutSubscription('tenant-1', 'sub-1');
      assert.strictEqual(result.status, 'canceled');
    });

    it('should skip provider call when no external subscription', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => ({
        _id: 'sub-1',
        externalSubscriptionId: null,
        providerKind: null,
        providerId: null,
      }));
      updateSubscriptionStatusMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'canceled' }));

      await CheckoutService.cancelCheckoutSubscription('tenant-1', 'sub-1');
      assert.strictEqual(cancelProviderSubscriptionMock.mock.calls.length, 0);
    });
  });
});
