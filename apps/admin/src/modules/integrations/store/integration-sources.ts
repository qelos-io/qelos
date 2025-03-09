import { defineStore } from 'pinia';
import { IIntegrationSource, IntegrationSourceKind } from '@qelos/global-types';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import integrationSourcesService from '@/services/integration-sources-service';
import { computed } from 'vue';

export const useIntegrationSourcesStore = defineStore('integration-sources', () => {
  const {
    result,
    loading,
    loaded,
    promise,
    error,
    retry
  } = useDispatcher<IIntegrationSource[]>(() => integrationSourcesService.getAll(), []);

  const groupedSources = computed(() => {
    return result.value?.reduce((acc, source) => {
      if (!acc[source.kind]) {
        acc[source.kind] = [];
      }
      acc[source.kind].push(source);
      return acc;
    }, {} as Record<IntegrationSourceKind, IIntegrationSource[] | undefined>);
  });

  return {
    result,
    loading,
    loaded,
    promise,
    error,
    retry,
    groupedSources
  }
})