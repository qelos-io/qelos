import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const saveMock = mock.fn(async function (this: any) { return this; });

const findMock = mock.fn(() => ({
  sort: mock.fn(() => ({
    lean: mock.fn(() => ({
      exec: mock.fn(async () => []),
    })),
    populate: mock.fn(() => ({
      populate: mock.fn(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => []),
        })),
      })),
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

const validateCouponMock = mock.fn(async (..._args: any[]): Promise<any> => ({ _id: 'coupon-1' }));
const redeemCouponMock = mock.fn(async (..._args: any[]): Promise<any> => ({ _id: 'coupon-1' }));
const calculateCouponBenefitEndDateMock = mock.fn((..._args: any[]): Date | null => null);

mock.module('../../models/subscription', { defaultExport: SubscriptionConstructor });
mock.module('../coupons-service', {
  namedExports: {
    validateCoupon: validateCouponMock,
    redeemCoupon: redeemCouponMock,
    calculateCouponBenefitEndDate: calculateCouponBenefitEndDateMock,
  },
});

describe('subscriptions-service', async () => {
  const SubscriptionsService = await import('../subscriptions-service');

  beforeEach(() => {
    findMock.mock.resetCalls();
    findOneMock.mock.resetCalls();
    findOneAndUpdateMock.mock.resetCalls();
    saveMock.mock.resetCalls();

    findOneMock.mock.mockImplementation(() => ({
      select: mock.fn(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => null),
        })),
      })),
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

  describe('listWorkspaceSubscriptions', () => {
    it('should always filter by billableEntityType workspace', async () => {
      await SubscriptionsService.listWorkspaceSubscriptions('tenant-1');
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'workspace',
      });
    });

    it('should pass billableEntityId filter', async () => {
      await SubscriptionsService.listWorkspaceSubscriptions('tenant-1', { billableEntityId: 'ws-1' });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
      });
    });

    it('should pass planId filter', async () => {
      await SubscriptionsService.listWorkspaceSubscriptions('tenant-1', { planId: 'plan-1' });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'workspace',
        planId: 'plan-1',
      });
    });

    it('should pass status filter', async () => {
      await SubscriptionsService.listWorkspaceSubscriptions('tenant-1', { status: 'active' });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'workspace',
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

    it('should record the creation in history', async () => {
      const result = await SubscriptionsService.createSubscription('tenant-1', {
        planId: 'plan-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        billingCycle: 'monthly',
        status: 'pending',
      });

      assert.strictEqual(result.history.length, 1);
      assert.strictEqual(result.history[0].type, 'created');
      assert.strictEqual(result.history[0].to, 'pending');
    });

    it('should also record the coupon when created with a coupon code', async () => {
      const result = await SubscriptionsService.createSubscription('tenant-1', {
        planId: 'plan-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        billingCycle: 'monthly',
        couponCode: 'SPRING20',
      });

      assert.deepStrictEqual(result.history.map((entry: any) => entry.type), ['created', 'coupon_applied']);
      assert.strictEqual(result.history[1].couponCode, 'SPRING20');
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

  // the service reads the previous status (select) to decide whether to record a history entry
  const previousStatus = (status: string) => {
    findOneMock.mock.mockImplementationOnce(() => ({
      select: mock.fn(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({ _id: 'sub-1', status })),
        })),
      })),
    }));
  };

  describe('updateSubscriptionStatus', () => {
    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      await assert.rejects(() => SubscriptionsService.updateSubscriptionStatus('tenant-1', 'nonexistent', 'active'), (e: any) => {
        assert.strictEqual(e.code, 'SUBSCRIPTION_NOT_FOUND');
        return true;
      });
    });

    it('should update status and record the transition in history', async () => {
      previousStatus('pending');
      const mockSub = { _id: 'sub-1', status: 'active' };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockSub),
        })),
      }));

      const result = await SubscriptionsService.updateSubscriptionStatus('tenant-1', 'sub-1', 'active');
      assert.strictEqual(result.status, 'active');
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[0], { _id: 'sub-1', tenant: 'tenant-1' });
      const update = findOneAndUpdateMock.mock.calls[0].arguments[1] as any;
      assert.deepStrictEqual(update.$set, { status: 'active' });
      assert.strictEqual(update.$push.history.$slice, -100);
      assert.strictEqual(update.$push.history.$each.length, 1);
      assert.strictEqual(update.$push.history.$each[0].type, 'status_changed');
      assert.strictEqual(update.$push.history.$each[0].from, 'pending');
      assert.strictEqual(update.$push.history.$each[0].to, 'active');
    });

    it('should not add a history entry when the status did not change', async () => {
      previousStatus('active');
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({ _id: 'sub-1', status: 'active' })),
        })),
      }));

      await SubscriptionsService.updateSubscriptionStatus('tenant-1', 'sub-1', 'active');
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $set: { status: 'active' } });
    });

    it('should merge additional updates', async () => {
      previousStatus('active');
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

  describe('setDynamicAmount', () => {
    it('should update dynamicAmount on the subscription', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', dynamicAmount: 99 };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockSub),
        })),
      }));

      const result = await SubscriptionsService.setDynamicAmount('tenant-1', 'sub-1', 99);
      assert.strictEqual(result.dynamicAmount, 99);
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[0], { _id: 'sub-1', tenant: 'tenant-1' });
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $set: { dynamicAmount: 99 } });
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[2], { new: true });
    });

    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      await assert.rejects(() => SubscriptionsService.setDynamicAmount('tenant-1', 'nonexistent', 50), (e: any) => {
        assert.strictEqual(e.code, 'SUBSCRIPTION_NOT_FOUND');
        return true;
      });
    });

    it('should throw INVALID_AMOUNT when amount is zero', async () => {
      await assert.rejects(() => SubscriptionsService.setDynamicAmount('tenant-1', 'sub-1', 0), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_AMOUNT');
        return true;
      });
    });

    it('should throw INVALID_AMOUNT when amount is negative', async () => {
      await assert.rejects(() => SubscriptionsService.setDynamicAmount('tenant-1', 'sub-1', -10), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_AMOUNT');
        return true;
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should set status to canceled and record a canceled history entry', async () => {
      previousStatus('active');
      const mockSub = { _id: 'sub-1', status: 'canceled' };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockSub),
        })),
      }));

      const result = await SubscriptionsService.cancelSubscription('tenant-1', 'sub-1');
      assert.strictEqual(result.status, 'canceled');
      const update = findOneAndUpdateMock.mock.calls[0].arguments[1] as any;
      assert.strictEqual(update.$push.history.$each[0].type, 'canceled');
    });

    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      await assert.rejects(() => SubscriptionsService.cancelSubscription('tenant-1', 'nonexistent'), (e: any) => {
        assert.strictEqual(e.code, 'SUBSCRIPTION_NOT_FOUND');
        return true;
      });
    });
  });

  describe('setSubscriptionCoupon', () => {
    const existing = (overrides: any = {}) => {
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({ _id: 'sub-1', planId: 'plan-1', status: 'active', ...overrides })),
        })),
      }));
    };

    beforeEach(() => {
      validateCouponMock.mock.resetCalls();
      redeemCouponMock.mock.resetCalls();
    });

    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      await assert.rejects(() => SubscriptionsService.setSubscriptionCoupon('tenant-1', 'nope', 'SAVE10'), (e: any) => {
        assert.strictEqual(e.code, 'SUBSCRIPTION_NOT_FOUND');
        return true;
      });
    });

    it('should validate against the subscription plan, redeem and store the coupon', async () => {
      existing();
      await SubscriptionsService.setSubscriptionCoupon('tenant-1', 'sub-1', 'SAVE10');

      assert.deepStrictEqual(validateCouponMock.mock.calls[0].arguments, ['tenant-1', 'SAVE10', 'plan-1']);
      assert.strictEqual(redeemCouponMock.mock.calls.length, 1);
      const update = findOneAndUpdateMock.mock.calls[0].arguments[1];
      assert.deepStrictEqual(update.$set, { couponId: 'coupon-1' });
      assert.deepStrictEqual(update.$unset, { couponBenefitEndsAt: '' });
    });

    it('should set couponBenefitEndsAt when the coupon has a benefit duration', async () => {
      const endsAt = new Date('2030-01-01');
      calculateCouponBenefitEndDateMock.mock.mockImplementationOnce(() => endsAt);
      existing();
      await SubscriptionsService.setSubscriptionCoupon('tenant-1', 'sub-1', 'SAVE10');

      const update = findOneAndUpdateMock.mock.calls[0].arguments[1];
      assert.deepStrictEqual(update.$set, { couponId: 'coupon-1', couponBenefitEndsAt: endsAt });
      assert.strictEqual(update.$unset, undefined);
    });

    it('should not redeem for a subscription that is not active yet', async () => {
      existing({ status: 'pending' });
      await SubscriptionsService.setSubscriptionCoupon('tenant-1', 'sub-1', 'SAVE10');
      assert.strictEqual(redeemCouponMock.mock.calls.length, 0);
    });

    it('should not redeem again when the coupon is already attached', async () => {
      existing({ couponId: 'coupon-1' });
      await SubscriptionsService.setSubscriptionCoupon('tenant-1', 'sub-1', 'SAVE10');
      assert.strictEqual(redeemCouponMock.mock.calls.length, 0);
      assert.strictEqual(findOneAndUpdateMock.mock.calls.length, 0);
    });

    it('should remove the coupon when couponCode is null', async () => {
      existing({ couponId: 'coupon-1' });
      await SubscriptionsService.setSubscriptionCoupon('tenant-1', 'sub-1', null);
      const update = findOneAndUpdateMock.mock.calls[0].arguments[1] as any;
      assert.deepStrictEqual(update.$unset, { couponId: '', couponBenefitEndsAt: '' });
      assert.strictEqual(update.$push.history.$each[0].type, 'coupon_removed');
      assert.strictEqual(validateCouponMock.mock.calls.length, 0);
    });
  });
});
