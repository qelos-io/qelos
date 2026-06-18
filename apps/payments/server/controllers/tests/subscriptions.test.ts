import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const listSubscriptionsMock = mock.fn();
const getSubscriptionByIdMock = mock.fn();
const getActiveSubscriptionMock = mock.fn();
const createSubscriptionMock = mock.fn();
const setDynamicAmountMock = mock.fn();
const cancelSubscriptionMock = mock.fn();
const updateSubscriptionStatusMock = mock.fn();

mock.module('../../services/subscriptions-service', {
  namedExports: {
    listSubscriptions: listSubscriptionsMock,
    getSubscriptionById: getSubscriptionByIdMock,
    getActiveSubscription: getActiveSubscriptionMock,
    createSubscription: createSubscriptionMock,
    setDynamicAmount: setDynamicAmountMock,
    cancelSubscription: cancelSubscriptionMock,
    updateSubscriptionStatus: updateSubscriptionStatusMock,
  },
});

function mockReq(overrides: any = {}) {
  return {
    headers: { tenant: 'tenant-1' },
    params: {},
    query: {},
    body: {},
    user: { _id: 'user-1', workspace: 'ws-1' },
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

describe('subscriptions controller', async () => {
  const SubscriptionsController = await import('../subscriptions');

  beforeEach(() => {
    listSubscriptionsMock.mock.resetCalls();
    getSubscriptionByIdMock.mock.resetCalls();
    getActiveSubscriptionMock.mock.resetCalls();
    createSubscriptionMock.mock.resetCalls();
    setDynamicAmountMock.mock.resetCalls();
    cancelSubscriptionMock.mock.resetCalls();
    updateSubscriptionStatusMock.mock.resetCalls();
  });

  describe('getSubscriptions', () => {
    it('should return 200 with subscriptions for admin', async () => {
      const subscriptions = [{ _id: 'sub-1' }, { _id: 'sub-2' }];
      listSubscriptionsMock.mock.mockImplementation(async () => subscriptions);

      const req = mockReq({
        user: { _id: 'admin-1', isPrivileged: true },
        query: { billableEntityType: 'workspace', status: 'active' },
      });
      const res = mockRes();
      await SubscriptionsController.getSubscriptions(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], subscriptions);
      const filterArg = listSubscriptionsMock.mock.calls[0].arguments[1];
      assert.strictEqual(filterArg.billableEntityType, 'workspace');
      assert.strictEqual(filterArg.status, 'active');
    });

    it('should restrict non-admin to their own entity', async () => {
      listSubscriptionsMock.mock.mockImplementation(async () => []);

      const req = mockReq({
        query: {},
      });
      const res = mockRes();
      await SubscriptionsController.getSubscriptions(req, res);

      const filterArg = listSubscriptionsMock.mock.calls[0].arguments[1];
      assert.strictEqual(filterArg.billableEntityId, 'ws-1');
    });

    it('should return 500 on unexpected error', async () => {
      listSubscriptionsMock.mock.mockImplementation(async () => { throw new Error('db error'); });

      const req = mockReq();
      const res = mockRes();
      await SubscriptionsController.getSubscriptions(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe('getSubscription', () => {
    it('should return 200 with the subscription for the owner', async () => {
      const subscription = { _id: 'sub-1', billableEntityId: 'ws-1' };
      getSubscriptionByIdMock.mock.mockImplementation(async () => subscription);

      const req = mockReq({ params: { id: 'sub-1' } });
      const res = mockRes();
      await SubscriptionsController.getSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], subscription);
    });

    it('should return 403 when non-admin accesses another entity subscription', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => ({
        _id: 'sub-1',
        billableEntityId: 'other-entity',
      }));

      const req = mockReq({ params: { id: 'sub-1' } });
      const res = mockRes();
      await SubscriptionsController.getSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    });

    it('should allow admin to access any subscription', async () => {
      const subscription = { _id: 'sub-1', billableEntityId: 'other-entity' };
      getSubscriptionByIdMock.mock.mockImplementation(async () => subscription);

      const req = mockReq({
        params: { id: 'sub-1' },
        user: { _id: 'admin-1', isPrivileged: true },
      });
      const res = mockRes();
      await SubscriptionsController.getSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });

    it('should return 404 when subscription not found', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => {
        throw { code: 'SUBSCRIPTION_NOT_FOUND' };
      });

      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();
      await SubscriptionsController.getSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });
  });

  describe('getMySubscription', () => {
    it('should return active subscription for user', async () => {
      const subscription = { _id: 'sub-1', status: 'active' };
      getActiveSubscriptionMock.mock.mockImplementation(async () => subscription);

      const req = mockReq();
      const res = mockRes();
      await SubscriptionsController.getMySubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], subscription);
      const [, entityType, entityId] = getActiveSubscriptionMock.mock.calls[0].arguments;
      assert.strictEqual(entityType, 'workspace');
      assert.strictEqual(entityId, 'ws-1');
    });

    it('should use user entity when no workspace', async () => {
      getActiveSubscriptionMock.mock.mockImplementation(async () => null);

      const req = mockReq({ user: { _id: 'user-1' } });
      const res = mockRes();
      await SubscriptionsController.getMySubscription(req, res);

      const [, entityType, entityId] = getActiveSubscriptionMock.mock.calls[0].arguments;
      assert.strictEqual(entityType, 'user');
      assert.strictEqual(entityId, 'user-1');
    });

    it('should return 500 on error', async () => {
      getActiveSubscriptionMock.mock.mockImplementation(async () => { throw new Error('fail'); });

      const req = mockReq();
      const res = mockRes();
      await SubscriptionsController.getMySubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe('createSubscription', () => {
    it('should create subscription for regular user using their own entity', async () => {
      const subscription = { _id: 'sub-1', status: 'pending' };
      createSubscriptionMock.mock.mockImplementation(async () => subscription);

      const req = mockReq({
        body: { planId: 'plan-1', billingCycle: 'monthly' },
      });
      const res = mockRes();
      await SubscriptionsController.createSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const subData = createSubscriptionMock.mock.calls[0].arguments[1];
      assert.strictEqual(subData.planId, 'plan-1');
      assert.strictEqual(subData.billingCycle, 'monthly');
      assert.strictEqual(subData.billableEntityType, 'workspace');
      assert.strictEqual(subData.billableEntityId, 'ws-1');
      assert.strictEqual(subData.status, 'pending');
    });

    it('should reject dynamicAmount from regular user body', async () => {
      createSubscriptionMock.mock.mockImplementation(async () => ({ _id: 'sub-1', status: 'pending' }));

      const req = mockReq({
        body: { planId: 'plan-1', billingCycle: 'monthly', dynamicAmount: 999 },
      });
      const res = mockRes();
      await SubscriptionsController.createSubscription(req, res);

      const subData = createSubscriptionMock.mock.calls[0].arguments[1];
      assert.strictEqual(subData.dynamicAmount, undefined);
    });

    it('should return 400 when planId is missing for regular user', async () => {
      const req = mockReq({ body: { billingCycle: 'monthly' } });
      const res = mockRes();
      await SubscriptionsController.createSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.strictEqual(createSubscriptionMock.mock.calls.length, 0);
    });

    it('should return 400 when billingCycle is missing for regular user', async () => {
      const req = mockReq({ body: { planId: 'plan-1' } });
      const res = mockRes();
      await SubscriptionsController.createSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.strictEqual(createSubscriptionMock.mock.calls.length, 0);
    });

    it('should return 400 when billable entity cannot be resolved', async () => {
      const req = mockReq({ body: { planId: 'plan-1', billingCycle: 'monthly' }, user: {} });
      const res = mockRes();
      await SubscriptionsController.createSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should allow admin to pass full data including dynamicAmount', async () => {
      const subscription = { _id: 'sub-1', status: 'pending', dynamicAmount: 250 };
      createSubscriptionMock.mock.mockImplementation(async () => subscription);

      const req = mockReq({
        body: {
          planId: 'plan-1',
          billingCycle: 'monthly',
          billableEntityType: 'workspace',
          billableEntityId: 'ws-other',
          dynamicAmount: 250,
        },
        user: { _id: 'admin-1', isPrivileged: true },
      });
      const res = mockRes();
      await SubscriptionsController.createSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const subData = createSubscriptionMock.mock.calls[0].arguments[1];
      assert.strictEqual(subData.dynamicAmount, 250);
      assert.strictEqual(subData.billableEntityId, 'ws-other');
    });
  });

  describe('setDynamicAmount', () => {
    it('should set dynamic amount and return 200', async () => {
      const subscription = { _id: 'sub-1', dynamicAmount: 99 };
      setDynamicAmountMock.mock.mockImplementation(async () => subscription);

      const req = mockReq({ params: { id: 'sub-1' }, body: { amount: 99 } });
      const res = mockRes();
      await SubscriptionsController.setDynamicAmount(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], subscription);
      assert.deepStrictEqual(setDynamicAmountMock.mock.calls[0].arguments, ['tenant-1', 'sub-1', 99]);
    });

    it('should return 400 when amount is not a number', async () => {
      const req = mockReq({ params: { id: 'sub-1' }, body: { amount: 'bad' } });
      const res = mockRes();
      await SubscriptionsController.setDynamicAmount(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.strictEqual(setDynamicAmountMock.mock.calls.length, 0);
    });

    it('should return 400 when amount is zero', async () => {
      const req = mockReq({ params: { id: 'sub-1' }, body: { amount: 0 } });
      const res = mockRes();
      await SubscriptionsController.setDynamicAmount(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.strictEqual(setDynamicAmountMock.mock.calls.length, 0);
    });

    it('should return 400 when amount is negative', async () => {
      const req = mockReq({ params: { id: 'sub-1' }, body: { amount: -5 } });
      const res = mockRes();
      await SubscriptionsController.setDynamicAmount(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should return 404 when subscription not found', async () => {
      setDynamicAmountMock.mock.mockImplementation(async () => {
        throw { code: 'SUBSCRIPTION_NOT_FOUND' };
      });

      const req = mockReq({ params: { id: 'nonexistent' }, body: { amount: 50 } });
      const res = mockRes();
      await SubscriptionsController.setDynamicAmount(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it('should return 400 for INVALID_AMOUNT from service', async () => {
      setDynamicAmountMock.mock.mockImplementation(async () => {
        throw { code: 'INVALID_AMOUNT' };
      });

      const req = mockReq({ params: { id: 'sub-1' }, body: { amount: 50 } });
      const res = mockRes();
      await SubscriptionsController.setDynamicAmount(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should return 500 on unexpected error', async () => {
      setDynamicAmountMock.mock.mockImplementation(async () => { throw new Error('db fail'); });

      const req = mockReq({ params: { id: 'sub-1' }, body: { amount: 50 } });
      const res = mockRes();
      await SubscriptionsController.setDynamicAmount(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe('cancelSubscription', () => {
    const ownedSubscription = { _id: 'sub-1', billableEntityId: 'ws-1', status: 'active' };

    it('should cancel subscription and return 200', async () => {
      const result = { _id: 'sub-1', status: 'canceled' };
      getSubscriptionByIdMock.mock.mockImplementation(async () => ownedSubscription);
      cancelSubscriptionMock.mock.mockImplementation(async () => result);

      const req = mockReq({ params: { id: 'sub-1' } });
      const res = mockRes();
      await SubscriptionsController.cancelSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], result);
    });

    it('should return 403 when non-admin tries to cancel another entity subscription', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => ({
        _id: 'sub-1',
        billableEntityId: 'other-entity',
      }));

      const req = mockReq({ params: { id: 'sub-1' } });
      const res = mockRes();
      await SubscriptionsController.cancelSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
      assert.strictEqual(cancelSubscriptionMock.mock.calls.length, 0);
    });

    it('should allow admin to cancel any subscription regardless of entity', async () => {
      const result = { _id: 'sub-1', status: 'canceled' };
      getSubscriptionByIdMock.mock.mockImplementation(async () => ({
        _id: 'sub-1',
        billableEntityId: 'other-entity',
      }));
      cancelSubscriptionMock.mock.mockImplementation(async () => result);

      const req = mockReq({
        params: { id: 'sub-1' },
        user: { _id: 'admin-1', isPrivileged: true },
      });
      const res = mockRes();
      await SubscriptionsController.cancelSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], result);
    });

    it('should return 404 when subscription not found', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => {
        throw { code: 'SUBSCRIPTION_NOT_FOUND' };
      });

      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();
      await SubscriptionsController.cancelSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it('should return 500 on unexpected cancel error', async () => {
      getSubscriptionByIdMock.mock.mockImplementation(async () => ownedSubscription);
      cancelSubscriptionMock.mock.mockImplementation(async () => { throw new Error('unexpected'); });

      const req = mockReq({ params: { id: 'sub-1' } });
      const res = mockRes();
      await SubscriptionsController.cancelSubscription(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });
});
