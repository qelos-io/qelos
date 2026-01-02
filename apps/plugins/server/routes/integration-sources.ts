import { getRouter, verifyUser, populateUser, getBodyParser, verifyInternalCall } from '@qelos/api-kit';
import { onlyEditPrivilegedOrPlugin } from '../middlewares/privileged-check';
import {
  createIntegrationSource,
  getAllIntegrationSources,
  getIntegrationSource, getInternalIntegrationSource, removeIntegrationSource, triggerIntegrationSource, updateIntegrationSource,
  createWebhook,
  triggerWebhook,
} from '../controllers/integration-sources';

export function integrationSourcesRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [getBodyParser(), populateUser, verifyUser, onlyEditPrivilegedOrPlugin];

  router
    .get('/api/integration-sources', AUTHENTICATION_MIDDLEWARES.concat(getAllIntegrationSources))
    .post('/api/integration-sources', AUTHENTICATION_MIDDLEWARES.concat(createIntegrationSource))

  router
    .get('/api/integration-sources/:sourceId', AUTHENTICATION_MIDDLEWARES.concat(getIntegrationSource))
    .put('/api/integration-sources/:sourceId', AUTHENTICATION_MIDDLEWARES.concat(updateIntegrationSource))
    .delete('/api/integration-sources/:sourceId', AUTHENTICATION_MIDDLEWARES.concat(removeIntegrationSource))


  router
    .get('/internal-api/integration-sources/:sourceId', verifyInternalCall, getInternalIntegrationSource)
    .post('/internal-api/integration-sources/:sourceId/trigger', verifyInternalCall, getBodyParser(), triggerIntegrationSource)
    .post('/api/integration-sources/:sourceId/webhook', AUTHENTICATION_MIDDLEWARES.concat(createWebhook))
    .post('/api/integration-sources/:sourceId/trigger-webhook/:webhookId', getBodyParser(), triggerWebhook)

  return router;
}
