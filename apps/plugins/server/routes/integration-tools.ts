import { getRouter, getBodyParser, verifyInternalCall } from '@qelos/api-kit';
import { getIntegrationTools } from '../controllers/integration-tools';

export function integrationToolsRouter() {
  const router = getRouter();

  router.get('/internal-api/integration-tools', getBodyParser(), verifyInternalCall, getIntegrationTools)
  return router;
}
