import { Response } from 'express';
import * as CheckoutService from '../services/checkout-service';
import * as SubscriptionsService from '../services/subscriptions-service';
import { BillingCycle, BillableEntityType, CheckoutCustomer } from '@qelos/global-types';
import { emitCheckoutFailedEvent } from '../services/platform-events.js';

function resolveCheckoutCustomer(req): CheckoutCustomer | undefined {
  const explicit: CheckoutCustomer | undefined = req.body?.customer;
  const name = explicit?.name || req.user?.fullName || req.user?.name;
  const email = explicit?.email || req.user?.email;

  if (!name && !email && !explicit?.phone && !explicit?.address) {
    return undefined;
  }

  return {
    ...explicit,
    name,
    email,
  };
}

function resolveUserEntityId(req): string | undefined {
  return req.user?.workspace || req.user?._id;
}

function checkoutContext(req) {
  return { userId: req.user?._id };
}

function emitControllerCheckoutValidationFailed(req, code: string, message: string) {
  const error = { code, message };
  emitCheckoutFailedEvent({
    tenant: req.headers.tenant,
    userId: req.user?._id,
    operation: 'initiateCheckout',
    code,
    planId: req.body.planId,
    subscriptionId: req.body.subscriptionId,
    billableEntityType: req.body.billableEntityType,
    billableEntityId: req.body.billableEntityId,
    couponCode: req.body.couponCode,
    error,
  });
}

/** The billing account of a checkout: the one named in the request, else the caller's. */
function requestedBillableEntity(req): { type: BillableEntityType; id: string } {
  const type: BillableEntityType = req.body.billableEntityType || req.user?.billableEntityType || 'user';
  const id: string = req.body.billableEntityId || (type === 'user' ? req.user?._id : req.user?.workspace);
  return { type, id };
}

/** Whether the account is the caller's user or their active workspace. */
function isOwnAccount(req, type: unknown, id: unknown): boolean {
  // the user header carries the active workspace as an object
  const own = type === 'user' ? req.user?._id
    : type === 'workspace' ? req.user?.workspace?._id || req.user?.workspace
      : undefined;
  return !!own && id === own;
}

/**
 * A regular user may check out for their own accounts only, whether the account is named in the request or comes with
 * an existing subscription.
 */
async function mayCheckOut(req): Promise<boolean> {
  const { subscriptionId, billableEntityId } = req.body;
  if (subscriptionId) {
    if (typeof subscriptionId !== 'string') return false;
    const subscription = await SubscriptionsService.getSubscriptionById(req.headers.tenant, subscriptionId);
    return isOwnAccount(req, subscription.billableEntityType, subscription.billableEntityId);
  }
  const { type } = requestedBillableEntity(req);
  if (type !== 'user' && type !== 'workspace') return false;
  // without an id in the request, the account is derived from the caller
  return !billableEntityId || isOwnAccount(req, type, billableEntityId);
}

