import { Request, Response } from 'express';
import { callIntegrationTarget } from '../services/integration-target-call';
import logger from '../services/logger';
import { IIntegrationEntity } from '../models/integration';

interface RequestWithIntegration extends Request {
    integration: IIntegrationEntity;
}

export async function triggerWebhook(req: RequestWithIntegration, res: Response) {
    try {
        const { integration } = req;
        const result = await callIntegrationTarget(integration.tenant, req.body, integration.target);
        res.json(result);
    } catch (error) {
        logger.error('Error triggering webhook', error);
        res.status(500).json({ message: 'Error triggering webhook' });
    }
}
