import { Response } from 'express';
import * as CheckoutService from '../services/checkout-service';
import * as SubscriptionsService from '../services/subscriptions-service';
import { BillingCycle, BillableEntityType } from '@qelos/global-types';

function resolveUserEntityId(req): string | undefined {
  return req.user?.workspace || req.user?._id;
}

export async function initiateCheckout(req, res: Response) {
  try {
    const tenant = req.headers.tenant;
    const {
      subscriptionId,
      planId,
      billingCycle,
      billableEntityType,
      billableEntityId,
      couponCode,
      successUrl,
      cancelUrl,
    } = req.body;

    const isPrivileged = req.user?.isPrivileged;
    const amount = isPrivileged ? req.body.amount : undefined;

    if (!subscriptionId && !planId) {
      res.status(400).json({ message: 'subscriptionId or planId is required' }).end();
      return;
    }

    if (billingCycle && !['monthly', 'yearly'].includes(billingCycle)) {
      res.status(400).json({ message: 'billingCycle must be monthly or yearly' }).end();
      return;
    }

    let resolvedSubscriptionId: string | undefined = subscriptionId;

    if (!resolvedSubscriptionId && isPrivileged && planId && amount) {
      // Admin convenience: create pending subscription with dynamicAmount, then checkout
      if (!billingCycle) {
        res.status(400).json({ message: 'billingCycle is required' }).end();
        return;
      }
      const entityType: BillableEntityType = billableEntityType || req.user?.billableEntityType || 'user';
      const entityId: string = billableEntityId || (entityType === 'user' ? req.user?._id : req.user?.workspace);
      if (!entityId) {
        res.status(400).json({ message: 'Could not determine billable entity' }).end();
        return;
      }
      const pendingSub = await SubscriptionsService.createSubscription(tenant, {
        planId,
        billingCycle: billingCycle as BillingCycle,
        billableEntityType: entityType,
        billableEntityId: entityId,
        status: 'pending',
        dynamicAmount: amount,
      });
      resolvedSubscriptionId = pendingSub._id.toString();
    }

    if (resolvedSubscriptionId) {
      const result = await CheckoutService.initiateCheckout(tenant, {
        subscriptionId: resolvedSubscriptionId,
        couponCode,
        successUrl,
        cancelUrl,
      });
      res.status(200).json(result).end();
      return;
    }

    // Inline checkout path for static plans
    if (!billingCycle) {
      res.status(400).json({ message: 'billingCycle is required' }).end();
      return;
    }

    const entityType: BillableEntityType = billableEntityType || req.user?.billableEntityType || 'user';
    const entityId: string = billableEntityId || (entityType === 'user' ? req.user?._id : req.user?.workspace);
    if (!entityId) {
      res.status(400).json({ message: 'Could not determine billable entity' }).end();
      return;
    }

    const result = await CheckoutService.initiateCheckout(tenant, {
      planId,
      billingCycle: billingCycle as BillingCycle,
      billableEntityType: entityType,
      billableEntityId: entityId,
      couponCode,
      successUrl,
      cancelUrl,
    });

    res.status(200).json(result).end();
  } catch (e: any) {
    const statusMap: Record<string, number> = {
      PLAN_NOT_FOUND: 404,
      PLAN_NOT_ACTIVE: 400,
      AMOUNT_REQUIRED: 400,
      DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION: 400,
      DYNAMIC_AMOUNT_NOT_SET: 400,
      DYNAMIC_PLAN_UNSUPPORTED_PROVIDER: 400,
      SUBSCRIPTION_NOT_PENDING: 400,
      ACTIVE_SUBSCRIPTION_EXISTS: 409,
      PAYMENTS_NOT_CONFIGURED: 500,
      MISSING_EXTERNAL_PRICE_ID: 400,
      UNSUPPORTED_PROVIDER: 400,
      COUPON_NOT_FOUND: 400,
      COUPON_EXPIRED: 400,
      COUPON_NOT_YET_VALID: 400,
      COUPON_MAX_REDEMPTIONS: 400,
      COUPON_NOT_APPLICABLE: 400,
    };
    const status = statusMap[e?.code] || 500;
    res.status(status).json({ code: e?.code, message: e?.message || 'checkout failed' }).end();
  }
}

export async function cancelSubscription(req, res: Response) {
  try {
    const tenant = req.headers.tenant;
    const { subscriptionId } = req.params;

    if (!req.user?.isPrivileged) {
      const subscription = await SubscriptionsService.getSubscriptionById(tenant, subscriptionId);
      if (subscription.billableEntityId !== resolveUserEntityId(req)) {
        res.status(403).json({ message: 'access denied' }).end();
        return;
      }
    }

    const result = await CheckoutService.cancelCheckoutSubscription(tenant, subscriptionId);
    res.status(200).json(result).end();
  } catch (e: any) {
    const status = e?.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ code: e?.code, message: e?.message || 'cancellation failed' }).end();
  }
}
