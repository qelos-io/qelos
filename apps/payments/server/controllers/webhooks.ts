import { Response } from 'express';
import * as WebhookService from '../services/webhook-service';

export async function handleWebhook(req, res: Response) {
  try {
    const { providerKind } = req.params;

    if (!providerKind) {
      res.status(400).json({ message: 'providerKind is required' }).end();
      return;
    }

    const result = await WebhookService.processWebhook(
      providerKind,
      req.headers,
      req.body,
    );

    res.status(200).json(result).end();
  } catch (e: any) {
    const statusMap: Record<string, number> = {
      UNSUPPORTED_PROVIDER: 400,
      INVALID_WEBHOOK: 400,
      INVALID_SIGNATURE: 401,
      TENANT_NOT_FOUND: 400,
    };
    const status = statusMap[e?.code] || 500;
    res.status(status).json({ code: e?.code, message: e?.message || 'webhook processing failed' }).end();
  }
}
