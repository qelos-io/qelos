import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import subscriptionsService from '@/services/apis/subscriptions-service';
import workspacesService from '@/services/apis/workspaces-service';
import { BillingCycle, ICoupon, IPlan, ISubscription } from '@qelos/global-types';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';

export type SubscriptionWithPlan = Omit<ISubscription, 'planId' | 'couponId'> & {
  planId: IPlan;
  /** Populated by the workspace subscriptions endpoint. */
  couponId?: Pick<ICoupon, '_id' | 'code' | 'discountType' | 'discountValue' | 'currency'>;
};

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

  const saving = ref(false);

  async function attachToPlan(workspaceId: string, planId: string, billingCycle: BillingCycle) {
    saving.value = true;
    try {
      const created = await subscriptionsService.create({
        planId,
        billingCycle,
        billableEntityType: 'workspace',
        billableEntityId: workspaceId,
        status: 'active',
      });
      await retry();
      return created;
    } finally {
      saving.value = false;
    }
  }

  async function changePlan(workspaceId: string, currentSubscriptionId: string | undefined, planId: string, billingCycle: BillingCycle) {
    saving.value = true;
    try {
      if (currentSubscriptionId) {
        await subscriptionsService.cancel(currentSubscriptionId);
      }
      const created = await subscriptionsService.create({
        planId,
        billingCycle,
        billableEntityType: 'workspace',
        billableEntityId: workspaceId,
        status: 'active',
      });
      await retry();
      return created;
    } finally {
      saving.value = false;
    }
  }

  async function detach(subscriptionId: string) {
    saving.value = true;
    try {
      await subscriptionsService.cancel(subscriptionId);
      await retry();
    } finally {
      saving.value = false;
    }
  }

  async function setCoupon(subscriptionId: string, couponCode: string | null) {
    saving.value = true;
    try {
      const updated = await subscriptionsService.setCoupon(subscriptionId, couponCode);
      await retry();
      return updated;
    } finally {
      saving.value = false;
    }
  }

  return { rows: result, loading, loaded, promise, error, retry, saving, attachToPlan, changePlan, detach, setCoupon };
});
