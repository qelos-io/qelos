import { Response } from 'express';
import * as InvoicesService from '../services/invoices-service';

function resolveUserEntityId(req): string | undefined {
  return req.user?.workspace || req.user?._id;
}

export async function getInvoices(req, res: Response) {
  try {
    const filters: any = {};
    if (req.query.billableEntityType) filters.billableEntityType = req.query.billableEntityType;
    if (req.query.billableEntityId) filters.billableEntityId = req.query.billableEntityId;
    if (req.query.status) filters.status = req.query.status;

    if (!req.user?.isPrivileged) {
      filters.billableEntityId = resolveUserEntityId(req);
    }

    const invoices = await InvoicesService.listInvoices(req.headers.tenant, filters);
    res.status(200).json(invoices).end();
  } catch (e) {
    res.status(500).json({ message: 'failed to load invoices' }).end();
  }
}

export async function getInvoice(req, res: Response) {
  try {
    const invoice = await InvoicesService.getInvoiceById(req.headers.tenant, req.params.id);

    if (!req.user?.isPrivileged && invoice.billableEntityId !== resolveUserEntityId(req)) {
      res.status(403).json({ message: 'access denied' }).end();
      return;
    }

    res.status(200).json(invoice).end();
  } catch (e: any) {
    const status = e?.code === 'INVOICE_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to load invoice' }).end();
  }
}
