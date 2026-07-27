import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import configurationsService from '@/services/apis/configurations-service';
import type { IMcpConfigurationMetadata } from '@qelos/global-types';

const DEFAULT_VALUE: IMcpConfigurationMetadata = {
  enabled: false,
  permittedCallbackUrls: [],
  exposedTools: [],
  adminOnly: true,
};

export const useMcpConfiguration = defineStore('mcp-configuration', () => {
  const { result, loaded, loading, promise, retry } = useDispatcher(
    () => configurationsService.getOne('mcp-configuration'),
    { metadata: DEFAULT_VALUE },
  );

  const metadata = computed<IMcpConfigurationMetadata>(() => result.value?.metadata || DEFAULT_VALUE);
  const isEnabled = computed(() => !!metadata.value.enabled);

  return {
    metadata,
    loaded,
    loading,
    isEnabled,
    promise,
    reload: retry,
  };
});
