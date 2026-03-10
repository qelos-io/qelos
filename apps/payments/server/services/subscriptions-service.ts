import Subscription from '../models/subscription';
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
  metadata?: Record<string, any>;
}) {
  const subscription = new Subscription({
    tenant,
    planId: data.planId,
    billableEntityType: data.billableEntityType,
    billableEntityId: data.billableEntityId,
    billingCycle: data.billingCycle,
    status: data.status || 'active',
    currentPeriodStart: data.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd,
    externalSubscriptionId: data.externalSubscriptionId,
    providerId: data.providerId,
    providerKind: data.providerKind,
    couponId: data.couponId,
    metadata: data.metadata || {},
  });

  return subscription.save();
}

export async function updateSubscriptionStatus(
  tenant: string,
  subscriptionId: string,
  status: SubscriptionStatus,
  updates: Record<string, any> = {}
) {
  const subscription = await (Subscription as any).findOneAndUpdate(
    { _id: subscriptionId, tenant },
    { $set: { status, ...updates } },
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
