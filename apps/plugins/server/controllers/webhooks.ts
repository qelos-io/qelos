import { Response } from 'express';
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { triggerWebhookService } from '../services/webhook-service';
import logger from '../services/logger';

export async function triggerWebhook(req: RequestWithUser, res: Response) {
  try {
    const { status, body, headers } = await triggerWebhookService(
      req.headers.tenant as string,
      req.params.integrationId,
      {
        user: req.user,
        body: req.body,
        headers: req.headers,
        method: req.method,
        query: req.query
      }
    );
    
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value?.toString() || '');
    });
    
    res.status(status).json(body).end();
  } catch (error) {
    logger.error('Error triggering webhook', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Integration not found') {
      return res.status(404).json({ message: errorMessage }).end();
    }
    if (errorMessage.includes('Access denied')) {
      return res.status(403).json({ message: errorMessage }).end();
    }
    res.status(500).json({ message: 'Error triggering webhook' }).end();
  }
}
