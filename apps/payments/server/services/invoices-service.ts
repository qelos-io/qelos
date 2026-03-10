import Invoice from '../models/invoice';
import { BillableEntityType, InvoiceStatus, IInvoiceItem } from '@qelos/global-types';

export async function listInvoices(
  tenant: string,
  filters: { billableEntityType?: BillableEntityType; billableEntityId?: string; status?: InvoiceStatus } = {}
) {
  const query: any = { tenant };
  if (filters.billableEntityType) query.billableEntityType = filters.billableEntityType;
  if (filters.billableEntityId) query.billableEntityId = filters.billableEntityId;
  if (filters.status) query.status = filters.status;
  return (Invoice as any).find(query).sort({ created: -1 }).lean().exec();
}

export async function getInvoiceById(tenant: string, invoiceId: string) {
  const invoice = await (Invoice as any).findOne({ _id: invoiceId, tenant }).lean().exec();
  if (!invoice) {
    throw { code: 'INVOICE_NOT_FOUND' };
  }
  return invoice;
}

export async function listByEntity(
  tenant: string,
  billableEntityType: BillableEntityType,
  billableEntityId: string
) {
  return (Invoice as any).find({ tenant, billableEntityType, billableEntityId })
    .sort({ created: -1 })
    .lean()
    .exec();
}

export async function createInvoice(tenant: string, data: {
  subscriptionId?: string;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  amount: number;
  currency?: string;
  status?: InvoiceStatus;
  externalInvoiceId?: string;
  providerKind?: string;
  invoiceUrl?: string;
  paidAt?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  items?: IInvoiceItem[];
}) {
  const invoice = new Invoice({
    tenant,
    subscriptionId: data.subscriptionId,
    billableEntityType: data.billableEntityType,
    billableEntityId: data.billableEntityId,
    amount: data.amount,
    currency: data.currency || 'USD',
    status: data.status || 'pending',
    externalInvoiceId: data.externalInvoiceId,
    providerKind: data.providerKind,
    invoiceUrl: data.invoiceUrl,
    paidAt: data.paidAt,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    items: data.items || [],
  });

  return invoice.save();
}

export async function updateInvoiceStatus(
  tenant: string,
  invoiceId: string,
  status: InvoiceStatus,
  updates: Record<string, any> = {}
) {
  const invoice = await (Invoice as any).findOneAndUpdate(
    { _id: invoiceId, tenant },
    { $set: { status, ...updates } },
    { new: true }
  ).lean().exec();

  if (!invoice) {
    throw { code: 'INVOICE_NOT_FOUND' };
  }

  return invoice;
}
