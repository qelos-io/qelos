import { Request, Response } from 'express';
import { ResponseError } from '@qelos/api-kit';
import Integration from '../models/integration';
import { callIntegrationTarget } from '../services/integration-target-call';

export async function triggerWebhook(req: Request, res: Response) {
    const { integrationId } = req.params;

    const integration = await Integration.findById(integrationId).lean().exec();

    if (!integration) {
        throw new ResponseError('Integration not found', 404);
    }

    const result = await callIntegrationTarget(integration.tenant, req.body, integration.target);

    res.json(result);
}
