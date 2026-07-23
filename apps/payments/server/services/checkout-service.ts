import { BillableEntityType, BillingCycle, CheckoutCustomer, PaymentProviderPublicContext } from '@qelos/global-types';
import * as PlansService from './plans-service';
import * as SubscriptionsService from './subscriptions-service';
import * as InvoicesService from './invoices-service';
import * as CouponsService from './coupons-service';
import * as ProviderAdapter from './provider-adapter';
import { emitCheckoutFailedEvent } from './platform-events.js';

export interface InitiateCheckoutParams {
  subscriptionId?: string;
  planId?: string;
  billingCycle?: BillingCycle;
  billableEntityType?: BillableEntityType;
  billableEntityId?: string;
  couponCode?: string;
  successUrl?: string;
  cancelUrl?: string;
  /** When true, cancels any active/trialing subscription for the billable entity before checkout. */
  reset?: boolean;
  /**
   * Real-world identity of the billable entity. Forwarded to the payment provider
   * (e.g. Sumit) so it can create a properly-named customer record.
   */
  customer?: CheckoutCustomer;
}

export interface CheckoutContext {
  userId?: string;
}

function emitInitiateCheckoutFailed(
  tenant: string,
  context: CheckoutContext,
  params: InitiateCheckoutParams,
  error: any,
  state: {
    plan?: any;
    existingSubscription?: any;
    activeSubscription?: any;
    billableEntityType?: BillableEntityType;
    billableEntityId?: string;
    providerKind?: string;
    providerContext?: PaymentProviderPublicContext;
  },
) {
  emitCheckoutFailedEvent({
    tenant,
    userId: context.userId,
    providerKind: state.providerKind,
    providerContext: state.providerContext,
    operation: 'initiateCheckout',
    code: error?.code,
    planId: state.plan?._id?.toString() ?? params.planId ?? state.existingSubscription?.planId?.toString(),
    subscriptionId: params.subscriptionId ?? state.existingSubscription?._id?.toString(),
    existingSubscriptionId: state.activeSubscription?._id?.toString(),
    billableEntityType: state.billableEntityType,
    billableEntityId: state.billableEntityId,
    couponCode: params.couponCode,
    error,
  });
}

