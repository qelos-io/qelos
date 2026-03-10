import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const saveMock = mock.fn(async function (this: any) { return this; });

const findMock = mock.fn(() => ({
  select: mock.fn(() => ({
    sort: mock.fn(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => []),
      })),
    })),
  })),
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

function PlanConstructor(data: any) {
  return { ...data, _id: data._id || 'plan-1', save: saveMock.bind({ ...data, _id: data._id || 'plan-1' }) };
}
Object.assign(PlanConstructor, { find: findMock, findOne: findOneMock, findOneAndUpdate: findOneAndUpdateMock });

mock.module('../../models/plan', { defaultExport: PlanConstructor });

describe('plans-service', async () => {
  const PlansService = await import('../plans-service');

  beforeEach(() => {
    findMock.mock.resetCalls();
    findOneMock.mock.resetCalls();
    findOneAndUpdateMock.mock.resetCalls();
    saveMock.mock.resetCalls();

    findMock.mock.mockImplementation(() => ({
      select: mock.fn(() => ({
        sort: mock.fn(() => ({
          lean: mock.fn(() => ({
            exec: mock.fn(async () => []),
          })),
        })),
      })),
      sort: mock.fn(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => []),
        })),
      })),
    }));

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

  describe('listPlans', () => {
    it('should query plans with tenant', async () => {
      await PlansService.listPlans('tenant-1');
      assert.strictEqual(findMock.mock.calls.length, 1);
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], { tenant: 'tenant-1' });
    });

    it('should pass isActive filter when provided', async () => {
      await PlansService.listPlans('tenant-1', { isActive: true });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], { tenant: 'tenant-1', isActive: true });
    });

    it('should not include isActive filter when not provided', async () => {
      await PlansService.listPlans('tenant-1', {});
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], { tenant: 'tenant-1' });
    });
  });

  describe('getPublicPlans', () => {
    it('should query only active plans', async () => {
      await PlansService.getPublicPlans('tenant-1');
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], { tenant: 'tenant-1', isActive: true });
    });
  });

  describe('getPlanById', () => {
    it('should throw PLAN_NOT_FOUND when plan does not exist', async () => {
      await assert.rejects(() => PlansService.getPlanById('tenant-1', 'nonexistent'), (e: any) => {
        assert.strictEqual(e.code, 'PLAN_NOT_FOUND');
        return true;
      });
    });

    it('should return plan when found', async () => {
      const mockPlan = { _id: 'plan-1', name: 'Basic', tenant: 'tenant-1' };
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockPlan),
        })),
      }));

      const result = await PlansService.getPlanById('tenant-1', 'plan-1');
      assert.deepStrictEqual(result, mockPlan);
      assert.deepStrictEqual(findOneMock.mock.calls[0].arguments[0], { _id: 'plan-1', tenant: 'tenant-1' });
    });
  });

  describe('createPlan', () => {
    it('should throw INVALID_PLAN_DATA when name is missing', async () => {
      await assert.rejects(() => PlansService.createPlan('tenant-1', { monthlyPrice: 10, yearlyPrice: 100 } as any), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_PLAN_DATA');
        return true;
      });
    });

    it('should throw INVALID_PLAN_DATA when monthlyPrice is missing', async () => {
      await assert.rejects(() => PlansService.createPlan('tenant-1', { name: 'Basic', yearlyPrice: 100 } as any), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_PLAN_DATA');
        return true;
      });
    });

    it('should throw INVALID_PLAN_DATA when yearlyPrice is missing', async () => {
      await assert.rejects(() => PlansService.createPlan('tenant-1', { name: 'Basic', monthlyPrice: 10 } as any), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_PLAN_DATA');
        return true;
      });
    });

    it('should create plan with valid data', async () => {
      const result = await PlansService.createPlan('tenant-1', {
        name: 'Pro',
        monthlyPrice: 29,
        yearlyPrice: 290,
      });
      assert.ok(result);
      assert.strictEqual(result._id, 'plan-1');
    });
  });

  describe('updatePlan', () => {
    it('should throw PLAN_NOT_FOUND when plan does not exist', async () => {
      await assert.rejects(() => PlansService.updatePlan('tenant-1', 'nonexistent', { name: 'Updated' }), (e: any) => {
        assert.strictEqual(e.code, 'PLAN_NOT_FOUND');
        return true;
      });
    });

    it('should update plan with allowed fields', async () => {
      const mockPlan = { _id: 'plan-1', name: 'Updated', tenant: 'tenant-1' };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockPlan),
        })),
      }));

      const result = await PlansService.updatePlan('tenant-1', 'plan-1', { name: 'Updated' });
      assert.strictEqual(result.name, 'Updated');
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[0], { _id: 'plan-1', tenant: 'tenant-1' });
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $set: { name: 'Updated' } });
    });

    it('should ignore fields not in allowed list', async () => {
      const mockPlan = { _id: 'plan-1', name: 'Plan', tenant: 'tenant-1' };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockPlan),
        })),
      }));

      await PlansService.updatePlan('tenant-1', 'plan-1', { name: 'Plan', _id: 'hack', tenant: 'hack' } as any);
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $set: { name: 'Plan' } });
    });
  });

  describe('deactivatePlan', () => {
    it('should throw PLAN_NOT_FOUND when plan does not exist', async () => {
      await assert.rejects(() => PlansService.deactivatePlan('tenant-1', 'nonexistent'), (e: any) => {
        assert.strictEqual(e.code, 'PLAN_NOT_FOUND');
        return true;
      });
    });

    it('should set isActive to false', async () => {
      const mockPlan = { _id: 'plan-1', isActive: false, tenant: 'tenant-1' };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockPlan),
        })),
      }));

      const result = await PlansService.deactivatePlan('tenant-1', 'plan-1');
      assert.strictEqual(result.isActive, false);
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $set: { isActive: false } });
    });
  });
});
