import { QelosSDKOptions } from './types';
import BaseSDK from './base-sdk';
import { IPlan, ISubscription, IInvoice, ICoupon, BillingCycle } from '@qelos/global-types';

export interface CheckoutRequest {
  planId: string;
  billingCycle: BillingCycle;
  couponCode?: string;
  successUrl?: string;
  cancelUrl?: string;
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
