import { computed, ref, Ref, watch } from 'vue';
import type { BillableEntityType, ISubscription } from '@qelos/global-types';
import subscriptionsService from '@/services/apis/subscriptions-service';
import { isLiveSubscription } from '../services/pricing';

/** All subscriptions of one workspace / user (newest first) and the one currently attaching it to a plan. */
export function useEntitySubscriptions(billableEntityType: BillableEntityType, billableEntityId: Ref<string>) {
  const subscriptions = ref<ISubscription[]>([]);
  const loading = ref(true);
  const error = ref<unknown>(null);

  const current = computed(() => subscriptions.value.find(isLiveSubscription) || null);

  async function reload() {
    loading.value = true;
    error.value = null;
    try {
      subscriptions.value = await subscriptionsService.list({
        billableEntityType,
        billableEntityId: billableEntityId.value,
      });
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  watch(billableEntityId, (id) => id && reload(), { immediate: true });

  return { subscriptions, current, loading, error, reload };
}
