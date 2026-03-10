import { BillableEntityType, BillingCycle } from '@qelos/global-types';
import * as PlansService from './plans-service';
import * as SubscriptionsService from './subscriptions-service';
import * as InvoicesService from './invoices-service';
import * as CouponsService from './coupons-service';
import * as ProviderAdapter from './provider-adapter';

export interface InitiateCheckoutParams {
  planId: string;
  billingCycle: BillingCycle;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  couponCode?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export function calculateDiscountedPrice(
  basePrice: number,
  coupon: { discountType: string; discountValue: number },
): number {
  if (coupon.discountType === 'percentage') {
    return Math.round(basePrice * (1 - coupon.discountValue / 100) * 100) / 100;
  }
  if (coupon.discountType === 'fixed') {
    return Math.max(0, Math.round((basePrice - coupon.discountValue) * 100) / 100);
  }
  return basePrice;
}

export async function initiateCheckout(tenant: string, params: InitiateCheckoutParams) {
  const plan = await PlansService.getPlanById(tenant, params.planId);
  if (!plan.isActive) {
    throw { code: 'PLAN_NOT_ACTIVE', message: 'This plan is not currently available' };
  }

  const basePrice = params.billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

  let coupon: any = null;
  let finalPrice = basePrice;
  if (params.couponCode) {
    coupon = await CouponsService.validateCoupon(tenant, params.couponCode, params.planId);
    finalPrice = calculateDiscountedPrice(basePrice, coupon);
  }

  const existing = await SubscriptionsService.getActiveSubscription(
    tenant,
    params.billableEntityType,
    params.billableEntityId,
  );
  if (existing) {
    throw { code: 'ACTIVE_SUBSCRIPTION_EXISTS', message: 'An active subscription already exists' };
  }

  const config = await ProviderAdapter.getPaymentsConfiguration(tenant);

  const successUrl = params.successUrl || config.successUrl;
  const cancelUrl = params.cancelUrl || config.cancelUrl;

  const providerResult = await ProviderAdapter.createCheckout(
    tenant,
    config.providerSourceId,
    config.providerKind,
    {
      plan,
      billingCycle: params.billingCycle,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      amount: finalPrice,
      currency: plan.currency,
      successUrl,
      cancelUrl,
    },
  );

  const subscription = await SubscriptionsService.createSubscription(tenant, {
    planId: params.planId,
    billableEntityType: params.billableEntityType,
    billableEntityId: params.billableEntityId,
    billingCycle: params.billingCycle,
    status: 'pending',
    externalSubscriptionId: providerResult.externalSubscriptionId || providerResult.externalOrderId,
    providerId: config.providerSourceId,
    providerKind: config.providerKind,
    couponId: coupon?._id?.toString(),
    metadata: {
      originalPrice: basePrice,
      finalPrice,
      couponCode: params.couponCode,
    },
  });

  return {
    subscriptionId: subscription._id,
    checkoutUrl: providerResult.checkoutUrl,
    clientToken: providerResult.clientToken,
  };
}

export async function activateSubscription(
  tenant: string,
  subscriptionId: string,
  updates: {
    externalSubscriptionId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  } = {},
) {
  const subscription = await SubscriptionsService.updateSubscriptionStatus(
    tenant,
    subscriptionId,
    'active',
    {
      ...updates,
      ...(updates.currentPeriodStart && { currentPeriodStart: updates.currentPeriodStart }),
      ...(updates.currentPeriodEnd && { currentPeriodEnd: updates.currentPeriodEnd }),
      ...(updates.externalSubscriptionId && { externalSubscriptionId: updates.externalSubscriptionId }),
    },
  );

  if (subscription.couponId) {
    await CouponsService.redeemCoupon(tenant, subscription.couponId.toString()).catch(() => {});
  }

  return subscription;
}

export async function createInvoiceForPayment(
  tenant: string,
  subscription: any,
  paymentData: {
    amount: number;
    currency?: string;
    externalInvoiceId?: string;
    invoiceUrl?: string;
    periodStart?: Date;
    periodEnd?: Date;
  },
) {
  return InvoicesService.createInvoice(tenant, {
    subscriptionId: subscription._id?.toString(),
    billableEntityType: subscription.billableEntityType,
    billableEntityId: subscription.billableEntityId,
    amount: paymentData.amount,
    currency: paymentData.currency || subscription.currency || 'USD',
    status: 'paid',
    externalInvoiceId: paymentData.externalInvoiceId,
    providerKind: subscription.providerKind,
    invoiceUrl: paymentData.invoiceUrl,
    paidAt: new Date(),
    periodStart: paymentData.periodStart || subscription.currentPeriodStart,
    periodEnd: paymentData.periodEnd || subscription.currentPeriodEnd,
    items: [{
      description: `Subscription - ${subscription.billingCycle}`,
      amount: paymentData.amount,
      quantity: 1,
    }],
  });
}

export async function cancelCheckoutSubscription(tenant: string, subscriptionId: string) {
  const subscription = await SubscriptionsService.getSubscriptionById(tenant, subscriptionId);

  if (subscription.externalSubscriptionId && subscription.providerKind && subscription.providerId) {
    await ProviderAdapter.cancelProviderSubscription(
      tenant,
      subscription.providerId,
      subscription.providerKind,
      subscription.externalSubscriptionId,
    ).catch(() => {});
  }

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscriptionId, 'canceled');
}
