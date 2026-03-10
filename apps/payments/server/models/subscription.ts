import mongoose, { Document } from 'mongoose';
import { BillableEntityType, SubscriptionStatus, BillingCycle } from '@qelos/global-types';

export interface SubscriptionDocument extends Document {
  tenant: string;
  planId: mongoose.Types.ObjectId;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  externalSubscriptionId: string;
  providerId: string;
  providerKind: string;
  couponId: mongoose.Types.ObjectId;
  metadata: Record<string, any>;
  created: Date;
}

const SubscriptionSchema = new mongoose.Schema<any, any>({
  tenant: {
    type: String,
    required: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
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
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing', 'expired'],
    default: 'active',
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true,
  },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  externalSubscriptionId: String,
  providerId: String,
  providerKind: String,
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

SubscriptionSchema.index({ tenant: 1, billableEntityType: 1, billableEntityId: 1 });
SubscriptionSchema.index({ tenant: 1, status: 1 });

const Subscription = mongoose.model('Subscription', SubscriptionSchema) as unknown as mongoose.Model<SubscriptionDocument>;
export default Subscription;
