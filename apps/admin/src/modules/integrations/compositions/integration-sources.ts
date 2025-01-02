import { IntegrationSourceKind } from '@qelos/global-types';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import integrationSourcesService from '@/services/integration-sources-service';

export function useIntegrationSources(kind: IntegrationSourceKind) {
  return useDispatcher(() => integrationSourcesService.getAll({ kind }), []);
}