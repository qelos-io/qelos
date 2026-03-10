import Plan from '../models/plan';
import { IPlan } from '@qelos/global-types';

export async function listPlans(tenant: string, filters: { isActive?: boolean } = {}) {
  const query: any = { tenant };
  if (typeof filters.isActive === 'boolean') {
    query.isActive = filters.isActive;
  }
  return (Plan as any).find(query).sort({ sortOrder: 1, created: -1 }).lean().exec();
}

export async function getPublicPlans(tenant: string) {
  return (Plan as any).find({ tenant, isActive: true })
    .select('name description features monthlyPrice yearlyPrice currency sortOrder limits metadata')
    .sort({ sortOrder: 1 })
    .lean()
    .exec();
}

export async function getPlanById(tenant: string, planId: string) {
  const plan = await (Plan as any).findOne({ _id: planId, tenant }).lean().exec();
  if (!plan) {
    throw { code: 'PLAN_NOT_FOUND' };
  }
  return plan;
}

export async function createPlan(tenant: string, data: Partial<IPlan>) {
  const plan = new Plan({
    tenant,
    name: data.name,
    description: data.description || '',
    features: data.features || [],
    monthlyPrice: data.monthlyPrice,
    yearlyPrice: data.yearlyPrice,
    currency: data.currency || 'USD',
    isActive: data.isActive !== false,
    sortOrder: data.sortOrder || 0,
    limits: data.limits || {},
    externalIds: data.externalIds || {},
    metadata: data.metadata || {},
  });

  if (!plan.name || plan.monthlyPrice == null || plan.yearlyPrice == null) {
    throw { code: 'INVALID_PLAN_DATA', message: 'name, monthlyPrice, and yearlyPrice are required' };
  }

  return plan.save();
}

export async function updatePlan(tenant: string, planId: string, data: Partial<IPlan>) {
  const updates: Record<string, any> = {};
  const allowedFields = [
    'name', 'description', 'features', 'monthlyPrice', 'yearlyPrice',
    'currency', 'isActive', 'sortOrder', 'limits', 'externalIds', 'metadata'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  const plan = await (Plan as any).findOneAndUpdate(
    { _id: planId, tenant },
    { $set: updates },
    { new: true }
  ).lean().exec();

  if (!plan) {
    throw { code: 'PLAN_NOT_FOUND' };
  }

  return plan;
}

export async function deactivatePlan(tenant: string, planId: string) {
  const plan = await (Plan as any).findOneAndUpdate(
    { _id: planId, tenant },
    { $set: { isActive: false } },
    { new: true }
  ).lean().exec();

  if (!plan) {
    throw { code: 'PLAN_NOT_FOUND' };
  }

  return plan;
}
