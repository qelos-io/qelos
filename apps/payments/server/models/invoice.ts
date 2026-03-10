import mongoose, { Document } from 'mongoose';
import { BillableEntityType, InvoiceStatus } from '@qelos/global-types';

export interface InvoiceDocument extends Document {
  tenant: string;
  subscriptionId: mongoose.Types.ObjectId;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  externalInvoiceId: string;
  providerKind: string;
  invoiceUrl: string;
  paidAt: Date;
  periodStart: Date;
  periodEnd: Date;
  items: Array<{ description: string; amount: number; quantity: number }>;
  created: Date;
}

const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
}, { _id: false });

const InvoiceSchema = new mongoose.Schema<any, any>({
  tenant: {
    type: String,
    required: true,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  billableEntityType: {
    type: String,
    enum: ['user', 'workspace'],
    required: true,
  },
  billableEntityId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'failed', 'refunded'],
    default: 'pending',
  },
  externalInvoiceId: String,
  providerKind: String,
  invoiceUrl: String,
  paidAt: Date,
  periodStart: Date,
  periodEnd: Date,
  items: {
    type: [InvoiceItemSchema],
    default: () => [],
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

InvoiceSchema.index({ tenant: 1, billableEntityId: 1 });

const Invoice = mongoose.model('Invoice', InvoiceSchema) as unknown as mongoose.Model<InvoiceDocument>;
export default Invoice;
