import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import integrationsService from '@/services/integrations-service';

export function useIntegrations() {
  return useDispatcher(() => integrationsService.getAll(), []);
}