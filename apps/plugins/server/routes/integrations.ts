import { getRouter, verifyUser, populateUser, getBodyParser } from '@qelos/api-kit';
import { onlyEditPrivilegedOrPlugin } from '../middlewares/privileged-check';
import { createIntegration, getAllIntegrations, getIntegration, updateIntegration } from '../controllers/integrations';

export function integrationsRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [getBodyParser(), populateUser, verifyUser, onlyEditPrivilegedOrPlugin];

  function emptyResponse(req: any, res: any) {
    res.json({});
  }

  router
    .get('/api/integrations', AUTHENTICATION_MIDDLEWARES.concat(getAllIntegrations))
    .post('/api/integrations', AUTHENTICATION_MIDDLEWARES.concat(createIntegration))

  router
    .get('/api/integrations/:integrationId', AUTHENTICATION_MIDDLEWARES.concat(getIntegration))
    .put('/api/integrations/:integrationId', AUTHENTICATION_MIDDLEWARES.concat(updateIntegration))
    .delete('/api/integrations/:integrationId', AUTHENTICATION_MIDDLEWARES.concat(emptyResponse))

  return router;
}
