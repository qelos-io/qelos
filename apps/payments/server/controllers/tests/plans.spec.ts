import * as PlansController from '../plans';
import * as PlansService from '../../services/plans-service';

jest.mock('../../services/plans-service');

const MockPlansService = PlansService as any;

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
  const res: any = {
    statusCode: 200,
    body: null,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('plans controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlans', () => {
    it('should return plans list with 200', async () => {
      const plans = [{ _id: 'p1', name: 'Basic' }];
      MockPlansService.listPlans.mockResolvedValue(plans as any);

      const req = mockReq();
      const res = mockRes();
      await PlansController.getPlans(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(plans);
      expect(MockPlansService.listPlans).toHaveBeenCalledWith('tenant-1', {});
    });

    it('should pass isActive filter from query', async () => {
      MockPlansService.listPlans.mockResolvedValue([]);

      const req = mockReq({ query: { isActive: 'true' } });
      const res = mockRes();
      await PlansController.getPlans(req, res);

      expect(MockPlansService.listPlans).toHaveBeenCalledWith('tenant-1', { isActive: true });
    });

    it('should return 500 on service error', async () => {
      MockPlansService.listPlans.mockRejectedValue(new Error('db error'));

      const req = mockReq();
      const res = mockRes();
      await PlansController.getPlans(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPublicPlans', () => {
    it('should return active plans with 200', async () => {
      const plans = [{ _id: 'p1', name: 'Basic' }];
      MockPlansService.getPublicPlans.mockResolvedValue(plans as any);

      const req = mockReq();
      const res = mockRes();
      await PlansController.getPublicPlans(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(plans);
    });
  });

  describe('getPlan', () => {
    it('should return plan with 200', async () => {
      const plan = { _id: 'p1', name: 'Pro', isActive: true };
      MockPlansService.getPlanById.mockResolvedValue(plan as any);

      const req = mockReq({ params: { planId: 'p1' } });
      const res = mockRes();
      await PlansController.getPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(plan);
    });

    it('should return 404 when plan not found', async () => {
      MockPlansService.getPlanById.mockRejectedValue({ code: 'PLAN_NOT_FOUND' });

      const req = mockReq({ params: { planId: 'nonexistent' } });
      const res = mockRes();
      await PlansController.getPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      MockPlansService.getPlanById.mockRejectedValue(new Error('db error'));

      const req = mockReq({ params: { planId: 'p1' } });
      const res = mockRes();
      await PlansController.getPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createPlan', () => {
    it('should create plan and return 200', async () => {
      const plan = { _id: 'p1', name: 'New Plan' };
      MockPlansService.createPlan.mockResolvedValue(plan as any);

      const req = mockReq({ body: { name: 'New Plan', monthlyPrice: 10, yearlyPrice: 100 } });
      const res = mockRes();
      await PlansController.createPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(plan);
    });

    it('should return 400 when plan data is invalid', async () => {
      MockPlansService.createPlan.mockRejectedValue({ code: 'INVALID_PLAN_DATA', message: 'missing fields' });

      const req = mockReq({ body: {} });
      const res = mockRes();
      await PlansController.createPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updatePlan', () => {
    it('should update plan and return 200', async () => {
      const plan = { _id: 'p1', name: 'Updated' };
      MockPlansService.updatePlan.mockResolvedValue(plan as any);

      const req = mockReq({ params: { planId: 'p1' }, body: { name: 'Updated' } });
      const res = mockRes();
      await PlansController.updatePlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(plan);
    });

    it('should return 404 when plan not found', async () => {
      MockPlansService.updatePlan.mockRejectedValue({ code: 'PLAN_NOT_FOUND' });

      const req = mockReq({ params: { planId: 'nonexistent' }, body: { name: 'X' } });
      const res = mockRes();
      await PlansController.updatePlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deletePlan', () => {
    it('should deactivate plan and return 200', async () => {
      const plan = { _id: 'p1', isActive: false };
      MockPlansService.deactivatePlan.mockResolvedValue(plan as any);

      const req = mockReq({ params: { planId: 'p1' } });
      const res = mockRes();
      await PlansController.deletePlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(plan);
    });

    it('should return 404 when plan not found', async () => {
      MockPlansService.deactivatePlan.mockRejectedValue({ code: 'PLAN_NOT_FOUND' });

      const req = mockReq({ params: { planId: 'nonexistent' } });
      const res = mockRes();
      await PlansController.deletePlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
