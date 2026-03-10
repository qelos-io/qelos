import { Response } from 'express';
import * as SubscriptionsService from '../services/subscriptions-service';

export async function getSubscriptions(req, res: Response) {
  try {
    const filters: any = {};
    if (req.query.billableEntityType) filters.billableEntityType = req.query.billableEntityType;
    if (req.query.billableEntityId) filters.billableEntityId = req.query.billableEntityId;
    if (req.query.status) filters.status = req.query.status;
    const subscriptions = await SubscriptionsService.listSubscriptions(req.headers.tenant, filters);
    res.status(200).json(subscriptions).end();
  } catch (e) {
    res.status(500).json({ message: 'failed to load subscriptions' }).end();
  }
}

export async function getSubscription(req, res: Response) {
  try {
    const subscription = await SubscriptionsService.getSubscriptionById(req.headers.tenant, req.params.id);
    res.status(200).json(subscription).end();
  } catch (e: any) {
    const status = e?.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to load subscription' }).end();
  }
}

export async function createSubscription(req, res: Response) {
  try {
    const subscription = await SubscriptionsService.createSubscription(req.headers.tenant, req.body);
    res.status(200).json(subscription).end();
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'failed to create subscription' }).end();
  }
}

export async function cancelSubscription(req, res: Response) {
  try {
    const subscription = await SubscriptionsService.cancelSubscription(req.headers.tenant, req.params.id);
    res.status(200).json(subscription).end();
  } catch (e: any) {
    const status = e?.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to cancel subscription' }).end();
  }
}
