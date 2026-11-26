import type { Doc, MockState } from '../state/mock-state.js';
import * as rules from './rules.js';

/** A failure with the `code` the payments service reports. */
export class PaymentsError extends Error {
  constructor(
    public code: string | undefined,
    message = '',
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'PaymentsError';
  }
}

/** Plans, coupons, subscriptions and invoices in the mock state, changed the way the payments service changes them. */
export function createPaymentsStore(state: MockState) {
  const collection = (name: 'pricingPlans' | 'coupons' | 'subscriptions' | 'invoices') => state.collection(name);
  const now = () => new Date().toISOString();

  /** newest first */
  const newest = (list: Doc[]) => [...list].reverse().sort((a, b) => String(b.created ?? '').localeCompare(String(a.created ?? '')));

  function reader(name: 'pricingPlans' | 'coupons' | 'subscriptions' | 'invoices', defaults: (doc: any) => any) {
    return {
      get(id: unknown): Doc | undefined {
        const doc = collection(name).get(String(id));
        return doc && defaults(doc);
      },
      list(filters: Record<string, unknown> = {}): Doc[] {
        return newest(collection(name).list().map(defaults)).filter((doc: any) =>
          Object.entries(filters).every(([key, value]) => value === undefined || String(doc[key]) === String(value)),
        );
      },
    };
  }

  const plans = reader('pricingPlans', rules.withPlanDefaults);
  const coupons = reader('coupons', rules.withCouponDefaults);
  const subscriptions = reader('subscriptions', rules.withSubscriptionDefaults);
  const invoices = reader('invoices', rules.withInvoiceDefaults);

  /** The active coupon with this code, when it can be used for the plan; throws with the service's code otherwise. */
  function usableCoupon(code: unknown, planId?: string): Doc {
    const coupon = coupons.list({ code, isActive: true })[0];
    const problem = rules.couponProblem(coupon, planId);
    if (problem) throw new PaymentsError(problem.code, problem.message);
    return coupon;
  }

  function redeem(couponId: string): Doc | undefined {
    const coupon = coupons.get(couponId);
    if (!coupon?.isActive) return undefined;
    return collection('coupons').update(coupon._id, { currentRedemptions: coupon.currentRedemptions + 1 });
  }

  function existing(id: unknown): Doc {
    const subscription = subscriptions.get(id);
    if (!subscription) throw new PaymentsError('SUBSCRIPTION_NOT_FOUND');
    return subscription;
  }

  const activeSubscription = (billableEntityType: string, billableEntityId: string) =>
    subscriptions
      .list({ billableEntityType, billableEntityId })
      .reverse()
      .find((s) => s.status === 'active' || s.status === 'trialing');

  function createSubscription(data: Record<string, any>): Doc {
    const status = data.status || 'active';
    let couponId = data.couponId;
    let couponBenefitEndsAt: string | undefined;
    if (data.couponCode) {
      const coupon = usableCoupon(data.couponCode, String(data.planId));
      couponId = coupon._id;
      if (status === 'active') {
        const redeemed = redeem(coupon._id);
        couponBenefitEndsAt = redeemed && rules.benefitEnd(redeemed, new Date(data.currentPeriodStart || Date.now()))?.toISOString();
      }
    }
    const invalid = [
      !data.planId && 'planId',
      !['user', 'workspace'].includes(data.billableEntityType) && 'billableEntityType',
      !data.billableEntityId && 'billableEntityId',
      !rules.BILLING_CYCLES.includes(data.billingCycle) && 'billingCycle',
      !rules.SUBSCRIPTION_STATUSES.includes(status) && 'status',
    ].filter(Boolean);
    if (invalid.length) throw new PaymentsError(undefined, `Subscription validation failed: ${invalid.join(', ')}`);

    const { couponCode, ...fields } = data;
    const kept = Object.fromEntries(
      ['planId', 'billableEntityType', 'billableEntityId', 'billingCycle', 'currentPeriodStart', 'currentPeriodEnd', 'externalSubscriptionId', 'providerId', 'providerKind', 'dynamicAmount', 'metadata']
        .filter((key) => fields[key] !== undefined)
        .map((key) => [key, fields[key]]),
    );
    return collection('subscriptions').insert({
      ...kept,
      status,
      couponId,
      couponBenefitEndsAt,
      history: [rules.createdEntry(status), ...(couponCode ? [rules.couponEntry(couponCode)] : [])],
      metadata: data.metadata || {},
      tenant: state.settings.tenantId,
      created: now(),
    });
  }

  /** Change the status, recording the change in the history. */
  function setStatus(id: unknown, status: string, changes: Record<string, unknown> = {}): Doc {
    const subscription = existing(id);
    const history =
      subscription.status === status ? subscription.history : rules.addHistory(subscription.history, rules.statusEntry(subscription.status, status));
    return collection('subscriptions').update(subscription._id, { ...changes, status, history })!;
  }

  return { collection, plans, coupons, subscriptions, invoices, usableCoupon, redeem, existing, activeSubscription, createSubscription, setStatus };
}

export type PaymentsStore = ReturnType<typeof createPaymentsStore>;
