import { QelosSDKOptions } from './types';
import BaseSDK from './base-sdk';
import { IPlan, ISubscription, IInvoice, ICoupon, BillingCycle } from '@qelos/global-types';

export interface CheckoutRequest {
  /** Required when not providing `subscriptionId`. Must be a non-dynamic plan. */
  planId?: string;
  /** Required when not providing `subscriptionId`. */
  billingCycle?: BillingCycle;
  couponCode?: string;
  successUrl?: string;
  cancelUrl?: string;
  /**
   * Pre-created subscription ID. Required for dynamic plans — the admin must set
   * `dynamicAmount` on the subscription before this checkout call will succeed.
   * When provided, `planId` and `billingCycle` are ignored.
   */
  subscriptionId?: string;
}

export interface CheckoutResponse {
  subscriptionId: string;
  checkoutUrl?: string;
  clientToken?: string;
}

export interface ValidateCouponResponse extends ICoupon {}

export default class QlPayments extends BaseSDK {
  private relativePath = '/api';

  constructor(options: QelosSDKOptions) {
    super(options);
  }

  getPlans(query?: { isActive?: boolean }) {
    const qs = query ? `?${new URLSearchParams(query as any)}` : '';
    return this.callJsonApi<IPlan[]>(`${this.relativePath}/plans/public${qs}`);
  }

  getPlan(planId: string) {
    return this.callJsonApi<IPlan>(`${this.relativePath}/plans/${planId}`);
  }

  /**
   * Creates a pending subscription for the authenticated user without initiating
   * payment. Use this as the first step for any plan, and the only step before
   * `checkout()` for dynamic plans (the admin must call `setSubscriptionDynamicAmount`
   * before the user can complete checkout).
   */
  subscribeToPlan(planId: string, billingCycle: BillingCycle, couponCode?: string) {
    return this.callJsonApi<ISubscription>(
      `${this.relativePath}/subscriptions`,
      {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle, couponCode }),
      },
    );
  }

  /**
   * Initiates a provider checkout session.
   *
   * **Static plans**: pass `planId` + `billingCycle` (a subscription is created
   * inline).
   *
   * **Dynamic plans**: the user must first call `subscribeToPlan()` to create a
   * pending subscription, then an admin must set the dynamic amount via
   * `setSubscriptionDynamicAmount()`. Only then should this method be called with
   * `subscriptionId` pointing to that pending subscription.
   */
  checkout(params: CheckoutRequest) {
    return this.callJsonApi<CheckoutResponse>(
      `${this.relativePath}/checkout`,
      {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      },
    );
  }

  getMySubscription() {
    return this.callJsonApi<ISubscription>(`${this.relativePath}/subscriptions/me`);
  }

  cancelSubscription(subscriptionId: string) {
    return this.callJsonApi<ISubscription>(
      `${this.relativePath}/subscriptions/${subscriptionId}/cancel`,
      { method: 'put' },
    );
  }

  getInvoices(query?: { status?: string }) {
    const qs = query ? `?${new URLSearchParams(query as any)}` : '';
    return this.callJsonApi<IInvoice[]>(`${this.relativePath}/invoices${qs}`);
  }

  getInvoice(invoiceId: string) {
    return this.callJsonApi<IInvoice>(`${this.relativePath}/invoices/${invoiceId}`);
  }

  validateCoupon(code: string, planId?: string) {
    return this.callJsonApi<ValidateCouponResponse>(
      `${this.relativePath}/coupons/validate`,
      {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, planId }),
      },
    );
  }
}
