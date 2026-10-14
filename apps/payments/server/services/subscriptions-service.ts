import Subscription from '../models/subscription';
import * as CouponsService from './coupons-service';
import * as InvoicesService from './invoices-service';
import {
  HISTORY_LIMIT,
  buildActivityTimeline,
  buildCouponHistoryEntry,
  buildCreatedHistoryEntry,
  buildStatusHistoryEntry,
} from './subscription-activity';
import { BillableEntityType, SubscriptionStatus, BillingCycle } from '@qelos/global-types';

export async function listSubscriptions(
  tenant: string,
  filters: { billableEntityType?: BillableEntityType; billableEntityId?: string; status?: SubscriptionStatus } = {}
) {
  const query: any = { tenant };
  if (filters.billableEntityType) query.billableEntityType = filters.billableEntityType;
  if (filters.billableEntityId) query.billableEntityId = filters.billableEntityId;
  if (filters.status) query.status = filters.status;
  return (Subscription as any).find(query).sort({ created: -1 }).lean().exec();
}

export async function listWorkspaceSubscriptions(
  tenant: string,
  filters: { billableEntityId?: string; planId?: string; status?: SubscriptionStatus } = {}
) {
  const query: any = { tenant, billableEntityType: 'workspace' };
  if (filters.billableEntityId) query.billableEntityId = filters.billableEntityId;
  if (filters.planId) query.planId = filters.planId;
  if (filters.status) query.status = filters.status;
  return (Subscription as any)
    .find(query)
    .sort({ created: -1 })
    .populate('planId')
    .populate('couponId', 'code discountType discountValue currency')
    .lean()
    .exec();
}

export async function getSubscriptionById(tenant: string, subscriptionId: string) {
  const subscription = await (Subscription as any).findOne({ _id: subscriptionId, tenant }).lean().exec();
  if (!subscription) {
    throw { code: 'SUBSCRIPTION_NOT_FOUND' };
  }
  return subscription;
}

export async function getActiveSubscription(
  tenant: string,
  billableEntityType: BillableEntityType,
  billableEntityId: string
) {
  return (Subscription as any).findOne({
    tenant,
    billableEntityType,
    billableEntityId,
    status: { $in: ['active', 'trialing'] },
  }).lean().exec();
}

export async function createSubscription(tenant: string, data: {
  planId: string;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  billingCycle: BillingCycle;
  status?: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  externalSubscriptionId?: string;
  providerId?: string;
  providerKind?: string;
  couponId?: string;
  /** Resolved to `couponId`; validated against the plan and redeemed immediately when the subscription is active. */
  couponCode?: string;
  dynamicAmount?: number;
  metadata?: Record<string, any>;
}) {
  const status = data.status || 'active';
  let couponId = data.couponId;
  let couponBenefitEndsAt: Date | undefined;
  let appliedCouponCode: string | undefined;

  if (data.couponCode) {
    const coupon = await CouponsService.validateCoupon(tenant, data.couponCode, data.planId.toString());
    couponId = coupon._id.toString();
    appliedCouponCode = data.couponCode;
    if (status === 'active') {
      const redeemed = await CouponsService.redeemCoupon(tenant, couponId);
      couponBenefitEndsAt = CouponsService.calculateCouponBenefitEndDate(
        redeemed, data.currentPeriodStart || new Date(),
      ) || undefined;
    }
  }

  const subscription = new Subscription({
    tenant,
    planId: data.planId,
    billableEntityType: data.billableEntityType,
    billableEntityId: data.billableEntityId,
    billingCycle: data.billingCycle,
    status,
    currentPeriodStart: data.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd,
    externalSubscriptionId: data.externalSubscriptionId,
    providerId: data.providerId,
    providerKind: data.providerKind,
    couponId,
    couponBenefitEndsAt,
    dynamicAmount: data.dynamicAmount,
    history: [
      buildCreatedHistoryEntry(status),
      ...(appliedCouponCode ? [buildCouponHistoryEntry(appliedCouponCode)] : []),
    ],
    metadata: data.metadata || {},
  });

  return subscription.save();
}

export async function setDynamicAmount(tenant: string, subscriptionId: string, amount: number) {
  if (amount <= 0) {
    throw { code: 'INVALID_AMOUNT' };
  }

  const subscription = await (Subscription as any).findOneAndUpdate(
    { _id: subscriptionId, tenant },
    { $set: { dynamicAmount: amount } },
    { new: true }
  ).lean().exec();

  if (!subscription) {
    throw { code: 'SUBSCRIPTION_NOT_FOUND' };
  }

  return subscription;
}

export async function updateSubscriptionStatus(
  tenant: string,
  subscriptionId: string,
  status: SubscriptionStatus,
  updates: Record<string, any> = {}
) {
  const previous = await (Subscription as any).findOne({ _id: subscriptionId, tenant }).select('status').lean().exec();

  const update: Record<string, any> = { $set: { status, ...updates } };
  if (previous && previous.status !== status) {
    update.$push = { history: { $each: [buildStatusHistoryEntry(previous.status, status)], $slice: -HISTORY_LIMIT } };
  }

  const subscription = await (Subscription as any).findOneAndUpdate(
    { _id: subscriptionId, tenant },
    update,
    { new: true }
  ).lean().exec();

  if (!subscription) {
    throw { code: 'SUBSCRIPTION_NOT_FOUND' };
  }

  return subscription;
}

export async function cancelSubscription(tenant: string, subscriptionId: string) {
  return updateSubscriptionStatus(tenant, subscriptionId, 'canceled');
}

/**
 * Attaches a coupon to an existing subscription (or removes it when `couponCode` is null).
 * Active subscriptions redeem the coupon immediately; others redeem on activation.
 */
export async function setSubscriptionCoupon(tenant: string, subscriptionId: string, couponCode: string | null) {
  const subscription = await getSubscriptionById(tenant, subscriptionId);
  const update: Record<string, any> = {};

  if (!couponCode) {
    update.$unset = { couponId: '', couponBenefitEndsAt: '' };
    if (subscription.couponId) {
      update.$push = { history: { $each: [buildCouponHistoryEntry(null)], $slice: -HISTORY_LIMIT } };
    }
  } else {
    const coupon = await CouponsService.validateCoupon(tenant, couponCode, subscription.planId.toString());
    if (subscription.couponId?.toString() === coupon._id.toString()) {
      return subscription;
    }

    update.$set = { couponId: coupon._id };
    update.$unset = { couponBenefitEndsAt: '' };
    update.$push = { history: { $each: [buildCouponHistoryEntry(couponCode)], $slice: -HISTORY_LIMIT } };
    if (['active', 'trialing'].includes(subscription.status)) {
      const redeemed = await CouponsService.redeemCoupon(tenant, coupon._id.toString());
      const benefitEndsAt = CouponsService.calculateCouponBenefitEndDate(redeemed, new Date());
      if (benefitEndsAt) {
        update.$set.couponBenefitEndsAt = benefitEndsAt;
        delete update.$unset;
      }
    }
  }

  return (Subscription as any)
    .findOneAndUpdate({ _id: subscriptionId, tenant }, update, { new: true })
    .lean()
    .exec();
}

/** The merged timeline (recorded history + invoices) of one subscription, newest first. */
export async function getSubscriptionActivity(tenant: string, subscriptionId: string) {
  const subscription = await getSubscriptionById(tenant, subscriptionId);
  const invoices = await InvoicesService.listBySubscription(tenant, subscriptionId);
  return { subscription, activity: buildActivityTimeline(subscription, invoices) };
}