export async function initiateCheckout(req, res: Response) {
  try {
    const tenant = req.headers.tenant;
    const {
      subscriptionId,
      planId,
      billingCycle,
      couponCode,
      successUrl,
      cancelUrl,
      reset,
    } = req.body;

    const isPrivileged = req.user?.isPrivileged;
    const amount = isPrivileged ? req.body.amount : undefined;

    if (!subscriptionId && !planId) {
      emitControllerCheckoutValidationFailed(req, 'MISSING_CHECKOUT_TARGET', 'subscriptionId or planId is required');
      res.status(400).json({ message: 'subscriptionId or planId is required' }).end();
      return;
    }

    if (billingCycle && !['monthly', 'yearly'].includes(billingCycle)) {
      emitControllerCheckoutValidationFailed(req, 'INVALID_BILLING_CYCLE', 'billingCycle must be monthly or yearly');
      res.status(400).json({ message: 'billingCycle must be monthly or yearly' }).end();
      return;
    }

    if (!isPrivileged && !(await mayCheckOut(req))) {
      emitControllerCheckoutValidationFailed(req, 'ACCESS_DENIED', 'access denied');
      res.status(403).json({ message: 'access denied' }).end();
      return;
    }

    let resolvedSubscriptionId: string | undefined = subscriptionId;

    if (!resolvedSubscriptionId && isPrivileged && planId && amount) {
      // Admin convenience: create pending subscription with dynamicAmount, then checkout
      if (!billingCycle) {
        emitControllerCheckoutValidationFailed(req, 'MISSING_BILLING_CYCLE', 'billingCycle is required');
        res.status(400).json({ message: 'billingCycle is required' }).end();
        return;
      }
      const { type: entityType, id: entityId } = requestedBillableEntity(req);
      if (!entityId) {
        emitControllerCheckoutValidationFailed(req, 'MISSING_BILLABLE_ENTITY', 'Could not determine billable entity');
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

    const customer = resolveCheckoutCustomer(req);

    if (resolvedSubscriptionId) {
      const result = await CheckoutService.initiateCheckout(tenant, {
        subscriptionId: resolvedSubscriptionId,
        couponCode,
        successUrl,
        cancelUrl,
        reset: reset === true,
        customer,
      }, checkoutContext(req));
      res.status(200).json(result).end();
      return;
    }

    // Inline checkout path for static plans
    if (!billingCycle) {
      emitControllerCheckoutValidationFailed(req, 'MISSING_BILLING_CYCLE', 'billingCycle is required');
      res.status(400).json({ message: 'billingCycle is required' }).end();
      return;
    }

    const { type: entityType, id: entityId } = requestedBillableEntity(req);
    if (!entityId) {
      emitControllerCheckoutValidationFailed(req, 'MISSING_BILLABLE_ENTITY', 'Could not determine billable entity');
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
      reset: reset === true,
      customer,
    }, checkoutContext(req));

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
      PAYMENTS_CONFIG_ACCESS_DENIED: 500,
      PAYMENTS_CONFIG_LOAD_FAILED: 500,
      MISSING_EXTERNAL_PRICE_ID: 400,
      UNSUPPORTED_PROVIDER: 400,
      MISSING_REDIRECT_URLS: 400,
      INVALID_CHECKOUT_AMOUNT: 400,
      INVALID_SUMIT_COMPANY_ID: 400,
      MISSING_SUMIT_CREDENTIALS: 400,
      UNSUPPORTED_SUMIT_CURRENCY: 400,
      INTEGRATION_TARGET_FAILED: 502,
      INTEGRATION_SOURCE_NOT_FOUND: 404,
      COUPON_NOT_FOUND: 400,
      COUPON_EXPIRED: 400,
      COUPON_NOT_YET_VALID: 400,
      COUPON_MAX_REDEMPTIONS: 400,
      COUPON_NOT_APPLICABLE: 400,
    };
    const status = statusMap[e?.code] || 500;
    const body: Record<string, unknown> = { code: e?.code, message: e?.message || 'checkout failed' };
    if (e?.existingSubscriptionId) {
      body.existingSubscriptionId = e.existingSubscriptionId;
    }
    res.status(status).json(body).end();
  }
}

export async function cancelSubscription(req, res: Response) {
  try {
    const tenant = req.headers.tenant;
    const { subscriptionId } = req.params;

    if (!req.user?.isPrivileged) {
      const subscription = await SubscriptionsService.getSubscriptionById(tenant, subscriptionId);
      if (subscription.billableEntityId !== resolveUserEntityId(req)) {
        emitCheckoutFailedEvent({
          tenant,
          userId: req.user?._id,
          operation: 'cancelCheckoutSubscription',
          subscriptionId,
          code: 'ACCESS_DENIED',
          error: { code: 'ACCESS_DENIED', message: 'access denied' },
        });
        res.status(403).json({ message: 'access denied' }).end();
        return;
      }
    }

    const result = await CheckoutService.cancelCheckoutSubscription(tenant, subscriptionId, checkoutContext(req));
    res.status(200).json(result).end();
  } catch (e: any) {
    const status = e?.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ code: e?.code, message: e?.message || 'cancellation failed' }).end();
  }
}
