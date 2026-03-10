import { Response } from 'express';
import * as CheckoutService from '../services/checkout-service';
import { BillingCycle, BillableEntityType } from '@qelos/global-types';

export async function initiateCheckout(req, res: Response) {
  try {
    const tenant = req.headers.tenant;
    const {
      planId,
      billingCycle,
      billableEntityType,
      billableEntityId,
      couponCode,
      successUrl,
      cancelUrl,
    } = req.body;

    if (!planId || !billingCycle) {
      res.status(400).json({ message: 'planId and billingCycle are required' }).end();
      return;
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      res.status(400).json({ message: 'billingCycle must be monthly or yearly' }).end();
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

    const result = await CheckoutService.cancelCheckoutSubscription(tenant, subscriptionId);
    res.status(200).json(result).end();
  } catch (e: any) {
    const status = e?.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ code: e?.code, message: e?.message || 'cancellation failed' }).end();
  }
}
