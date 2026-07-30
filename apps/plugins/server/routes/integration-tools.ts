import { getRouter, getBodyParser, verifyInternalCall } from '@qelos/api-kit';
import { getIntegrationTools, getMcpToolIntegrations } from '../controllers/integration-tools';

export function integrationToolsRouter() {
  const router = getRouter();

  router.get('/internal-api/integration-tools', getBodyParser(), verifyInternalCall, getIntegrationTools)
  router.get('/internal-api/mcp-tool-integrations', getBodyParser(), verifyInternalCall, getMcpToolIntegrations)
  return router;
}
