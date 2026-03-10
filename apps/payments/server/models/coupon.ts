import mongoose, { Document } from 'mongoose';
import { CouponDiscountType } from '@qelos/global-types';

export interface CouponDocument extends Document {
  tenant: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  currency: string;
  maxRedemptions: number;
  currentRedemptions: number;
  validFrom: Date;
  validUntil: Date;
  applicablePlanIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  created: Date;
}

const CouponSchema = new mongoose.Schema<any, any>({
  tenant: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  maxRedemptions: {
    type: Number,
    default: null,
  },
  currentRedemptions: {
    type: Number,
    default: 0,
  },
  validFrom: Date,
  validUntil: Date,
  applicablePlanIds: {
    type: [mongoose.Schema.Types.ObjectId],
    default: () => [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

CouponSchema.index({ tenant: 1, code: 1 }, { unique: true });

const Coupon = mongoose.model('Coupon', CouponSchema) as unknown as mongoose.Model<CouponDocument>;
export default Coupon;
