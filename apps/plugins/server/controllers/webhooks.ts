import { Request, Response } from 'express';
import { callIntegrationTarget } from '../services/integration-target-call';
import logger from '../services/logger';

export async function triggerWebhook(req: Request, res: Response) {
    try {
        const { integration } = req as any;
        const result = await callIntegrationTarget(integration.tenant, req.body, integration.target);
        res.json(result);
    } catch (error) {
        logger.error('Error triggering webhook', error);
        res.status(500).json({ message: 'Error triggering webhook' });
    }
}
