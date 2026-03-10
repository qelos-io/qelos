import mongoose, { Document, Model } from 'mongoose';
import { IPlan } from '@qelos/global-types';

export interface PlanDocument extends Document {
  tenant: string;
  name: string;
  description: string;
  features: string[];
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  limits: Record<string, any>;
  externalIds: Record<string, any>;
  metadata: Record<string, any>;
  created: Date;
}

const PlanSchema = new mongoose.Schema<any, any>({
  tenant: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  features: {
    type: [String],
    default: () => [],
  },
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  yearlyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  limits: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
  },
  externalIds: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
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

PlanSchema.index({ tenant: 1, isActive: 1 });

const Plan = mongoose.model('Plan', PlanSchema) as unknown as mongoose.Model<PlanDocument>;
export default Plan;
