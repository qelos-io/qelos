import { Response } from 'express';
import * as SubscriptionsService from '../services/subscriptions-service';

function resolveUserEntityId(req): string | undefined {
  return req.user?.workspace || req.user?._id;
}

export async function getSubscriptions(req, res: Response) {
  try {
    const filters: any = {};
    if (req.query.billableEntityType) filters.billableEntityType = req.query.billableEntityType;
    if (req.query.billableEntityId) filters.billableEntityId = req.query.billableEntityId;
    if (req.query.status) filters.status = req.query.status;

    if (!req.user?.isPrivileged) {
      filters.billableEntityId = resolveUserEntityId(req);
    }

    const subscriptions = await SubscriptionsService.listSubscriptions(req.headers.tenant, filters);
    res.status(200).json(subscriptions).end();
  } catch (e) {
    res.status(500).json({ message: 'failed to load subscriptions' }).end();
  }
}

export async function getSubscription(req, res: Response) {
  try {
    const subscription = await SubscriptionsService.getSubscriptionById(req.headers.tenant, req.params.id);

    if (!req.user?.isPrivileged && subscription.billableEntityId !== resolveUserEntityId(req)) {
      res.status(403).json({ message: 'access denied' }).end();
      return;
    }

    res.status(200).json(subscription).end();
  } catch (e: any) {
    const status = e?.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to load subscription' }).end();
  }
}

export async function getMySubscription(req, res: Response) {
  try {
    const entityId = resolveUserEntityId(req);
    const entityType = req.user?.workspace ? 'workspace' : 'user';
    const subscription = await SubscriptionsService.getActiveSubscription(
      req.headers.tenant, entityType, entityId,
    );
    res.status(200).json(subscription).end();
  } catch (e) {
    res.status(500).json({ message: 'failed to load subscription' }).end();
  }
}

export async function createSubscription(req, res: Response) {
  try {
    let data: any;

    if (req.user?.isPrivileged) {
      data = req.body;
    } else {
      const { planId, billingCycle, couponCode } = req.body;
      if (!planId || !billingCycle) {
        res.status(400).json({ message: 'planId and billingCycle are required' }).end();
        return;
      }
      const entityType = req.user?.workspace ? 'workspace' : 'user';
      const entityId = resolveUserEntityId(req);
      if (!entityId) {
        res.status(400).json({ message: 'Could not determine billable entity' }).end();
        return;
      }
      data = { planId, billingCycle, couponCode, billableEntityType: entityType, billableEntityId: entityId, status: 'pending' };
    }

    const subscription = await SubscriptionsService.createSubscription(req.headers.tenant, data);
    res.status(200).json(subscription).end();
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'failed to create subscription' }).end();
  }
}

export async function setDynamicAmount(req, res: Response) {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ message: 'amount must be a positive number' }).end();
      return;
    }
    const subscription = await SubscriptionsService.setDynamicAmount(req.headers.tenant, req.params.id, amount);
    res.status(200).json(subscription).end();
  } catch (e: any) {
    const status = e?.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 : e?.code === 'INVALID_AMOUNT' ? 400 : 500;
    res.status(status).json({ code: e?.code, message: e?.message || 'failed to set dynamic amount' }).end();
  }
}

export async function cancelSubscription(req, res: Response) {
  try {
    const subscription = await SubscriptionsService.getSubscriptionById(req.headers.tenant, req.params.id);

    if (!req.user?.isPrivileged && subscription.billableEntityId !== resolveUserEntityId(req)) {
      res.status(403).json({ message: 'access denied' }).end();
      return;
    }

    const result = await SubscriptionsService.cancelSubscription(req.headers.tenant, req.params.id);
    res.status(200).json(result).end();
  } catch (e: any) {
    const status = e?.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to cancel subscription' }).end();
  }
}
