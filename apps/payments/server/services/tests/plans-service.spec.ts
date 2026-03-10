import * as PlansService from '../plans-service';
import Plan from '../../models/plan';

jest.mock('../../models/plan');

const MockPlan = Plan as any;

describe('plans-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  function setupDefaultMocks() {
    MockPlan.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    MockPlan.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    MockPlan.findOneAndUpdate = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    MockPlan.mockImplementation((data) => ({
      ...data,
      _id: 'plan-1',
      save: jest.fn().mockResolvedValue({ _id: 'plan-1', ...data }),
    }));
  }

  describe('listPlans', () => {
    it('should query plans with tenant', async () => {
      await PlansService.listPlans('tenant-1');
      expect(MockPlan.find).toHaveBeenCalledWith({ tenant: 'tenant-1' });
    });

    it('should pass isActive filter when provided', async () => {
      await PlansService.listPlans('tenant-1', { isActive: true });
      expect(MockPlan.find).toHaveBeenCalledWith({ tenant: 'tenant-1', isActive: true });
    });

    it('should not include isActive filter when not provided', async () => {
      await PlansService.listPlans('tenant-1', {});
      expect(MockPlan.find).toHaveBeenCalledWith({ tenant: 'tenant-1' });
    });
  });

  describe('getPublicPlans', () => {
    it('should query only active plans', async () => {
      await PlansService.getPublicPlans('tenant-1');
      expect(MockPlan.find).toHaveBeenCalledWith({ tenant: 'tenant-1', isActive: true });
    });
  });

  describe('getPlanById', () => {
    it('should throw PLAN_NOT_FOUND when plan does not exist', async () => {
      try {
        await PlansService.getPlanById('tenant-1', 'nonexistent');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('PLAN_NOT_FOUND');
      }
    });

    it('should return plan when found', async () => {
      const mockPlan = { _id: 'plan-1', name: 'Basic', tenant: 'tenant-1' };
      MockPlan.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlan),
        }),
      });

      const result = await PlansService.getPlanById('tenant-1', 'plan-1');
      expect(result).toEqual(mockPlan);
      expect(MockPlan.findOne).toHaveBeenCalledWith({ _id: 'plan-1', tenant: 'tenant-1' });
    });
  });

  describe('createPlan', () => {
    it('should throw INVALID_PLAN_DATA when name is missing', async () => {
      try {
        await PlansService.createPlan('tenant-1', { monthlyPrice: 10, yearlyPrice: 100 } as any);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_PLAN_DATA');
      }
    });

    it('should throw INVALID_PLAN_DATA when monthlyPrice is missing', async () => {
      try {
        await PlansService.createPlan('tenant-1', { name: 'Basic', yearlyPrice: 100 } as any);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_PLAN_DATA');
      }
    });

    it('should throw INVALID_PLAN_DATA when yearlyPrice is missing', async () => {
      try {
        await PlansService.createPlan('tenant-1', { name: 'Basic', monthlyPrice: 10 } as any);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_PLAN_DATA');
      }
    });

    it('should create plan with valid data', async () => {
      const result = await PlansService.createPlan('tenant-1', {
        name: 'Pro',
        monthlyPrice: 29,
        yearlyPrice: 290,
      });
      expect(result).toBeDefined();
      expect(result._id).toBe('plan-1');
    });

    it('should set default currency to USD', async () => {
      await PlansService.createPlan('tenant-1', {
        name: 'Pro',
        monthlyPrice: 29,
        yearlyPrice: 290,
      });
      expect(MockPlan).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'USD' })
      );
    });

    it('should accept custom currency', async () => {
      await PlansService.createPlan('tenant-1', {
        name: 'Pro',
        monthlyPrice: 29,
        yearlyPrice: 290,
        currency: 'EUR',
      });
      expect(MockPlan).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'EUR' })
      );
    });
  });

  describe('updatePlan', () => {
    it('should throw PLAN_NOT_FOUND when plan does not exist', async () => {
      try {
        await PlansService.updatePlan('tenant-1', 'nonexistent', { name: 'Updated' });
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('PLAN_NOT_FOUND');
      }
    });

    it('should update plan with allowed fields', async () => {
      const mockPlan = { _id: 'plan-1', name: 'Updated', tenant: 'tenant-1' };
      MockPlan.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlan),
        }),
      });

      const result = await PlansService.updatePlan('tenant-1', 'plan-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(MockPlan.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'plan-1', tenant: 'tenant-1' },
        { $set: { name: 'Updated' } },
        { new: true }
      );
    });

    it('should ignore fields not in allowed list', async () => {
      const mockPlan = { _id: 'plan-1', name: 'Plan', tenant: 'tenant-1' };
      MockPlan.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlan),
        }),
      });

      await PlansService.updatePlan('tenant-1', 'plan-1', { name: 'Plan', _id: 'hack', tenant: 'hack' } as any);
      expect(MockPlan.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'plan-1', tenant: 'tenant-1' },
        { $set: { name: 'Plan' } },
        { new: true }
      );
    });
  });

  describe('deactivatePlan', () => {
    it('should throw PLAN_NOT_FOUND when plan does not exist', async () => {
      try {
        await PlansService.deactivatePlan('tenant-1', 'nonexistent');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('PLAN_NOT_FOUND');
      }
    });

    it('should set isActive to false', async () => {
      const mockPlan = { _id: 'plan-1', isActive: false, tenant: 'tenant-1' };
      MockPlan.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlan),
        }),
      });

      const result = await PlansService.deactivatePlan('tenant-1', 'plan-1');
      expect(result.isActive).toBe(false);
      expect(MockPlan.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'plan-1', tenant: 'tenant-1' },
        { $set: { isActive: false } },
        { new: true }
      );
    });
  });
});
