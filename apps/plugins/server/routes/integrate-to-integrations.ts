import { getRouter, verifyUser, populateUser, getBodyParser } from '@qelos/api-kit';
import { onlyEditPrivilegedOrPlugin } from '../middlewares/privileged-check';
import { getIntegrationToIntegrate, forceTriggerIntegrationKind, chatCompletion } from '../controllers/integrate-to-integrations';
import { IntegrationSourceKind } from '@qelos/global-types';

export function integrateToIntegrationsRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [getBodyParser(), populateUser, verifyUser];

  router
    .post('/api/integrate/:integrationId/chat-completion',
       AUTHENTICATION_MIDDLEWARES,
       forceTriggerIntegrationKind([IntegrationSourceKind.Qelos]),
       getIntegrationToIntegrate,
       chatCompletion
    )
  
  return router;
}
