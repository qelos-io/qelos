import { api, getCallData } from './api'
import { IPlan, ISubscription, IInvoice, ICoupon, BillableEntityType, BillingCycle } from '@qelos/global-types'

export interface CheckoutRequest {
  planId: string
  billingCycle: BillingCycle
  billableEntityType: BillableEntityType
  billableEntityId: string
  couponCode?: string
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutResponse {
  checkoutUrl?: string
  clientToken?: string
  providerKind: string
  subscriptionId?: string
}

const billingService = {
  getPublicPlans(): Promise<IPlan[]> {
    return api.get('/api/plans/public').then(getCallData)
  },

  getSubscriptions(params: { billableEntityType: BillableEntityType; billableEntityId: string }): Promise<ISubscription[]> {
    return api.get('/api/subscriptions', { params }).then(getCallData)
  },

  getActiveSubscription(billableEntityType: BillableEntityType, billableEntityId: string): Promise<ISubscription | null> {
    return api.get('/api/subscriptions', {
      params: { billableEntityType, billableEntityId, status: 'active' }
    }).then(getCallData).then((subs: ISubscription[]) => subs?.[0] || null)
  },

  getInvoices(params: { billableEntityType: BillableEntityType; billableEntityId: string }): Promise<IInvoice[]> {
    return api.get('/api/invoices', { params }).then(getCallData)
  },

  initiateCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
    return api.post('/api/checkout', data).then(getCallData)
  },

  cancelSubscription(subscriptionId: string): Promise<ISubscription> {
    return api.put(`/api/checkout/${subscriptionId}/cancel`).then(getCallData)
  },

  validateCoupon(code: string, planId?: string): Promise<ICoupon> {
    return api.post('/api/coupons/validate', { code, planId }).then(getCallData)
  },
}

export default billingService
