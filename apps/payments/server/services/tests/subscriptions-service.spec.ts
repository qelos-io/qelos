import * as SubscriptionsService from '../subscriptions-service';
import Subscription from '../../models/subscription';

jest.mock('../../models/subscription');

const MockSubscription = Subscription as any;

describe('subscriptions-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  function setupDefaultMocks() {
    MockSubscription.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    MockSubscription.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    MockSubscription.findOneAndUpdate = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    MockSubscription.mockImplementation((data) => ({
      ...data,
      _id: 'sub-1',
      save: jest.fn().mockResolvedValue({ _id: 'sub-1', ...data }),
    }));
  }

  describe('listSubscriptions', () => {
    it('should query subscriptions with tenant only when no filters', async () => {
      await SubscriptionsService.listSubscriptions('tenant-1');
      expect(MockSubscription.find).toHaveBeenCalledWith({ tenant: 'tenant-1' });
    });

    it('should pass billableEntityType filter', async () => {
      await SubscriptionsService.listSubscriptions('tenant-1', { billableEntityType: 'user' });
      expect(MockSubscription.find).toHaveBeenCalledWith({
        tenant: 'tenant-1',
        billableEntityType: 'user',
      });
    });

    it('should pass billableEntityId filter', async () => {
      await SubscriptionsService.listSubscriptions('tenant-1', { billableEntityId: 'user-1' });
      expect(MockSubscription.find).toHaveBeenCalledWith({
        tenant: 'tenant-1',
        billableEntityId: 'user-1',
      });
    });

    it('should pass status filter', async () => {
      await SubscriptionsService.listSubscriptions('tenant-1', { status: 'active' });
      expect(MockSubscription.find).toHaveBeenCalledWith({
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
      expect(MockSubscription.find).toHaveBeenCalledWith({
        tenant: 'tenant-1',
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        status: 'active',
      });
    });
  });

  describe('getSubscriptionById', () => {
    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      try {
        await SubscriptionsService.getSubscriptionById('tenant-1', 'nonexistent');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('SUBSCRIPTION_NOT_FOUND');
      }
    });

    it('should return subscription when found', async () => {
      const mockSub = { _id: 'sub-1', tenant: 'tenant-1', planId: 'plan-1' };
      MockSubscription.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSub),
        }),
      });

      const result = await SubscriptionsService.getSubscriptionById('tenant-1', 'sub-1');
      expect(result).toEqual(mockSub);
      expect(MockSubscription.findOne).toHaveBeenCalledWith({ _id: 'sub-1', tenant: 'tenant-1' });
    });
  });

  describe('getActiveSubscription', () => {
    it('should return null when no active subscription', async () => {
      const result = await SubscriptionsService.getActiveSubscription('tenant-1', 'user', 'user-1');
      expect(result).toBeNull();
      expect(MockSubscription.findOne).toHaveBeenCalledWith({
        tenant: 'tenant-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        status: { $in: ['active', 'trialing'] },
      });
    });

    it('should return active subscription when found', async () => {
      const mockSub = { _id: 'sub-1', status: 'active' };
      MockSubscription.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSub),
        }),
      });

      const result = await SubscriptionsService.getActiveSubscription('tenant-1', 'workspace', 'ws-1');
      expect(result).toEqual(mockSub);
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

      expect(result).toBeDefined();
      expect(result._id).toBe('sub-1');
      expect(MockSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant: 'tenant-1',
          planId: 'plan-1',
          billableEntityType: 'user',
          billableEntityId: 'user-1',
          billingCycle: 'monthly',
          status: 'active',
        }),
      );
    });

    it('should accept custom status', async () => {
      await SubscriptionsService.createSubscription('tenant-1', {
        planId: 'plan-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        billingCycle: 'monthly',
        status: 'pending',
      });

      expect(MockSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
      );
    });

    it('should store provider details', async () => {
      await SubscriptionsService.createSubscription('tenant-1', {
        planId: 'plan-1',
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        billingCycle: 'yearly',
        externalSubscriptionId: 'ext-sub-1',
        providerId: 'source-1',
        providerKind: 'paddle',
        couponId: 'coupon-1',
      });

      expect(MockSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          externalSubscriptionId: 'ext-sub-1',
          providerId: 'source-1',
          providerKind: 'paddle',
          couponId: 'coupon-1',
        }),
      );
    });
  });

  describe('updateSubscriptionStatus', () => {
    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      try {
        await SubscriptionsService.updateSubscriptionStatus('tenant-1', 'nonexistent', 'active');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('SUBSCRIPTION_NOT_FOUND');
      }
    });

    it('should update status', async () => {
      const mockSub = { _id: 'sub-1', status: 'active' };
      MockSubscription.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSub),
        }),
      });

      const result = await SubscriptionsService.updateSubscriptionStatus('tenant-1', 'sub-1', 'active');
      expect(result.status).toBe('active');
      expect(MockSubscription.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'sub-1', tenant: 'tenant-1' },
        { $set: { status: 'active' } },
        { new: true },
      );
    });

    it('should merge additional updates', async () => {
      const now = new Date();
      const mockSub = { _id: 'sub-1', status: 'active', currentPeriodEnd: now };
      MockSubscription.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSub),
        }),
      });

      await SubscriptionsService.updateSubscriptionStatus('tenant-1', 'sub-1', 'active', {
        currentPeriodEnd: now,
      });

      expect(MockSubscription.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'sub-1', tenant: 'tenant-1' },
        { $set: { status: 'active', currentPeriodEnd: now } },
        { new: true },
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should set status to canceled', async () => {
      const mockSub = { _id: 'sub-1', status: 'canceled' };
      MockSubscription.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSub),
        }),
      });

      const result = await SubscriptionsService.cancelSubscription('tenant-1', 'sub-1');
      expect(result.status).toBe('canceled');
      expect(MockSubscription.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'sub-1', tenant: 'tenant-1' },
        { $set: { status: 'canceled' } },
        { new: true },
      );
    });

    it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
      try {
        await SubscriptionsService.cancelSubscription('tenant-1', 'nonexistent');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('SUBSCRIPTION_NOT_FOUND');
      }
    });
  });
});
