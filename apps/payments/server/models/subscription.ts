import mongoose, { Document } from 'mongoose';
import { BillableEntityType, SubscriptionStatus, BillingCycle, ISubscriptionHistoryEntry } from '@qelos/global-types';

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
  /** When the active coupon's discounted/free benefit period ends; after this date, billing reverts to standard pricing. */
  couponBenefitEndsAt: Date;
  dynamicAmount: number;
  /** Most recent subscription changes, newest last (see services/subscription-activity.ts). */
  history: ISubscriptionHistoryEntry[];
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
    enum: ['pending', 'active', 'canceled', 'past_due', 'trialing', 'expired'],
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
  couponBenefitEndsAt: Date,
  dynamicAmount: {
    type: Number,
  },
  history: {
    type: [
      new mongoose.Schema(
        {
          type: { type: String, required: true },
          at: { type: Date, default: Date.now },
          from: String,
          to: String,
          couponCode: String,
        },
        { _id: false },
      ),
    ],
    default: () => [],
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
