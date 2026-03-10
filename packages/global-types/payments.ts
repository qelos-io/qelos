export type BillableEntityType = 'user' | 'workspace';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired';
export type BillingCycle = 'monthly' | 'yearly';
export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type CouponDiscountType = 'percentage' | 'fixed';

export interface IPlanLimits {
  [key: string]: number | boolean | string;
}

export interface IPlanExternalIds {
  [providerKind: string]: {
    productId?: string;
    monthlyPriceId?: string;
    yearlyPriceId?: string;
  };
}

export interface IPlan {
  _id?: string;
  tenant: string;
  name: string;
  description?: string;
  features: string[];
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  limits?: IPlanLimits;
  externalIds?: IPlanExternalIds;
  metadata?: Record<string, any>;
  created?: Date;
}

export interface ISubscription {
  _id?: string;
  tenant: string;
  planId: string;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  externalSubscriptionId?: string;
  providerId?: string;
  providerKind?: string;
  couponId?: string;
  metadata?: Record<string, any>;
  created?: Date;
}

export interface IInvoiceItem {
  description: string;
  amount: number;
  quantity: number;
}

export interface IInvoice {
  _id?: string;
  tenant: string;
  subscriptionId?: string;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  externalInvoiceId?: string;
  providerKind?: string;
  invoiceUrl?: string;
  paidAt?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  items: IInvoiceItem[];
  created?: Date;
}

export interface ICoupon {
  _id?: string;
  tenant: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  currency?: string;
  maxRedemptions?: number;
  currentRedemptions: number;
  validFrom?: Date;
  validUntil?: Date;
  applicablePlanIds: string[];
  isActive: boolean;
  created?: Date;
}
