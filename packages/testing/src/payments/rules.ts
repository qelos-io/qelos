/**
 * The business rules of the Qelos payments service (`apps/payments`), without storage: defaults of each record,
 * subscription history and activity, the administrator summary, and coupons. Contract tests compare them with the
 * service's own functions.
 */

type Record_ = Record<string, any>;

export const withPlanDefaults = (plan: Record_) => ({
  description: '',
  features: [],
  currency: 'USD',
  isActive: true,
  dynamic: false,
  sortOrder: 0,
  limits: {},
  externalIds: {},
  metadata: {},
  ...plan,
});
export const withCouponDefaults = (coupon: Record_) => ({
  currency: 'USD',
  maxRedemptions: null,
  currentRedemptions: 0,
  applicablePlanIds: [],
  isActive: true,
  ...coupon,
});
export const withSubscriptionDefaults = (subscription: Record_) => ({ status: 'active', history: [], metadata: {}, ...subscription });
export const withInvoiceDefaults = (invoice: Record_) => ({ currency: 'USD', status: 'pending', items: [], ...invoice });

export const SUBSCRIPTION_STATUSES = ['pending', 'active', 'canceled', 'past_due', 'trialing', 'expired'];
export const BILLING_CYCLES = ['monthly', 'yearly'];

// ---------------------------------------------------------------- history and activity

const HISTORY_LIMIT = 100;
const ACTIVITY_LIMIT = 100;

export const createdEntry = (status: string, at = new Date()) => ({ type: 'created', at: at.toISOString(), to: status });
export const statusEntry = (from: string, to: string, at = new Date()) => ({
  type: to === 'canceled' ? 'canceled' : 'status_changed',
  at: at.toISOString(),
  from,
  to,
});
export const couponEntry = (couponCode: string | null, at = new Date()) =>
  couponCode ? { type: 'coupon_applied', at: at.toISOString(), couponCode } : { type: 'coupon_removed', at: at.toISOString() };
export const addHistory = (history: Record_[], entry: Record_) => [...history, entry].slice(-HISTORY_LIMIT);

const HISTORY_KINDS: Record<string, string> = {
  created: 'subscription.created',
  status_changed: 'subscription.status_changed',
  canceled: 'subscription.canceled',
  coupon_applied: 'coupon.applied',
  coupon_removed: 'coupon.removed',
};
const INVOICE_STATUSES = ['paid', 'pending', 'failed', 'refunded'];

const time = (value: unknown) => (value ? new Date(value as string).getTime() : 0);

/** A subscription's history merged with its invoices, newest first. */
export function activityTimeline(subscription: Record_, invoices: Record_[] = []) {
  const history: Record_[] = subscription.history || [];
  const items: Record_[] = history
    .filter((entry) => HISTORY_KINDS[entry.type])
    .map((entry) => ({ kind: HISTORY_KINDS[entry.type], at: entry.at, from: entry.from, to: entry.to, couponCode: entry.couponCode }));
  if (subscription.created && !history.some((entry) => entry.type === 'created')) {
    items.push({ kind: 'subscription.created', at: subscription.created });
  }
  for (const invoice of invoices) {
    if (!INVOICE_STATUSES.includes(invoice.status)) continue;
    items.push({
      kind: `invoice.${invoice.status}`,
      at: invoice.paidAt || invoice.created,
      invoiceId: invoice._id?.toString(),
      amount: invoice.amount,
      currency: invoice.currency,
      invoiceUrl: invoice.invoiceUrl,
    });
  }
  return items
    .filter((item) => item.at)
    .sort((a, b) => time(b.at) - time(a.at))
    .slice(0, ACTIVITY_LIMIT);
}

// ---------------------------------------------------------------- administrator summary

const LIVE_STATUSES = ['active', 'trialing', 'past_due'];
const ATTENTION_LIMIT = 10;
/** a pending subscription younger than this is probably still checking out */
const PENDING_GRACE_MS = 24 * 60 * 60 * 1000;

const round = (value: number) => Math.round(value * 100) / 100;

/** When the subscription entered its current status. */
const statusSince = (subscription: Record_) =>
  [...(subscription.history || [])].reverse().find((entry: Record_) => entry.to === subscription.status)?.at ?? subscription.created;