async function cancelActiveSubscriptionForReset(
  tenant: string,
  subscription: any,
  context: CheckoutContext,
) {
  if (subscription.externalSubscriptionId && subscription.providerKind && subscription.providerId) {
    const providerContext = await ProviderAdapter.resolveProviderPublicContext(
      tenant,
      subscription.providerId,
      subscription.providerKind,
    );

    await ProviderAdapter.cancelProviderSubscription(
      tenant,
      subscription.providerId,
      subscription.providerKind,
      subscription.externalSubscriptionId,
    ).catch((error) => {
      emitCheckoutFailedEvent({
        tenant,
        userId: context.userId,
        providerKind: subscription.providerKind,
        providerContext,
        operation: 'resetActiveSubscription',
        subscriptionId: subscription._id?.toString(),
        planId: subscription.planId?.toString(),
        billableEntityType: subscription.billableEntityType,
        billableEntityId: subscription.billableEntityId,
        externalSubscriptionId: subscription.externalSubscriptionId,
        error,
      });
    });
  }

  await SubscriptionsService.cancelSubscription(tenant, subscription._id.toString());
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

export async function initiateCheckout(
  tenant: string,
  params: InitiateCheckoutParams,
  context: CheckoutContext = {},
) {
  let existingSubscription: any = null;
  let activeSubscription: any = null;
  let plan: any;
  let billingCycle: BillingCycle;
  let billableEntityType: BillableEntityType;
  let billableEntityId: string;
  let providerKind: string | undefined;
  let providerContext: PaymentProviderPublicContext | undefined;

  try {
    if (params.subscriptionId) {
      existingSubscription = await SubscriptionsService.getSubscriptionById(tenant, params.subscriptionId);
      if (existingSubscription.status !== 'pending') {
        throw { code: 'SUBSCRIPTION_NOT_PENDING', message: 'Subscription is not in pending status' };
      }
      plan = await PlansService.getPlanById(tenant, existingSubscription.planId);
      billingCycle = existingSubscription.billingCycle;
      billableEntityType = existingSubscription.billableEntityType;
      billableEntityId = existingSubscription.billableEntityId;
    } else {
      plan = await PlansService.getPlanById(tenant, params.planId!);
      billingCycle = params.billingCycle!;
      billableEntityType = params.billableEntityType!;
      billableEntityId = params.billableEntityId!;

      if (plan.dynamic) {
        throw {
          code: 'DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION',
          message: 'Dynamic plans require a pre-created subscription; ask an admin to set the amount first',
        };
      }
    }

    if (!plan.isActive) {
      throw { code: 'PLAN_NOT_ACTIVE', message: 'This plan is not currently available' };
    }

    let basePrice: number;
    if (plan.dynamic) {
      const dynamicAmount = existingSubscription.dynamicAmount;
      if (!dynamicAmount || dynamicAmount <= 0) {
        throw { code: 'DYNAMIC_AMOUNT_NOT_SET', message: 'Admin must set the dynamic amount on this subscription before checkout' };
      }
      basePrice = dynamicAmount;
    } else {
      basePrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    }

    let coupon: any = null;
    let finalPrice = basePrice;
    if (params.couponCode) {
      coupon = await CouponsService.validateCoupon(tenant, params.couponCode, plan._id.toString());
      finalPrice = calculateDiscountedPrice(basePrice, coupon);
    }

    activeSubscription = await SubscriptionsService.getActiveSubscription(tenant, billableEntityType, billableEntityId);
    if (activeSubscription) {
      if (params.reset) {
        await cancelActiveSubscriptionForReset(tenant, activeSubscription, context);
        activeSubscription = null;
      } else {
        throw {
          code: 'ACTIVE_SUBSCRIPTION_EXISTS',
          message: 'An active subscription already exists',
          existingSubscriptionId: activeSubscription._id.toString(),
        };
      }
    }

    const config = await ProviderAdapter.getPaymentsConfiguration(tenant);
    providerKind = config.providerKind;
    providerContext = config.providerContext;

    if (plan.dynamic && config.providerKind !== 'sumit') {
      throw {
        code: 'DYNAMIC_PLAN_UNSUPPORTED_PROVIDER',
        message: 'Dynamic pricing plans require the Sumit payment provider (Paddle/PayPal use fixed catalog prices).',
      };
    }

    const successUrl = params.successUrl || config.successUrl;
    const cancelUrl = params.cancelUrl || config.cancelUrl;

    if (config.providerKind === 'sumit' && (!successUrl || !cancelUrl)) {
      throw {
        code: 'MISSING_REDIRECT_URLS',
        message: 'Sumit checkout requires successUrl and cancelUrl. Configure them in Admin → Pricing Plans → Configuration or pass them in the checkout request.',
      };
    }

    if (finalPrice <= 0) {
      throw {
        code: 'INVALID_CHECKOUT_AMOUNT',
        message: 'Checkout amount must be greater than zero',
      };
    }

    const providerResult = await ProviderAdapter.createCheckout(
      tenant,
      config.providerSourceId,
      config.providerKind,
      {
        plan,
        billingCycle,
        billableEntityType,
        billableEntityId,
        amount: finalPrice,
        currency: plan.currency,
        successUrl,
        cancelUrl,
        customer: params.customer,
      },
    );

    let subscription: any;
    if (existingSubscription) {
      subscription = await SubscriptionsService.updateSubscriptionStatus(tenant, params.subscriptionId!, 'pending', {
        externalSubscriptionId: providerResult.externalSubscriptionId || providerResult.externalOrderId,
        providerId: config.providerSourceId,
        providerKind: config.providerKind,
        couponId: coupon?._id?.toString(),
        metadata: {
          ...(existingSubscription.metadata || {}),
          originalPrice: basePrice,
          finalPrice,
          couponCode: params.couponCode,
        },
      });
    } else {
      subscription = await SubscriptionsService.createSubscription(tenant, {
        planId: params.planId!,
        billableEntityType,
        billableEntityId,
        billingCycle,
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
    }

    return {
      subscriptionId: subscription._id,
      checkoutUrl: providerResult.checkoutUrl,
      clientToken: providerResult.clientToken,
    };
  } catch (error) {
    emitInitiateCheckoutFailed(tenant, context, params, error, {
      plan,
      existingSubscription,
      activeSubscription,
      billableEntityType,
      billableEntityId,
      providerKind,
      providerContext,
    });
    throw error;
  }
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

export async function cancelCheckoutSubscription(
  tenant: string,
  subscriptionId: string,
  context: CheckoutContext = {},
) {
  let subscription: any;

  try {
    subscription = await SubscriptionsService.getSubscriptionById(tenant, subscriptionId);

    if (subscription.externalSubscriptionId && subscription.providerKind && subscription.providerId) {
      const providerContext = await ProviderAdapter.resolveProviderPublicContext(
        tenant,
        subscription.providerId,
        subscription.providerKind,
      );

      await ProviderAdapter.cancelProviderSubscription(
        tenant,
        subscription.providerId,
        subscription.providerKind,
        subscription.externalSubscriptionId,
      ).catch((error) => {
        emitCheckoutFailedEvent({
          tenant,
          userId: context.userId,
          providerKind: subscription.providerKind,
          providerContext,
          operation: 'cancelCheckoutSubscription',
          subscriptionId,
          planId: subscription.planId?.toString(),
          billableEntityType: subscription.billableEntityType,
          billableEntityId: subscription.billableEntityId,
          externalSubscriptionId: subscription.externalSubscriptionId,
          error,
        });
      });
    }

    return SubscriptionsService.updateSubscriptionStatus(tenant, subscriptionId, 'canceled');
  } catch (error) {
    emitCheckoutFailedEvent({
      tenant,
      userId: context.userId,
      providerKind: subscription?.providerKind,
      operation: 'cancelCheckoutSubscription',
      subscriptionId,
      planId: subscription?.planId?.toString(),
      billableEntityType: subscription?.billableEntityType,
      billableEntityId: subscription?.billableEntityId,
      externalSubscriptionId: subscription?.externalSubscriptionId,
      code: error?.code,
      error,
    });
    throw error;
  }
}
