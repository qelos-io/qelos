import type { Doc, MockState } from '../state/mock-state.js';
import { createPaymentsStore } from './store.js';
import { benefitEnd } from './rules.js';

export interface PaymentOptions {
  /** what was charged. default: the checkout's final price, else the plan's price */
  amount?: number;
  invoiceUrl?: string;
}

/** What the payment provider would report. No money moves: each call changes the subscription as its webhook would. */
export interface PaymentsControls {
  /** A successful payment: a pending or past due subscription becomes active. Always adds a paid invoice. */
  pay(subscriptionId: string, options?: PaymentOptions): { subscription: Doc; invoice: Doc };
  /** A failed payment: the subscription becomes `past_due`. */
  fail(subscriptionId: string): Doc;
  /** The subscription was canceled on the provider's side. */
  cancel(subscriptionId: string): Doc;
}

export function createPaymentsControls(state: MockState): PaymentsControls {
  const store = createPaymentsStore(state);

  const known = (id: string) => {
    if (!store.subscriptions.get(id)) throw new Error(`@qelos/testing: subscription not found: ${id}`);
    return store.existing(id);
  };

  return {
    pay(subscriptionId, options = {}) {
      let subscription = known(subscriptionId);
      const plan = store.plans.get(subscription.planId);
      const start = new Date();
      if (subscription.status === 'pending' || subscription.status === 'past_due') {
        const end = new Date(start);
        if (subscription.billingCycle === 'yearly') end.setUTCFullYear(end.getUTCFullYear() + 1);
        else end.setUTCMonth(end.getUTCMonth() + 1);
        const first = subscription.status === 'pending';
        const changes: Record<string, unknown> = { currentPeriodStart: start.toISOString(), currentPeriodEnd: end.toISOString() };
        // a coupon chosen at checkout counts as used once the first payment arrives
        const redeemed = first && subscription.couponId ? store.redeem(subscription.couponId) : undefined;
        const until = redeemed && benefitEnd(redeemed, start);
        if (until) changes.couponBenefitEndsAt = until.toISOString();
        subscription = store.setStatus(subscriptionId, 'active', changes);
      }
      const listPrice = subscription.billingCycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice;
      const amount = options.amount ?? subscription.metadata?.finalPrice ?? (plan?.dynamic ? subscription.dynamicAmount : listPrice) ?? 0;
      const invoice = store.collection('invoices').insert({
        tenant: state.settings.tenantId,
        subscriptionId: subscription._id,
        billableEntityType: subscription.billableEntityType,
        billableEntityId: subscription.billableEntityId,
        amount,
        currency: plan?.currency || 'USD',
        status: 'paid',
        providerKind: subscription.providerKind,
        invoiceUrl: options.invoiceUrl,
        paidAt: start.toISOString(),
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        items: [{ description: `Subscription - ${subscription.billingCycle}`, amount, quantity: 1 }],
        created: start.toISOString(),
      });
      return { subscription, invoice };
    },
    fail: (subscriptionId) => store.setStatus(known(subscriptionId)._id, 'past_due'),
    cancel: (subscriptionId) => store.setStatus(known(subscriptionId)._id, 'canceled'),
  };
}
