import { api, getCallData } from './api'
import { BillableEntityType, BillingCycle, ISubscription, SubscriptionStatus } from '@qelos/global-types'

const subscriptionsService = {
  getWorkspaceSubscriptions(params?: { billableEntityId?: string; planId?: string; status?: string }): Promise<any[]> {
    return api.get('/api/subscriptions/workspaces', { params }).then(getCallData)
  },
  create(data: {
    planId: string;
    billingCycle: BillingCycle;
    billableEntityType: BillableEntityType;
    billableEntityId: string;
    status?: SubscriptionStatus;
    couponCode?: string;
  }): Promise<ISubscription> {
    return api.post('/api/subscriptions', data).then(getCallData)
  },
  cancel(id: string): Promise<ISubscription> {
    return api.put(`/api/subscriptions/${id}/cancel`).then(getCallData)
  },
}

export default subscriptionsService
