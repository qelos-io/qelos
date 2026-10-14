import type {
  BillableEntityType,
  ISubscriptionAttentionItem,
  ISubscriptionsSummary,
  SubscriptionStatus,
  SubscriptionStatusCounts,
} from '@qelos/global-types';

export const LIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due'];
export const ATTENTION_LIMIT = 10;
/** A pending subscription younger than this is probably still checking out. */
export const PENDING_GRACE_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionGroup {
  _id: { status: SubscriptionStatus; planId: any; billingCycle: 'monthly' | 'yearly' };
  count: number;
}

export interface SummaryPlan {
  _id: any;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  dynamic?: boolean;
}

const STATUSES: SubscriptionStatus[] = ['pending', 'active', 'canceled', 'past_due', 'trialing', 'expired'];

function emptyCounts(): SubscriptionStatusCounts {
  return Object.fromEntries(STATUSES.map((status) => [status, 0])) as SubscriptionStatusCounts;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Folds status/plan/cycle groups (from one aggregation) into the admin summary. */
export function buildSubscriptionsSummary(
  groups: SubscriptionGroup[],
  plans: SummaryPlan[],
): Omit<ISubscriptionsSummary, 'attention'> {
  const planById = new Map(plans.map((plan) => [String(plan._id), plan]));
  const byStatus = emptyCounts();
  const planCounts = new Map<string, number>();
  const mrr = new Map<string, number>();
  let dynamicCount = 0;

  for (const group of groups) {
    const { status, planId, billingCycle } = group._id;
    if (!(status in byStatus)) continue;
    byStatus[status] += group.count;
    if (!LIVE_STATUSES.includes(status)) continue;

    const id = String(planId);
    planCounts.set(id, (planCounts.get(id) ?? 0) + group.count);

    const plan = planById.get(id);
    if (!plan) continue;
    if (plan.dynamic) {
      dynamicCount += group.count;
      continue;
    }
    const monthly = billingCycle === 'yearly' ? plan.yearlyPrice / 12 : plan.monthlyPrice;
    const currency = plan.currency || 'USD';
    mrr.set(currency, (mrr.get(currency) ?? 0) + monthly * group.count);
  }

  return {
    byStatus,
    live: LIVE_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
    byPlan: [...planCounts.entries()]
      .map(([planId, count]) => ({ planId, name: planById.get(planId)?.name ?? '', count }))
      .sort((a, b) => b.count - a.count),
    mrr: [...mrr.entries()].map(([currency, amount]) => ({ currency, amount: round(amount) })).sort((a, b) => b.amount - a.amount),
    dynamicCount,
  };
}

const time = (value: any) => (value ? new Date(value).getTime() : 0);

/** When the subscription entered its current status, from its history (falls back to creation). */
export function statusSince(subscription: { status: SubscriptionStatus; created?: any; history?: any[] }) {
  const entry = [...(subscription.history || [])].reverse().find((item) => item.to === subscription.status);
  return entry?.at ?? subscription.created;
}

/** Past-due subscriptions plus pending ones that outlived checkout, longest waiting first. */
export function pickAttentionItems(subscriptions: any[], now = new Date()): ISubscriptionAttentionItem[] {
  return subscriptions
    .filter((subscription) => subscription.status === 'past_due' || subscription.status === 'pending')
    .map((subscription) => ({
      subscriptionId: String(subscription._id),
      billableEntityType: subscription.billableEntityType as BillableEntityType,
      billableEntityId: subscription.billableEntityId,
      planId: String(subscription.planId),
      status: subscription.status as 'past_due' | 'pending',
      since: statusSince(subscription),
    }))
    .filter((item) => item.status === 'past_due' || now.getTime() - time(item.since) > PENDING_GRACE_MS)
    .sort((a, b) => time(a.since) - time(b.since))
    .slice(0, ATTENTION_LIMIT);
}
