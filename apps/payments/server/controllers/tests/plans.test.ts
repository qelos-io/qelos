import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const listPlansMock = mock.fn();
const getPublicPlansMock = mock.fn();
const getPlanByIdMock = mock.fn();
const createPlanMock = mock.fn();
const updatePlanMock = mock.fn();
const deactivatePlanMock = mock.fn();

mock.module('../../services/plans-service', {
  namedExports: {
    listPlans: listPlansMock,
    getPublicPlans: getPublicPlansMock,
    getPlanById: getPlanByIdMock,
    createPlan: createPlanMock,
    updatePlan: updatePlanMock,
    deactivatePlan: deactivatePlanMock,
  },
});

function mockReq(overrides: any = {}) {
  return {
    headers: { tenant: 'tenant-1' },
    params: {},
    query: {},
    body: {},
    user: {},
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

describe('plans controller', async () => {
  const PlansController = await import('../plans');

  beforeEach(() => {
    listPlansMock.mock.resetCalls();
    getPublicPlansMock.mock.resetCalls();
    getPlanByIdMock.mock.resetCalls();
    createPlanMock.mock.resetCalls();
    updatePlanMock.mock.resetCalls();
    deactivatePlanMock.mock.resetCalls();
  });

  describe('getPlans', () => {
    it('should return plans list with 200', async () => {
      const plans = [{ _id: 'p1', name: 'Basic' }];
      listPlansMock.mock.mockImplementation(async () => plans);

      const req = mockReq();
      const res = mockRes();
      await PlansController.getPlans(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], plans);
      assert.deepStrictEqual(listPlansMock.mock.calls[0].arguments, ['tenant-1', {}]);
    });

    it('should pass isActive filter from query', async () => {
      listPlansMock.mock.mockImplementation(async () => []);

      const req = mockReq({ query: { isActive: 'true' } });
      const res = mockRes();
      await PlansController.getPlans(req, res);

      assert.deepStrictEqual(listPlansMock.mock.calls[0].arguments, ['tenant-1', { isActive: true }]);
    });

    it('should return 500 on service error', async () => {
      listPlansMock.mock.mockImplementation(async () => { throw new Error('db error'); });

      const req = mockReq();
      const res = mockRes();
      await PlansController.getPlans(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe('getPublicPlans', () => {
    it('should return active plans with 200', async () => {
      const plans = [{ _id: 'p1', name: 'Basic' }];
      getPublicPlansMock.mock.mockImplementation(async () => plans);

      const req = mockReq();
      const res = mockRes();
      await PlansController.getPublicPlans(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], plans);
    });
  });

  describe('getPlan', () => {
    it('should return plan with 200', async () => {
      const plan = { _id: 'p1', name: 'Pro', isActive: true };
      getPlanByIdMock.mock.mockImplementation(async () => plan);

      const req = mockReq({ params: { planId: 'p1' } });
      const res = mockRes();
      await PlansController.getPlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], plan);
    });

    it('should return 404 for inactive plan when user is not privileged', async () => {
      getPlanByIdMock.mock.mockImplementation(async () => ({ _id: 'p1', name: 'Old', isActive: false }));

      const req = mockReq({ params: { planId: 'p1' } });
      const res = mockRes();
      await PlansController.getPlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it('should return inactive plan for privileged user', async () => {
      const plan = { _id: 'p1', name: 'Old', isActive: false };
      getPlanByIdMock.mock.mockImplementation(async () => plan);

      const req = mockReq({ params: { planId: 'p1' }, user: { isPrivileged: true } });
      const res = mockRes();
      await PlansController.getPlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });

    it('should return 404 when plan not found', async () => {
      getPlanByIdMock.mock.mockImplementation(async () => { throw { code: 'PLAN_NOT_FOUND' }; });

      const req = mockReq({ params: { planId: 'nonexistent' } });
      const res = mockRes();
      await PlansController.getPlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it('should return 500 on unexpected error', async () => {
      getPlanByIdMock.mock.mockImplementation(async () => { throw new Error('db error'); });

      const req = mockReq({ params: { planId: 'p1' } });
      const res = mockRes();
      await PlansController.getPlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe('createPlan', () => {
    it('should create plan and return 200', async () => {
      const plan = { _id: 'p1', name: 'New Plan' };
      createPlanMock.mock.mockImplementation(async () => plan);

      const req = mockReq({ body: { name: 'New Plan', monthlyPrice: 10, yearlyPrice: 100 } });
      const res = mockRes();
      await PlansController.createPlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], plan);
    });

    it('should return 400 when plan data is invalid', async () => {
      createPlanMock.mock.mockImplementation(async () => { throw { code: 'INVALID_PLAN_DATA', message: 'missing fields' }; });

      const req = mockReq({ body: {} });
      const res = mockRes();
      await PlansController.createPlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it('should return 500 on unexpected error', async () => {
      createPlanMock.mock.mockImplementation(async () => { throw new Error('db error'); });

      const req = mockReq({ body: { name: 'X' } });
      const res = mockRes();
      await PlansController.createPlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe('updatePlan', () => {
    it('should update plan and return 200', async () => {
      const plan = { _id: 'p1', name: 'Updated' };
      updatePlanMock.mock.mockImplementation(async () => plan);

      const req = mockReq({ params: { planId: 'p1' }, body: { name: 'Updated' } });
      const res = mockRes();
      await PlansController.updatePlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], plan);
    });

    it('should return 404 when plan not found', async () => {
      updatePlanMock.mock.mockImplementation(async () => { throw { code: 'PLAN_NOT_FOUND' }; });

      const req = mockReq({ params: { planId: 'nonexistent' }, body: { name: 'X' } });
      const res = mockRes();
      await PlansController.updatePlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });
  });

  describe('deletePlan', () => {
    it('should deactivate plan and return 200', async () => {
      const plan = { _id: 'p1', isActive: false };
      deactivatePlanMock.mock.mockImplementation(async () => plan);

      const req = mockReq({ params: { planId: 'p1' } });
      const res = mockRes();
      await PlansController.deletePlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], plan);
    });

    it('should return 404 when plan not found', async () => {
      deactivatePlanMock.mock.mockImplementation(async () => { throw { code: 'PLAN_NOT_FOUND' }; });

      const req = mockReq({ params: { planId: 'nonexistent' } });
      const res = mockRes();
      await PlansController.deletePlan(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });
  });
});
