import { IIntegration } from '@qelos/global-types'
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import integrationsService from '@/services/integrations-service';

export function useIntegrations() {
  return useDispatcher<IIntegration[]>(() => integrationsService.getAll(), []);
}