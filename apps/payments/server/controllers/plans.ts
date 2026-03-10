import { Response } from 'express';
import * as PlansService from '../services/plans-service';

export async function getPlans(req, res: Response) {
  try {
    const filters: any = {};
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }
    const plans = await PlansService.listPlans(req.headers.tenant, filters);
    res.status(200).json(plans).end();
  } catch (e) {
    res.status(500).json({ message: 'failed to load plans' }).end();
  }
}

export async function getPublicPlans(req, res: Response) {
  try {
    const plans = await PlansService.getPublicPlans(req.headers.tenant);
    res.status(200).json(plans).end();
  } catch (e) {
    res.status(500).json({ message: 'failed to load plans' }).end();
  }
}

export async function getPlan(req, res: Response) {
  try {
    const plan = await PlansService.getPlanById(req.headers.tenant, req.params.planId);
    if (!req.user?.isPrivileged && !plan.isActive) {
      res.status(404).json({ message: 'plan not found' }).end();
      return;
    }
    res.status(200).json(plan).end();
  } catch (e: any) {
    const status = e?.code === 'PLAN_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to load plan' }).end();
  }
}

export async function createPlan(req, res: Response) {
  try {
    const plan = await PlansService.createPlan(req.headers.tenant, req.body);
    res.status(200).json(plan).end();
  } catch (e: any) {
    const status = e?.code === 'INVALID_PLAN_DATA' ? 400 : 500;
    res.status(status).json({ message: e?.message || 'failed to create plan' }).end();
  }
}

export async function updatePlan(req, res: Response) {
  try {
    const plan = await PlansService.updatePlan(req.headers.tenant, req.params.planId, req.body);
    res.status(200).json(plan).end();
  } catch (e: any) {
    const status = e?.code === 'PLAN_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to update plan' }).end();
  }
}

export async function deletePlan(req, res: Response) {
  try {
    const plan = await PlansService.deactivatePlan(req.headers.tenant, req.params.planId);
    res.status(200).json(plan).end();
  } catch (e: any) {
    const status = e?.code === 'PLAN_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to deactivate plan' }).end();
  }
}
