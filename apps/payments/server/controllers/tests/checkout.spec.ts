import * as CheckoutController from '../checkout';
import * as CheckoutService from '../../services/checkout-service';
import * as SubscriptionsService from '../../services/subscriptions-service';

jest.mock('../../services/checkout-service');
jest.mock('../../services/subscriptions-service');

const MockCheckoutService = CheckoutService as any;
const MockSubscriptionsService = SubscriptionsService as any;

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
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('checkout controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateCheckout', () => {
    it('should return 200 with checkout result', async () => {
      const checkoutResult = {
        subscriptionId: 'sub-1',
        checkoutUrl: 'https://checkout.paddle.com/xxx',
      };
      MockCheckoutService.initiateCheckout.mockResolvedValue(checkoutResult);

      const req = mockReq({
        body: { planId: 'plan-1', billingCycle: 'monthly' },
      });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(checkoutResult);
    });

    it('should return 400 when planId is missing', async () => {
      const req = mockReq({ body: { billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(MockCheckoutService.initiateCheckout).not.toHaveBeenCalled();
    });

    it('should return 400 when billingCycle is missing', async () => {
      const req = mockReq({ body: { planId: 'plan-1' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when billingCycle is invalid', async () => {
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'weekly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should use user as default billable entity type', async () => {
      MockCheckoutService.initiateCheckout.mockResolvedValue({
        subscriptionId: 'sub-1',
        checkoutUrl: 'url',
      });

      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(MockCheckoutService.initiateCheckout).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          billableEntityType: 'user',
          billableEntityId: 'user-1',
        }),
      );
    });

    it('should accept explicit billable entity', async () => {
      MockCheckoutService.initiateCheckout.mockResolvedValue({
        subscriptionId: 'sub-1',
        checkoutUrl: 'url',
      });

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

      expect(MockCheckoutService.initiateCheckout).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          billableEntityType: 'workspace',
          billableEntityId: 'ws-1',
        }),
      );
    });

    it('should return 400 when billable entity cannot be determined', async () => {
      const req = mockReq({
        body: { planId: 'plan-1', billingCycle: 'monthly' },
        user: {},
      });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should pass couponCode and URLs to service', async () => {
      MockCheckoutService.initiateCheckout.mockResolvedValue({
        subscriptionId: 'sub-1',
        checkoutUrl: 'url',
      });

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

      expect(MockCheckoutService.initiateCheckout).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          couponCode: 'SAVE20',
          successUrl: 'https://example.com/ok',
          cancelUrl: 'https://example.com/cancel',
        }),
      );
    });

    it('should return 404 for PLAN_NOT_FOUND', async () => {
      MockCheckoutService.initiateCheckout.mockRejectedValue({ code: 'PLAN_NOT_FOUND' });

      const req = mockReq({ body: { planId: 'bad', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 409 for ACTIVE_SUBSCRIPTION_EXISTS', async () => {
      MockCheckoutService.initiateCheckout.mockRejectedValue({ code: 'ACTIVE_SUBSCRIPTION_EXISTS' });

      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should return 400 for coupon errors', async () => {
      MockCheckoutService.initiateCheckout.mockRejectedValue({ code: 'COUPON_EXPIRED' });

      const req = mockReq({
        body: { planId: 'plan-1', billingCycle: 'monthly', couponCode: 'OLD' },
      });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for PAYMENTS_NOT_CONFIGURED', async () => {
      MockCheckoutService.initiateCheckout.mockRejectedValue({ code: 'PAYMENTS_NOT_CONFIGURED' });

      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 500 for unknown errors', async () => {
      MockCheckoutService.initiateCheckout.mockRejectedValue(new Error('unexpected'));

      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' } });
      const res = mockRes();
      await CheckoutController.initiateCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('cancelSubscription', () => {
    const ownedSubscription = {
      _id: 'sub-1',
      billableEntityId: 'ws-1',
      status: 'active',
    };

    it('should cancel subscription and return 200', async () => {
      const result = { _id: 'sub-1', status: 'canceled' };
      MockSubscriptionsService.getSubscriptionById.mockResolvedValue(ownedSubscription as any);
      MockCheckoutService.cancelCheckoutSubscription.mockResolvedValue(result as any);

      const req = mockReq({ params: { subscriptionId: 'sub-1' } });
      const res = mockRes();
      await CheckoutController.cancelSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('should return 403 when user does not own subscription', async () => {
      MockSubscriptionsService.getSubscriptionById.mockResolvedValue({
        _id: 'sub-1',
        billableEntityId: 'other-entity',
      } as any);

      const req = mockReq({ params: { subscriptionId: 'sub-1' } });
      const res = mockRes();
      await CheckoutController.cancelSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when subscription not found', async () => {
      MockSubscriptionsService.getSubscriptionById.mockRejectedValue({
        code: 'SUBSCRIPTION_NOT_FOUND',
      });

      const req = mockReq({ params: { subscriptionId: 'nonexistent' } });
      const res = mockRes();
      await CheckoutController.cancelSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      MockSubscriptionsService.getSubscriptionById.mockResolvedValue(ownedSubscription as any);
      MockCheckoutService.cancelCheckoutSubscription.mockRejectedValue(new Error('fail'));

      const req = mockReq({ params: { subscriptionId: 'sub-1' } });
      const res = mockRes();
      await CheckoutController.cancelSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
