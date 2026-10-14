import type { ICoupon, IPlan, ISubscription, ISubscriptionActivityItem, SubscriptionStatus } from '@qelos/global-types';

export type SubscriptionState =
  | 'none'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'pending'
  | 'canceled_running' // canceled, but the paid period has not ended yet
  | 'canceled'
  | 'expired';

export type StateTone = 'success' | 'warning' | 'danger' | 'neutral';

const PICK_RANK: Record<SubscriptionStatus, number> = {
  active: 0,
  trialing: 1,
  past_due: 2,
  pending: 3,
  canceled: 4,
  expired: 5,
};

const time = (value?: Date | string) => (value ? new Date(value).getTime() : 0);

/** The subscription that best describes an account: live ones first, then the most recent ended one. */
export function pickCurrentSubscription(subscriptions: ISubscription[] = []): ISubscription | null {
  if (!subscriptions.length) return null;
  return (
    [...subscriptions].sort(
      (a, b) => (PICK_RANK[a.status] ?? 9) - (PICK_RANK[b.status] ?? 9) || time(b.created) - time(a.created),
    )[0] ?? null
  );
}

export function getSubscriptionState(subscription: ISubscription | null, now = new Date()): SubscriptionState {
  if (!subscription) return 'none';
  if (subscription.status === 'canceled') {
    return time(subscription.currentPeriodEnd) > now.getTime() ? 'canceled_running' : 'canceled';
  }
  return subscription.status;
}

export const STATE_TONES: Record<SubscriptionState, StateTone> = {
  none: 'neutral',
  active: 'success',
  trialing: 'warning',
  past_due: 'danger',
  pending: 'warning',
  canceled_running: 'warning',
  canceled: 'neutral',
  expired: 'neutral',
};

/** Whether plan changes must cancel the current subscription first. */
export function isLiveSubscription(subscription: ISubscription | null) {
  return !!subscription && ['active', 'trialing', 'past_due'].includes(subscription.status);
}

export function formatMoney(amount: number | undefined, currency: string | undefined, locale?: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'USD' }).format(amount || 0);
}

export function getPlanPrice(plan: Pick<IPlan, 'monthlyPrice' | 'yearlyPrice'>, cycle: 'monthly' | 'yearly') {
  return (cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice) || 0;
}

/** What yearly billing saves compared with twelve monthly payments. */
export function getYearlySaving(plan: Pick<IPlan, 'monthlyPrice' | 'yearlyPrice'>) {
  if (!plan.monthlyPrice || !plan.yearlyPrice) return { percent: 0, amount: 0 };
  const amount = plan.monthlyPrice * 12 - plan.yearlyPrice;
  if (amount <= 0) return { percent: 0, amount: 0 };
  return { percent: Math.round((amount / (plan.monthlyPrice * 12)) * 100), amount };
}

export function getDiscountAmount(price: number, coupon: Pick<ICoupon, 'discountType' | 'discountValue'> | null) {
  if (!coupon || price <= 0) return 0;
  const raw = coupon.discountType === 'percentage' ? (price * coupon.discountValue) / 100 : coupon.discountValue;
  return Math.min(price, Math.max(0, Math.round(raw * 100) / 100));
}

/** The coupon code currently on the subscription, according to its (newest-first) activity. */
export function getActiveCouponCode(activity: ISubscriptionActivityItem[] = []): string | null {
  for (const item of activity) {
    if (item.kind === 'coupon.removed') return null;
    if (item.kind === 'coupon.applied') return item.couponCode ?? null;
  }
  return null;
}

/** `{ maxSeats: 10, sso: true }` → `[{ label: 'Max seats', value: '10' }, { label: 'Sso', value: true }]` */
export function describePlanLimits(limits: IPlan['limits'] | undefined) {
  return Object.entries(limits || {})
    .filter(([, value]) => value !== false && value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
      return { key, label: spaced.charAt(0).toUpperCase() + spaced.slice(1), value: value === true ? true : String(value) };
    });
}

export function daysUntil(date: Date | string | undefined, now = new Date()) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - now.getTime()) / 86_400_000);
}
