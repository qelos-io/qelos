import { QelosSDKOptions } from '../types';
import BaseSDK from '../base-sdk';
import {
  IPlan, ISubscription, IInvoice, ICoupon,
  BillableEntityType, SubscriptionStatus, InvoiceStatus,
} from '@qelos/global-types';

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

  cancelSubscription(subscriptionId: string) {
    return this.callJsonApi<ISubscription>(
      `/api/subscriptions/${subscriptionId}/cancel`,
      { method: 'put' },
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
