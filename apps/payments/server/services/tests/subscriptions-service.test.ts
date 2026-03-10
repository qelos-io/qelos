import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const saveMock = mock.fn(async function (this: any) { return this; });

const findMock = mock.fn(() => ({
  sort: mock.fn(() => ({
    lean: mock.fn(() => ({
      exec: mock.fn(async () => []),
    })),
  })),
}));

const findOneMock = mock.fn(() => ({
  lean: mock.fn(() => ({
    exec: mock.fn(async () => null),
  })),
}));

const findOneAndUpdateMock = mock.fn(() => ({
  lean: mock.fn(() => ({
    exec: mock.fn(async () => null),
  })),
}));

function SubscriptionConstructor(data: any) {
  return { ...data, _id: data._id || 'sub-1', save: saveMock.bind({ ...data, _id: data._id || 'sub-1' }) };
}
Object.assign(SubscriptionConstructor, { find: findMock, findOne: findOneMock, findOneAndUpdate: findOneAndUpdateMock });

mock.module('../../models/subscription', { defaultExport: SubscriptionConstructor });

describe('subscriptions-service', async () => {
  const SubscriptionsService = await import('../subscriptions-service');

  beforeEach(() => {
    findMock.mock.resetCalls();
    findOneMock.mock.resetCalls();
    findOneAndUpdateMock.mock.resetCalls();
    saveMock.mock.resetCalls();

    findOneMock.mock.mockImplementation(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => null),
      })),
    }));

    findOneAndUpdateMock.mock.mockImplementation(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => null),
      })),
    }));
  });

  describe('listSubscriptions', () => {
    it('should query subscriptions with tenant only when no filters', async () => {
      await SubscriptionsService.listSubscriptions('tenant-1');
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], { tenant: 'tenant-1' });
    });

    it('should pass billableEntityType filter', async () => {
      await SubscriptionsService.listSubscriptions('tenant-1', { billableEntityType: 'user' });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'user',
      });
    });

    it('should pass billableEntityId filter', async () => {
      await SubscriptionsService.listSubscriptions('tenant-1', { billableEntityId: 'user-1' });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityId: 'user-1',
      });
    });

    it('should pass status filter', async () => {
      await SubscriptionsService.listSubscriptions('tenant-1', { status: 'active' });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        status: 'active',
      });
    });

    it('should combine multiple filters', async () => {
      await SubscriptionsService.listSubscriptions('tenant-1', {
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        status: 'active',
      });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        status: 'active',
      });
    });
  });

  describe('getSubscriptionById', () => {
    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      await assert.rejects(() => SubscriptionsService.getSubscriptionById('tenant-1', 'nonexistent'), (e: any) => {
        assert.strictEqual(e.code, 'SUBSCRIPTION_NOT_FOUND');
        return true;
      });
    });

    it('should return subscription when found', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', planId: 'plan-1' };
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockSub),
        })),
      }));

      const result = await SubscriptionsService.getSubscriptionById('tenant-1', 'sub-1');
      assert.deepStrictEqual(result, mockSub);
      assert.deepStrictEqual(findOneMock.mock.calls[0].arguments[0], { _id: 'sub-1', tenant: 'tenant-1' });
    });
  });

  describe('getActiveSubscription', () => {
    it('should return null when no active subscription', async () => {
      const result = await SubscriptionsService.getActiveSubscription('tenant-1', 'user', 'user-1');
      assert.strictEqual(result, null);
      assert.deepStrictEqual(findOneMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        status: { $in: ['active', 'trialing'] },
      });
    });

    it('should return active subscription when found', async () => {
      const mockSub = { _id: 'sub-1', status: 'active' };
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockSub),
        })),
      }));

      const result = await SubscriptionsService.getActiveSubscription('tenant-1', 'workspace', 'ws-1');
      assert.deepStrictEqual(result, mockSub);
    });
  });

  describe('createSubscription', () => {
    it('should create subscription with required fields', async () => {
      const result = await SubscriptionsService.createSubscription('tenant-1', {
        planId: 'plan-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        billingCycle: 'monthly',
      });

      assert.ok(result);
      assert.strictEqual(result._id, 'sub-1');
      assert.strictEqual(result.tenant, 'tenant-1');
      assert.strictEqual(result.status, 'active');
    });

    it('should accept custom status', async () => {
      const result = await SubscriptionsService.createSubscription('tenant-1', {
        planId: 'plan-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        billingCycle: 'monthly',
        status: 'pending',
      });

      assert.strictEqual(result.status, 'pending');
    });

    it('should store provider details', async () => {
      const result = await SubscriptionsService.createSubscription('tenant-1', {
        planId: 'plan-1',
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        billingCycle: 'yearly',
        externalSubscriptionId: 'ext-sub-1',
        providerId: 'source-1',
        providerKind: 'paddle',
        couponId: 'coupon-1',
      });

      assert.strictEqual(result.externalSubscriptionId, 'ext-sub-1');
      assert.strictEqual(result.providerId, 'source-1');
      assert.strictEqual(result.providerKind, 'paddle');
      assert.strictEqual(result.couponId, 'coupon-1');
    });
  });

  describe('updateSubscriptionStatus', () => {
    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      await assert.rejects(() => SubscriptionsService.updateSubscriptionStatus('tenant-1', 'nonexistent', 'active'), (e: any) => {
        assert.strictEqual(e.code, 'SUBSCRIPTION_NOT_FOUND');
        return true;
      });
    });

    it('should update status', async () => {
      const mockSub = { _id: 'sub-1', status: 'active' };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockSub),
        })),
      }));

      const result = await SubscriptionsService.updateSubscriptionStatus('tenant-1', 'sub-1', 'active');
      assert.strictEqual(result.status, 'active');
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[0], { _id: 'sub-1', tenant: 'tenant-1' });
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $set: { status: 'active' } });
    });

    it('should merge additional updates', async () => {
      const now = new Date();
      const mockSub = { _id: 'sub-1', status: 'active', currentPeriodEnd: now };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockSub),
        })),
      }));

      await SubscriptionsService.updateSubscriptionStatus('tenant-1', 'sub-1', 'active', {
        currentPeriodEnd: now,
      });

      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $set: { status: 'active', currentPeriodEnd: now } });
    });
  });

  describe('cancelSubscription', () => {
    it('should set status to canceled', async () => {
      const mockSub = { _id: 'sub-1', status: 'canceled' };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockSub),
        })),
      }));

      const result = await SubscriptionsService.cancelSubscription('tenant-1', 'sub-1');
      assert.strictEqual(result.status, 'canceled');
    });

    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      await assert.rejects(() => SubscriptionsService.cancelSubscription('tenant-1', 'nonexistent'), (e: any) => {
        assert.strictEqual(e.code, 'SUBSCRIPTION_NOT_FOUND');
        return true;
      });
    });
  });
});
