import type { ICoupon, IPaymentsConfigurationMetadata, IPlan } from '@qelos/global-types';

export type CouponStatus = 'active' | 'scheduled' | 'expired' | 'exhausted' | 'inactive';

export function getCouponStatus(coupon: ICoupon, now = new Date()): CouponStatus {
  if (!coupon.isActive) return 'inactive';
  if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now.getTime()) return 'scheduled';
  if (coupon.validUntil && new Date(coupon.validUntil).getTime() < now.getTime()) return 'expired';
  if (typeof coupon.maxRedemptions === 'number' && coupon.currentRedemptions >= coupon.maxRedemptions) return 'exhausted';
  return 'active';
}

/** 0-100, or null for coupons without a redemption limit. */
export function getRedemptionProgress(coupon: Pick<ICoupon, 'maxRedemptions' | 'currentRedemptions'>) {
  if (typeof coupon.maxRedemptions !== 'number' || coupon.maxRedemptions <= 0) return null;
  return Math.min(100, Math.round((coupon.currentRedemptions / coupon.maxRedemptions) * 100));
}

export interface SetupStep {
  id: 'provider' | 'enabled' | 'plan';
  done: boolean;
  route: string;
}

/** What must be true before customers can pay. */
export function getSetupSteps(
  config: Partial<IPaymentsConfigurationMetadata> | null | undefined,
  plans: Pick<IPlan, 'isActive'>[] = [],
): SetupStep[] {
  const sourceId = (config as any)?.paymentSourceId ?? (config as any)?.providerSourceId;
  return [
    { id: 'provider', done: !!sourceId, route: 'paymentsConfiguration' },
    { id: 'enabled', done: !!config?.isEnabled, route: 'paymentsConfiguration' },
    { id: 'plan', done: plans.some((plan) => plan.isActive), route: 'createPlan' },
  ];
}

export function isSetupComplete(steps: SetupStep[]) {
  return steps.every((step) => step.done);
}

/** The share (0-100) of live subscriptions held by one plan. */
export function planShare(count: number, live: number) {
  return live > 0 ? Math.round((count / live) * 100) : 0;
}

/** Every distinct feature/limit across plans, with which plans include it (for the compare view). */
export function buildComparison(plans: IPlan[]) {
  const features = [...new Set(plans.flatMap((plan) => plan.features || []))];
  const limits = [...new Set(plans.flatMap((plan) => Object.keys(plan.limits || {})))];
  return {
    features: features.map((feature) => ({ feature, plans: plans.map((plan) => (plan.features || []).includes(feature)) })),
    limits: limits.map((key) => ({ key, values: plans.map((plan) => (plan.limits as any)?.[key]) })),
  };
}

/** Move a plan one step earlier (-1) or later (1) and return the new sortOrder of each plan that changed. */
export function reorderPlans(plans: Pick<IPlan, '_id' | 'sortOrder'>[], planId: string, direction: -1 | 1) {
  const sorted = [...plans].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const index = sorted.findIndex((plan) => plan._id === planId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sorted.length) return [];
  [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  // renumber everything so duplicates and gaps cannot make the swap a no-op
  return sorted
    .map((plan, order) => ({ _id: plan._id as string, sortOrder: order }))
    .filter((update) => update.sortOrder !== plans.find((plan) => plan._id === update._id)?.sortOrder);
}

/** "Always", "From <date>", "Until <date>" or "<date> – <date>" for a coupon's redemption window. */
export function formatValidity(
  coupon: Pick<ICoupon, 'validFrom' | 'validUntil'>,
  labels: {
    from: (date: Date | string) => string;
    until: (date: Date | string) => string;
    range: (from: Date | string, until: Date | string) => string;
    always: string;
  },
) {
  if (coupon.validFrom && coupon.validUntil) return labels.range(coupon.validFrom, coupon.validUntil);
  if (coupon.validFrom) return labels.from(coupon.validFrom);
  if (coupon.validUntil) return labels.until(coupon.validUntil);
  return labels.always;
}
