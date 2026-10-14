import { defineStore } from 'pinia';
import type { ISubscriptionsSummary } from '@qelos/global-types';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import subscriptionsService from '@/services/apis/subscriptions-service';

/** Server-side overview of the tenant's subscriptions (counts, estimated MRR, attention list). */
export const useSubscriptionsSummaryStore = defineStore('subscriptions-summary', () => {
  const { result, loading, loaded, error, retry } = useDispatcher<ISubscriptionsSummary | null>(
    () => subscriptionsService.getSummary(),
    null,
  );

  return { summary: result, loading, loaded, error, retry };
});