/** Counts per status and plan, estimated monthly recurring revenue, and the subscriptions that need attention. */
export function summarize(subscriptions: Record_[], plans: Record_[], now = new Date()) {
  const planById = new Map(plans.map((plan) => [String(plan._id), plan]));
  const byStatus: Record<string, number> = Object.fromEntries(SUBSCRIPTION_STATUSES.map((status) => [status, 0]));
  const planCounts = new Map<string, number>();
  const mrr = new Map<string, number>();
  let dynamicCount = 0;

  for (const { status, planId, billingCycle } of subscriptions) {
    if (!(status in byStatus)) continue;
    byStatus[status]++;
    if (!LIVE_STATUSES.includes(status)) continue;
    const id = String(planId);
    planCounts.set(id, (planCounts.get(id) ?? 0) + 1);
    const plan = planById.get(id);
    if (!plan) continue;
    if (plan.dynamic) {
      dynamicCount++;
      continue;
    }
    const monthly = billingCycle === 'yearly' ? plan.yearlyPrice / 12 : plan.monthlyPrice;
    const currency = plan.currency || 'USD';
    mrr.set(currency, (mrr.get(currency) ?? 0) + monthly);
  }

  return {
    byStatus,
    live: LIVE_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
    byPlan: [...planCounts.entries()]
      .map(([planId, count]) => ({ planId, name: planById.get(planId)?.name ?? '', count }))
      .sort((a, b) => b.count - a.count),
    mrr: [...mrr.entries()].map(([currency, amount]) => ({ currency, amount: round(amount) })).sort((a, b) => b.amount - a.amount),
    dynamicCount,
    attention: subscriptions
      .filter((s) => s.status === 'past_due' || s.status === 'pending')
      .map((s) => ({
        subscriptionId: String(s._id),
        billableEntityType: s.billableEntityType,
        billableEntityId: s.billableEntityId,
        planId: String(s.planId),
        status: s.status,
        since: statusSince(s),
      }))
      .filter((item) => item.status === 'past_due' || now.getTime() - time(item.since) > PENDING_GRACE_MS)
      .sort((a, b) => time(a.since) - time(b.since))
      .slice(0, ATTENTION_LIMIT),
  };
}

// ---------------------------------------------------------------- coupons

/** Why the active coupon cannot be used for the plan, or null when it can. `coupon` is undefined for an unknown code. */
export function couponProblem(coupon: Record_ | undefined, planId?: string, now = new Date()): { code: string; message: string } | null {
  const problem = (code: string, message: string) => ({ code, message });
  if (!coupon) return problem('COUPON_NOT_FOUND', 'coupon not found or inactive');
  if (coupon.validFrom && now < new Date(coupon.validFrom)) return problem('COUPON_NOT_YET_VALID', 'coupon is not yet valid');
  if (coupon.validUntil && now > new Date(coupon.validUntil)) return problem('COUPON_EXPIRED', 'coupon has expired');
  if (coupon.maxRedemptions != null && coupon.currentRedemptions >= coupon.maxRedemptions) {
    return problem('COUPON_MAX_REDEMPTIONS', 'coupon has reached maximum redemptions');
  }
  if (planId && coupon.applicablePlanIds?.length && !coupon.applicablePlanIds.some((id: unknown) => String(id) === planId)) {
    return problem('COUPON_NOT_APPLICABLE', 'coupon is not applicable to this plan');
  }
  return null;
}

/** When a coupon's benefit ends, counting from `from`; null when it lasts as long as the subscription. */
export function benefitEnd(coupon: Record_, from = new Date()): Date | null {
  if (!coupon.benefitDurationUnit || !coupon.benefitDurationValue) return null;
  const end = new Date(from);
  if (coupon.benefitDurationUnit === 'days') end.setUTCDate(end.getUTCDate() + coupon.benefitDurationValue);
  else end.setUTCMonth(end.getUTCMonth() + coupon.benefitDurationValue);
  return end;
}

export function discountedPrice(price: number, coupon: Record_, benefitEndsAt?: string | Date | null): number {
  if (benefitEndsAt && new Date() > new Date(benefitEndsAt)) return price;
  if (coupon.discountType === 'percentage') return round(price * (1 - coupon.discountValue / 100));
  if (coupon.discountType === 'fixed') return Math.max(0, round(price - coupon.discountValue));
  return price;
}
