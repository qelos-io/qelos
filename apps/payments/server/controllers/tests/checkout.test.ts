import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const initiateCheckoutMock = mock.fn();
const cancelCheckoutSubscriptionMock = mock.fn();
const getSubscriptionByIdMock = mock.fn();
const createSubscriptionMock = mock.fn();

mock.module('../../services/checkout-service', {
  namedExports: {
    initiateCheckout: initiateCheckoutMock,
    cancelCheckoutSubscription: cancelCheckoutSubscriptionMock,
    calculateDiscountedPrice: mock.fn(),
    activateSubscription: mock.fn(),
    createInvoiceForPayment: mock.fn(),
  },
});

mock.module('../../services/subscriptions-service', {
  namedExports: {
    getSubscriptionById: getSubscriptionByIdMock,
    createSubscription: createSubscriptionMock,
    listSubscriptions: mock.fn(),
    getActiveSubscription: mock.fn(),
    updateSubscriptionStatus: mock.fn(),
    cancelSubscription: mock.fn(),
    setDynamicAmount: mock.fn(),
  },
});

function mockReq(overrides: any = {}) {
  return {
    headers: { tenant: 'tenant-1' },
    params: {},
    query: {},
    body: {},
    user: { _id: 'user-1', workspace: 'ws-1', billableEntityType: 'user' },
    ...overrides,
  };
}

function mockRes() {
  const res: any = {};
  res.end = mock.fn(() => res);
  res.json = mock.fn(() => res);
  res.status = mock.fn(() => res);
  return res;
}

