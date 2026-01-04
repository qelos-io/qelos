import { Request, Response } from 'express';
import { callIntegrationTarget } from '../services/integration-target-call';
import logger from '../services/logger';
import Integration, { IIntegrationEntity } from '../models/integration';

export async function triggerWebhook(req: Request, res: Response) {
  try {
    const integration = await Integration.findOne({ _id: req.params.integrationId, tenant: req.headers.tenant }).select('target').lean().exec();
    if (!integration || !integration.target) {
      return res.status(404).json({ message: 'Integration not found' });
    }
    const result = await callIntegrationTarget(req.headers.tenant as string, req.body, integration.target as IIntegrationEntity);
    res.json(result);
  } catch (error) {
    logger.error('Error triggering webhook', error);
    res.status(500).json({ message: 'Error triggering webhook' });
  }
}
