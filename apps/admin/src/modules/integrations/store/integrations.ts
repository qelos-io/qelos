import { defineStore } from 'pinia';
import { useIntegrations } from '@/modules/integrations/compositions/integrations';

export const useIntegrationsStore = defineStore('integrations', () => {
  const {
    result,
    loading,
    loaded,
    promise,
    error,
    retry
  } = useIntegrations();

  return {
    integrations: result,
    loading,
    loaded,
    promise,
    error,
    retry,
  }
})