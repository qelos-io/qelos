import type {
  ISubscriptionActivityItem,
  ISubscriptionHistoryEntry,
  SubscriptionActivityKind,
  SubscriptionStatus,
} from '@qelos/global-types';

export const HISTORY_LIMIT = 100;
export const ACTIVITY_LIMIT = 100;

export function buildCreatedHistoryEntry(status: SubscriptionStatus, at = new Date()): ISubscriptionHistoryEntry {
  return { type: 'created', at, to: status };
}

/** `canceled` gets its own type so timelines can tell a cancellation from other transitions. */
export function buildStatusHistoryEntry(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
  at = new Date(),
): ISubscriptionHistoryEntry {
  return { type: to === 'canceled' ? 'canceled' : 'status_changed', at, from, to };
}

export function buildCouponHistoryEntry(couponCode: string | null, at = new Date()): ISubscriptionHistoryEntry {
  return couponCode ? { type: 'coupon_applied', at, couponCode } : { type: 'coupon_removed', at };
}

const HISTORY_KINDS: Record<string, SubscriptionActivityKind> = {
  created: 'subscription.created',
  status_changed: 'subscription.status_changed',
  canceled: 'subscription.canceled',
  coupon_applied: 'coupon.applied',
  coupon_removed: 'coupon.removed',
};

const INVOICE_KINDS: Record<string, SubscriptionActivityKind> = {
  paid: 'invoice.paid',
  pending: 'invoice.pending',
  failed: 'invoice.failed',
  refunded: 'invoice.refunded',
};

const time = (value: Date | string | undefined) => (value ? new Date(value).getTime() : 0);

/**
 * Merges a subscription's recorded history with its invoices into one timeline, newest first.
 * Subscriptions created before history existed get a synthesized "created" line.
 */
export function buildActivityTimeline(
  subscription: { _id?: any; created?: Date | string; status?: SubscriptionStatus; history?: ISubscriptionHistoryEntry[] },
  invoices: any[] = [],
): ISubscriptionActivityItem[] {
  const items: ISubscriptionActivityItem[] = [];
  const history = subscription.history || [];

  for (const entry of history) {
    const kind = HISTORY_KINDS[entry.type];
    if (!kind) continue;
    items.push({ kind, at: entry.at, from: entry.from, to: entry.to, couponCode: entry.couponCode });
  }

  if (subscription.created && !history.some((entry) => entry.type === 'created')) {
    items.push({ kind: 'subscription.created', at: subscription.created });
  }

  for (const invoice of invoices) {
    const kind = INVOICE_KINDS[invoice.status];
    if (!kind) continue;
    items.push({
      kind,
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
