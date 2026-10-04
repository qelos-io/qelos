import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import subscriptionsService from '@/services/apis/subscriptions-service';
import usersService from '@/services/apis/users-service';
import { ISubscription } from '@qelos/global-types';
import { IUser } from '@/modules/core/store/types/user';

export interface UserSubscriptionRow {
  user: IUser;
  subscription: ISubscription;
}

const USERS_CHUNK_SIZE = 100;

export function getUserDisplayName(user: IUser): string {
  if (user.fullName) return user.fullName;
  const name = `${decodeURIComponent(user.firstName ?? '')} ${decodeURIComponent(user.lastName ?? '')}`.trim();
  return name || user.username || user.email || '';
}

/** Users that currently have a subscription (canceled and expired ones no longer attach a user to a plan). */
export const useUserSubscriptionsStore = defineStore('user-subscriptions', () => {
  const { result, loading, loaded, promise, error, retry } = useDispatcher<UserSubscriptionRow[]>(
    async () => {
      const subscriptions = await subscriptionsService.list({ billableEntityType: 'user' });

      // newest first, so the first subscription seen for a user is their current one
      const subscriptionByUserId = new Map<string, ISubscription>();
      for (const subscription of subscriptions) {
        if (['canceled', 'expired'].includes(subscription.status)) continue;
        if (!subscriptionByUserId.has(subscription.billableEntityId)) {
          subscriptionByUserId.set(subscription.billableEntityId, subscription);
        }
      }

      const userIds = [...subscriptionByUserId.keys()];
      const chunks: string[][] = [];
      for (let i = 0; i < userIds.length; i += USERS_CHUNK_SIZE) {
        chunks.push(userIds.slice(i, i + USERS_CHUNK_SIZE));
      }
      const users = (await Promise.all(chunks.map((chunk) => usersService.getAll({ _id: chunk.join(',') })))).flat();

      return users.map((user) => ({ user, subscription: subscriptionByUserId.get(user._id)! }));
    },
    [],
    true
  );

  // lazy: workspace-mode tenants never need the per-user data
  let started = false;
  function load() {
    if (!started) {
      started = true;
      retry();
    }
  }

  const saving = ref(false);

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

  return { rows: result, loading, loaded, promise, error, retry, load, saving, setCoupon };
});
