import { Request, Response } from 'express';
import { ResponseError } from '@qelos/api-kit';
import { cacheManager } from '../services/cache-manager';
import Integration from '../models/integration';
import { callIntegrationTarget } from '../services/integration-target-call';

export async function triggerWebhook(req: Request, res: Response) {
    const { webhookId } = req.params;
    const webhookData = await cacheManager.getItem(`webhook:${webhookId}`);

    if (!webhookData) {
        throw new ResponseError('Webhook not found', 404);
    }

    const integration = await Integration.findById(webhookData.integrationId).lean().exec();

    if (!integration) {
        throw new ResponseError('Integration not found', 404);
    }

    await callIntegrationTarget(webhookData.tenant, req.body, integration.target);

    res.status(200).send();
}