describe('checkout controller', async () => {
  const CheckoutController = await import('../checkout');

  beforeEach(() => {
    initiateCheckoutMock.mock.resetCalls();
    cancelCheckoutSubscriptionMock.mock.resetCalls();
    getSubscriptionByIdMock.mock.resetCalls();
    createSubscriptionMock.mock.resetCalls();
  });

  describe('initiateCheckout', () => {
    it('should return 200 with checkout result', async () => {
      const checkoutResult = { subscriptionId: 'sub-1', checkoutUrl: 'https://checkout.paddle.com/xxx' };
      initiateCheckoutMock.mock.mockImplementation(async () => checkoutResult);

      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], checkoutResult);
    });

    it('should return 400 when planId and subscriptionId are both missing', async () => {
      const req = mockReq({ body: { billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.strictEqual(initiateCheckoutMock.mock.calls.length, 0);
    });

    it('should return 400 when billingCycle is missing for inline checkout', async () => {
      const req = mockReq({ body: { planId: 'plan-1' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should return 400 when billingCycle is invalid', async () => {
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'weekly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should use user as default billable entity type', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => ({ subscriptionId: 'sub-1', checkoutUrl: 'url' }));

      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      assert.strictEqual(initiateCheckoutMock.mock.calls.length, 1);
      const params = initiateCheckoutMock.mock.calls[0].arguments[1];
      assert.strictEqual(params.billableEntityType, 'user');
      assert.strictEqual(params.billableEntityId, 'user-1');
    });

    it('should accept explicit billable entity', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => ({ subscriptionId: 'sub-1', checkoutUrl: 'url' }));

      const req = mockReq({
        body: {
          planId: 'plan-1',
          billingCycle: 'yearly',
          billableEntityType: 'workspace',
          billableEntityId: 'ws-1',
        },
      });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      const params = initiateCheckoutMock.mock.calls[0].arguments[1];
      assert.strictEqual(params.billableEntityType, 'workspace');
      assert.strictEqual(params.billableEntityId, 'ws-1');
    });

    it('should return 400 when billable entity cannot be determined', async () => {
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' }, user: {} });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should pass couponCode and URLs to service', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => ({ subscriptionId: 'sub-1', checkoutUrl: 'url' }));

      const req = mockReq({
        body: {
          planId: 'plan-1',
          billingCycle: 'monthly',
          couponCode: 'SAVE20',
          successUrl: 'https://example.com/ok',
          cancelUrl: 'https://example.com/cancel',
        },
      });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      const params = initiateCheckoutMock.mock.calls[0].arguments[1];
      assert.strictEqual(params.couponCode, 'SAVE20');
      assert.strictEqual(params.successUrl, 'https://example.com/ok');
      assert.strictEqual(params.cancelUrl, 'https://example.com/cancel');
    });

    it('should strip amount for non-privileged users', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => ({ subscriptionId: 'sub-1', checkoutUrl: 'url' }));

      // Non-privileged user sends amount — it must be ignored
      const req = mockReq({
        body: { planId: 'plan-1', billingCycle: 'monthly', amount: 199 },
      });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      // The admin convenience path (planId + amount) must NOT have been taken
      assert.strictEqual(createSubscriptionMock.mock.calls.length, 0);
    });

    it('should initiate checkout using existing subscriptionId', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => ({
        subscriptionId: 'sub-pending-1',
        checkoutUrl: 'url',
      }));

      const req = mockReq({ body: { subscriptionId: 'sub-pending-1' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const params = initiateCheckoutMock.mock.calls[0].arguments[1];
      assert.strictEqual(params.subscriptionId, 'sub-pending-1');
    });

    it('should handle admin convenience checkout — create pending subscription then checkout', async () => {
      const pendingSub = { _id: 'sub-new', _id_str: 'sub-new', status: 'pending' };
      pendingSub['toString'] = () => 'sub-new';
      Object.defineProperty(pendingSub, '_id', { value: { toString: () => 'sub-new' } });
      createSubscriptionMock.mock.mockImplementation(async () => pendingSub);
      initiateCheckoutMock.mock.mockImplementation(async () => ({ subscriptionId: 'sub-new', checkoutUrl: 'url' }));

      const req = mockReq({
        body: { planId: 'plan-1', billingCycle: 'monthly', amount: 149 },
        user: { _id: 'admin-1', isPrivileged: true },
      });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      assert.strictEqual(createSubscriptionMock.mock.calls.length, 1);
      const subData = createSubscriptionMock.mock.calls[0].arguments[1];
      assert.strictEqual(subData.dynamicAmount, 149);
      assert.strictEqual(subData.status, 'pending');
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });

    it('should return 400 for AMOUNT_REQUIRED', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => { throw { code: 'AMOUNT_REQUIRED' }; });
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should return 400 for DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => { throw { code: 'DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION' }; });
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should return 400 for DYNAMIC_PLAN_UNSUPPORTED_PROVIDER', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => { throw { code: 'DYNAMIC_PLAN_UNSUPPORTED_PROVIDER' }; });
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should return 404 for PLAN_NOT_FOUND', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => { throw { code: 'PLAN_NOT_FOUND' }; });
      const req = mockReq({ body: { planId: 'bad', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it('should return 409 for ACTIVE_SUBSCRIPTION_EXISTS', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => { throw { code: 'ACTIVE_SUBSCRIPTION_EXISTS' }; });
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 409);
    });

    it('should return 400 for COUPON_EXPIRED', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => { throw { code: 'COUPON_EXPIRED' }; });
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly', couponCode: 'OLD' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should return 500 for PAYMENTS_NOT_CONFIGURED', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => { throw { code: 'PAYMENTS_NOT_CONFIGURED' }; });
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it('should return 500 for unknown errors', async () => {
      initiateCheckoutMock.mock.mockImplementation(async () => { throw new Error('unexpected'); });
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe('cancelSubscription', () => {
    const ownedSubscription = { _id: 'sub-1', billableEntityId: 'ws-1', status: 'active' };

    it('should cancel subscription and return 200', async () => {
      const result = { _id: 'sub-1', status: 'canceled' };
      getSubscriptionByIdMock.mock.mockImplementation(async () => ownedSubscription);
      cancelCheckoutSubscriptionMock.mock.mockImplementation(async () => result);

      const req = mockReq({ params: { subscriptionId: 'sub-1' } });
      const res = mockRes();
      await CheckoutController.cancelSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], result);
    });

    it('should return 403 when user does not own subscription', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => ({
        _id: 'sub-1',
        billableEntityId: 'other-entity',
      }));

      const req = mockReq({ params: { subscriptionId: 'sub-1' } });
      const res = mockRes();
      await CheckoutController.cancelSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    });

    it('should return 404 when subscription not found', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => {
        throw { code: 'SUBSCRIPTION_NOT_FOUND' };
      });

      const req = mockReq({ params: { subscriptionId: 'nonexistent' } });
      const res = mockRes();
      await CheckoutController.cancelSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it('should return 500 on unexpected error', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => ownedSubscription);
      cancelCheckoutSubscriptionMock.mock.mockImplementation(async () => { throw new Error('fail'); });

      const req = mockReq({ params: { subscriptionId: 'sub-1' } });
      const res = mockRes();
      await CheckoutController.cancelSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it('should allow privileged user to cancel any subscription', async () => {
      const result = { _id: 'sub-1', status: 'canceled' };
      cancelCheckoutSubscriptionMock.mock.mockImplementation(async () => result);

      const req = mockReq({
        params: { subscriptionId: 'sub-1' },
        user: { _id: 'admin-1', isPrivileged: true },
      });
      const res = mockRes();
      await CheckoutController.cancelSubscription(req, res);

      // Privileged path skips ownership check, getSubscriptionById not called
      assert.strictEqual(getSubscriptionByIdMock.mock.calls.length, 0);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });
  });
});
