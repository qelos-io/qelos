import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import subscriptionsService from '@/services/apis/subscriptions-service';
import workspacesService from '@/services/apis/workspaces-service';
import { IPlan, ISubscription } from '@qelos/global-types';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';

export type SubscriptionWithPlan = Omit<ISubscription, 'planId'> & { planId: IPlan };

export interface WorkspaceSubscriptionRow {
  workspace: IWorkspace;
  subscription: SubscriptionWithPlan | null;
}

export const useWorkspaceSubscriptionsStore = defineStore('workspace-subscriptions', () => {
  const { result, loading, loaded, promise, error, retry } = useDispatcher<WorkspaceSubscriptionRow[]>(
    async () => {
      const [workspaces, subscriptions] = await Promise.all([
        workspacesService.getOne('all'),
        subscriptionsService.getWorkspaceSubscriptions(),
      ]) as [IWorkspace[], SubscriptionWithPlan[]];

      const subscriptionByWorkspaceId = new Map<string, SubscriptionWithPlan>();
      for (const subscription of subscriptions) {
        if (!subscriptionByWorkspaceId.has(subscription.billableEntityId)) {
          subscriptionByWorkspaceId.set(subscription.billableEntityId, subscription);
        }
      }

      return (workspaces || []).map((workspace) => ({
        workspace,
        subscription: subscriptionByWorkspaceId.get(workspace._id) || null,
      }));
    },
    []
  );

  return { rows: result, loading, loaded, promise, error, retry };
});
