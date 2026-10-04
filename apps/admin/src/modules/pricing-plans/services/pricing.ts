import type { BillingCycle, ICoupon, IPlan } from '@qelos/global-types';

export function formatMoney(amount: number | undefined, currency = 'USD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount || 0);
}

export function planPrice(plan: Pick<IPlan, 'monthlyPrice' | 'yearlyPrice'>, cycle: BillingCycle) {
  return cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
}

/** Price after a coupon's discount (never below zero). */
export function discountedPrice(base: number, coupon: Pick<ICoupon, 'discountType' | 'discountValue'>) {
  const discounted = coupon.discountType === 'percentage'
    ? base * (1 - coupon.discountValue / 100)
    : base - coupon.discountValue;
  return Math.max(0, Math.round(discounted * 100) / 100);
}

export function couponDiscountLabel(coupon: Pick<ICoupon, 'discountType' | 'discountValue' | 'currency'>) {
  return coupon.discountType === 'percentage'
    ? `${coupon.discountValue}%`
    : formatMoney(coupon.discountValue, coupon.currency);
}

export function formatDate(date?: string | Date) {
  return date ? new Date(date).toLocaleDateString() : '—';
}

export const subscriptionStatusTagType: Record<string, string> = {
  active: 'success',
  trialing: 'warning',
  pending: 'warning',
  past_due: 'danger',
  canceled: 'info',
  expired: 'info',
};

/** Canceled and expired subscriptions no longer attach an account to a plan. */
export function isLiveSubscription(subscription: { status: string }) {
  return !['canceled', 'expired'].includes(subscription.status);
}
