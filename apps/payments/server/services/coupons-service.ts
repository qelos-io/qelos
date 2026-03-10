import Coupon from '../models/coupon';
import { CouponDiscountType } from '@qelos/global-types';

export async function listCoupons(tenant: string, filters: { isActive?: boolean } = {}) {
  const query: any = { tenant };
  if (typeof filters.isActive === 'boolean') {
    query.isActive = filters.isActive;
  }
  return (Coupon as any).find(query).sort({ created: -1 }).lean().exec();
}

export async function getCouponById(tenant: string, couponId: string) {
  const coupon = await (Coupon as any).findOne({ _id: couponId, tenant }).lean().exec();
  if (!coupon) {
    throw { code: 'COUPON_NOT_FOUND' };
  }
  return coupon;
}

export async function createCoupon(tenant: string, data: {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  currency?: string;
  maxRedemptions?: number;
  validFrom?: Date;
  validUntil?: Date;
  applicablePlanIds?: string[];
  isActive?: boolean;
}) {
  if (!data.code || !data.discountType || data.discountValue == null) {
    throw { code: 'INVALID_COUPON_DATA', message: 'code, discountType, and discountValue are required' };
  }

  if (data.discountType === 'percentage' && (data.discountValue < 0 || data.discountValue > 100)) {
    throw { code: 'INVALID_COUPON_DATA', message: 'percentage discount must be between 0 and 100' };
  }

  const existing = await (Coupon as any).findOne({ tenant, code: data.code }).lean().exec();
  if (existing) {
    throw { code: 'COUPON_CODE_EXISTS', message: 'a coupon with this code already exists' };
  }

  const coupon = new Coupon({
    tenant,
    code: data.code,
    discountType: data.discountType,
    discountValue: data.discountValue,
    currency: data.currency || 'USD',
    maxRedemptions: data.maxRedemptions || null,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
    applicablePlanIds: data.applicablePlanIds || [],
    isActive: data.isActive !== false,
  });

  return coupon.save();
}

export async function updateCoupon(tenant: string, couponId: string, data: Record<string, any>) {
  const updates: Record<string, any> = {};
  const allowedFields = [
    'code', 'discountType', 'discountValue', 'currency',
    'maxRedemptions', 'validFrom', 'validUntil', 'applicablePlanIds', 'isActive'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  const coupon = await (Coupon as any).findOneAndUpdate(
    { _id: couponId, tenant },
    { $set: updates },
    { new: true }
  ).lean().exec();

  if (!coupon) {
    throw { code: 'COUPON_NOT_FOUND' };
  }

  return coupon;
}

export async function deactivateCoupon(tenant: string, couponId: string) {
  const coupon = await (Coupon as any).findOneAndUpdate(
    { _id: couponId, tenant },
    { $set: { isActive: false } },
    { new: true }
  ).lean().exec();

  if (!coupon) {
    throw { code: 'COUPON_NOT_FOUND' };
  }

  return coupon;
}

export async function validateCoupon(tenant: string, code: string, planId?: string) {
  const coupon = await (Coupon as any).findOne({ tenant, code, isActive: true }).lean().exec();

  if (!coupon) {
    throw { code: 'COUPON_NOT_FOUND', message: 'coupon not found or inactive' };
  }

  const now = new Date();

  if (coupon.validFrom && now < new Date(coupon.validFrom)) {
    throw { code: 'COUPON_NOT_YET_VALID', message: 'coupon is not yet valid' };
  }

  if (coupon.validUntil && now > new Date(coupon.validUntil)) {
    throw { code: 'COUPON_EXPIRED', message: 'coupon has expired' };
  }

  if (coupon.maxRedemptions != null && coupon.currentRedemptions >= coupon.maxRedemptions) {
    throw { code: 'COUPON_MAX_REDEMPTIONS', message: 'coupon has reached maximum redemptions' };
  }

  if (planId && coupon.applicablePlanIds.length > 0) {
    const applicable = coupon.applicablePlanIds.some(id => id.toString() === planId);
    if (!applicable) {
      throw { code: 'COUPON_NOT_APPLICABLE', message: 'coupon is not applicable to this plan' };
    }
  }

  return coupon;
}

export async function redeemCoupon(tenant: string, couponId: string) {
  const coupon = await (Coupon as any).findOneAndUpdate(
    { _id: couponId, tenant, isActive: true },
    { $inc: { currentRedemptions: 1 } },
    { new: true }
  ).lean().exec();

  if (!coupon) {
    throw { code: 'COUPON_NOT_FOUND' };
  }

  return coupon;
}
