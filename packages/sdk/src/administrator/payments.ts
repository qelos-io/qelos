import { QelosSDKOptions } from '../types';
import BaseSDK from '../base-sdk';
import {
  IPlan, ISubscription, IInvoice, ICoupon,
  BillableEntityType, SubscriptionStatus, InvoiceStatus, BillingCycle,
} from '@qelos/global-types';

export interface AdminCheckoutRequest {
  planId: string;
  billingCycle: BillingCycle;
  /** When omitted, the authenticated user / default billable entity is used (same as public checkout). */
  billableEntityType?: BillableEntityType;
  billableEntityId?: string;
  couponCode?: string;
  successUrl?: string;
  cancelUrl?: string;
  /**
   * Admin-only. For plans with `dynamic: true`, sets the `dynamicAmount` on the
   * pending subscription before initiating checkout. Regular users cannot set this;
   * use `setSubscriptionDynamicAmount()` + a separate `checkout()` call instead.
   */
  amount?: number;
}

export interface CreateSubscriptionData {
  planId: string;
  billingCycle: BillingCycle;
  billableEntityType: BillableEntityType;
  billableEntityId: string;
  /** Required for plans with `dynamic: true` before checkout can be initiated. */
  dynamicAmount?: number;
  couponCode?: string;
}

export interface AdminCheckoutResponse {
  subscriptionId: string;
  checkoutUrl?: string;
  clientToken?: string;
}

export default class QlPaymentsAdmin extends BaseSDK {
  constructor(private options: QelosSDKOptions) {
    super(options);
  }

  // --- Plans ---

  getPlans(query?: { isActive?: boolean }) {
    const qs = query ? `?${new URLSearchParams(query as any)}` : '';
    return this.callJsonApi<IPlan[]>(`/api/plans${qs}`);
  }

  getPlan(planId: string) {
    return this.callJsonApi<IPlan>(`/api/plans/${planId}`);
  }

  createPlan(data: Omit<IPlan, '_id' | 'tenant' | 'created'>) {
    return this.callJsonApi<IPlan>('/api/plans', {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  updatePlan(planId: string, data: Partial<IPlan>) {
    return this.callJsonApi<IPlan>(`/api/plans/${planId}`, {
      method: 'put',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  deletePlan(planId: string) {
    return this.callJsonApi<IPlan>(`/api/plans/${planId}`, { method: 'delete' });
  }

  /**
   * Start subscription checkout (same as `sdk.payments.checkout`, plus optional billable-entity overrides for admins).
   * For plans with `dynamic: true`, `amount` is required.
   */
  checkout(params: AdminCheckoutRequest) {
    return this.callJsonApi<AdminCheckoutResponse>('/api/checkout', {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    });
  }

  // --- Subscriptions ---

  getSubscriptions(query?: {
    billableEntityType?: BillableEntityType;
    billableEntityId?: string;
    status?: SubscriptionStatus;
  }) {
    const qs = query ? `?${new URLSearchParams(query as any)}` : '';
    return this.callJsonApi<ISubscription[]>(`/api/subscriptions${qs}`);
  }

  getSubscription(subscriptionId: string) {
    return this.callJsonApi<ISubscription>(`/api/subscriptions/${subscriptionId}`);
  }

  /**
   * Creates a pending subscription on behalf of any billable entity. Admins can
   * also set `dynamicAmount` here for dynamic plans, making the subscription
   * immediately ready for checkout.
   */
  createSubscription(data: CreateSubscriptionData) {
    return this.callJsonApi<ISubscription>('/api/subscriptions', {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  cancelSubscription(subscriptionId: string) {
    return this.callJsonApi<ISubscription>(
      `/api/subscriptions/${subscriptionId}/cancel`,
      { method: 'put' },
    );
  }

  /**
   * Sets or updates the dynamic amount for a pending subscription. Only admins
   * can call this. Must be done before a user can complete checkout on a dynamic plan.
   */
  setSubscriptionDynamicAmount(subscriptionId: string, amount: number) {
    return this.callJsonApi<ISubscription>(
      `/api/subscriptions/${subscriptionId}/dynamic-amount`,
      {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount }),
      },
    );
  }

  // --- Invoices ---

  getInvoices(query?: {
    billableEntityType?: BillableEntityType;
    billableEntityId?: string;
    status?: InvoiceStatus;
  }) {
    const qs = query ? `?${new URLSearchParams(query as any)}` : '';
    return this.callJsonApi<IInvoice[]>(`/api/invoices${qs}`);
  }

  getInvoice(invoiceId: string) {
    return this.callJsonApi<IInvoice>(`/api/invoices/${invoiceId}`);
  }

  // --- Coupons ---

  getCoupons(query?: { isActive?: boolean }) {
    const qs = query ? `?${new URLSearchParams(query as any)}` : '';
    return this.callJsonApi<ICoupon[]>(`/api/coupons${qs}`);
  }

  getCoupon(couponId: string) {
    return this.callJsonApi<ICoupon>(`/api/coupons/${couponId}`);
  }

  createCoupon(data: Omit<ICoupon, '_id' | 'tenant' | 'created' | 'currentRedemptions'>) {
    return this.callJsonApi<ICoupon>('/api/coupons', {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  updateCoupon(couponId: string, data: Partial<ICoupon>) {
    return this.callJsonApi<ICoupon>(`/api/coupons/${couponId}`, {
      method: 'put',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  deleteCoupon(couponId: string) {
    return this.callJsonApi<ICoupon>(`/api/coupons/${couponId}`, { method: 'delete' });
  }
}
