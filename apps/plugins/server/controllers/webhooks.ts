import { Request, Response } from 'express';
import { ResponseError } from '@qelos/api-kit';
import IntegrationSource from '../models/integration-source';
import { IntegrationSourceKind } from '@qelos/global-types';
import uniqid from 'uniqid';
import { IIntegrationEntity } from '../models/integration';
import { Types } from 'mongoose';
import { callIntegrationTarget } from '../services/integration-target-call';
import { getCacheManager } from '../services/cache-manager';

const WEBHOOK_CACHE_TTL = 60 * 60 * 24; // 24 hours

export async function createWebhook(req: Request, res: Response) {
  const { sourceId } = req.params;
  const source = await IntegrationSource.findById(sourceId).lean().exec();

  if (!source) {
    throw new ResponseError('Source not found', 404);
  }

  if (source.kind !== IntegrationSourceKind.Qelos) {
    throw new ResponseError('Unsupported source kind', 400);
  }

  const webhookId = uniqid();
  const cache = getCacheManager();
  await cache.set(`webhook:${webhookId}`, { sourceId, tenant: req.headers.tenant }, WEBHOOK_CACHE_TTL);

  const webhookUrl = `https://${req.headers.host}/api/webhooks/trigger/${webhookId}`;

  res.json({ webhookUrl });
}

export async function triggerWebhook(req: Request, res: Response) {
  const { webhookId } = req.params;
  const { payload, operation, details } = req.body;

  const cache = getCacheManager();
  const webhookData = await cache.get(`webhook:${webhookId}`);

  if (!webhookData) {
    throw new ResponseError('Webhook not found', 404);
  }

  const target: IIntegrationEntity = {
    source: new Types.ObjectId(webhookData.sourceId),
    operation,
    details,
  };

  await callIntegrationTarget(webhookData.tenant, payload, target);

  res.status(200).send();
}
