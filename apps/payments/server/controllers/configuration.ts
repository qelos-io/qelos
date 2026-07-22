import { Response } from 'express';
import {
  getPaymentsConfigurationRecord,
  normalizePaymentsConfigurationMetadata,
  upsertPaymentsConfiguration,
} from '../services/payments-configuration-service.js';

const DEFAULT_METADATA = normalizePaymentsConfigurationMetadata({});

export async function getPaymentsConfiguration(req, res: Response) {
  try {
    const record = await getPaymentsConfigurationRecord(req.headers.tenant);
    res.status(200).json(record || {
      key: 'payments-configuration',
      metadata: DEFAULT_METADATA,
    }).end();
  } catch {
    res.status(500).json({ message: 'failed to load payments configuration' }).end();
  }
}

export async function updatePaymentsConfiguration(req, res: Response) {
  try {
    const record = await upsertPaymentsConfiguration(req.headers.tenant, req.body?.metadata || req.body || {});
    res.status(200).json(record).end();
  } catch (e: any) {
    const status = e?.code === 'INVALID_PAYMENTS_CONFIGURATION' ? 400 : 500;
    res.status(status).json({ code: e?.code, message: e?.message || 'failed to update payments configuration' }).end();
  }
}
