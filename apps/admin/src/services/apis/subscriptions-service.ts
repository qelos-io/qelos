import { api, getCallData } from './api'

const subscriptionsService = {
  getWorkspaceSubscriptions(params?: { billableEntityId?: string; planId?: string; status?: string }): Promise<any[]> {
    return api.get('/api/subscriptions/workspaces', { params }).then(getCallData)
  },
}

export default subscriptionsService
