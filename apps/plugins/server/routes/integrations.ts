import { getRouter, verifyUser, populateUser, getBodyParser } from '@qelos/api-kit';
import { onlyEditPrivilegedOrPlugin } from '../middlewares/privileged-check';

export function integrationsRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [getBodyParser(), populateUser, verifyUser, onlyEditPrivilegedOrPlugin];

  function emptyResponse(req: any, res: any) {
    res.json({});
  }

  router
    .get('/api/integrations', AUTHENTICATION_MIDDLEWARES.concat(emptyResponse))
    .post('/api/integrations', AUTHENTICATION_MIDDLEWARES.concat(emptyResponse))

  router
    .get('/api/integrations/:integrationId', AUTHENTICATION_MIDDLEWARES.concat(emptyResponse))
    .put('/api/integrations/:integrationId', AUTHENTICATION_MIDDLEWARES.concat(emptyResponse))
    .delete('/api/integrations/:integrationId', AUTHENTICATION_MIDDLEWARES.concat(emptyResponse))

  return router;
}
