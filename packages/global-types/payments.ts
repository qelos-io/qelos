/** Determines whether billing is tied to individual users (B2C) or workspaces (B2B). */
export type BillableEntityType = 'user' | 'workspace';

/** Lifecycle states of a subscription. */
export type SubscriptionStatus = 'pending' | 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired';

/** Supported billing intervals. */
export type BillingCycle = 'monthly' | 'yearly';

/** Payment status of an invoice. */
export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';

/** Type of discount a coupon provides. */
export type CouponDiscountType = 'percentage' | 'fixed';

/**
 * Arbitrary limits associated with a plan (e.g. max users, storage quota).
 * Keys are limit names; values can be numbers, booleans, or strings.
 */
export interface IPlanLimits {
  [key: string]: number | boolean | string;
}

/**
 * Maps payment provider kinds to their external product/price identifiers.
 * Used to link internal plans to provider-specific entities.
 */
export interface IPlanExternalIds {
  [providerKind: string]: {
    productId?: string;
    monthlyPriceId?: string;
    yearlyPriceId?: string;
  };
}

/** A pricing plan that users or workspaces can subscribe to. */
export interface IPlan {
  _id?: string;
  /** Tenant identifier for multi-tenant isolation. */
  tenant: string;
  name: string;
  description?: string;
  /** Human-readable feature descriptions displayed on pricing pages. */
  features: string[];
  monthlyPrice: number;
  yearlyPrice: number;
  /** ISO 4217 currency code (e.g. "USD", "EUR"). */
  currency: string;
  isActive: boolean;
  /** Controls display order — lower numbers appear first. */
  sortOrder: number;
  limits?: IPlanLimits;
  externalIds?: IPlanExternalIds;
  metadata?: Record<string, any>;
  created?: Date;
}

/** A subscription linking a billable entity to a plan. */
export interface ISubscription {
  _id?: string;
  tenant: string;
  /** Reference to the subscribed plan. */
  planId: string;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  /** Provider-side subscription identifier for reconciliation. */
  externalSubscriptionId?: string;
  /** Integration source ID used for this subscription's provider calls. */
  providerId?: string;
  /** Payment provider kind (e.g. "paddle", "paypal", "sumit"). */
  providerKind?: string;
  couponId?: string;
  metadata?: Record<string, any>;
  created?: Date;
}

/** A single line item within an invoice. */
export interface IInvoiceItem {
  description: string;
  amount: number;
  quantity: number;
}

/** An invoice record for a payment event. */
export interface IInvoice {
  _id?: string;
  tenant: string;
  subscriptionId?: string;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  amount: number;
  /** ISO 4217 currency code. */
  currency: string;
  status: InvoiceStatus;
  /** Provider-side invoice identifier. */
  externalInvoiceId?: string;
  providerKind?: string;
  /** URL to download/view the invoice from the provider. */
  invoiceUrl?: string;
  paidAt?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  items: IInvoiceItem[];
  created?: Date;
}

/** A discount coupon that can be applied during checkout. */
export interface ICoupon {
  _id?: string;
  tenant: string;
  /** Unique coupon code entered by users. */
  code: string;
  discountType: CouponDiscountType;
  /** For percentage: 0–100. For fixed: absolute amount in the coupon's currency. */
  discountValue: number;
  /** ISO 4217 currency code — relevant for fixed-amount discounts. */
  currency?: string;
  /** `null` or `undefined` means unlimited redemptions. */
  maxRedemptions?: number;
  currentRedemptions: number;
  validFrom?: Date;
  validUntil?: Date;
  /** Empty array means the coupon applies to all plans. */
  applicablePlanIds: string[];
  isActive: boolean;
  created?: Date;
}
