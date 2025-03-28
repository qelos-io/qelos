import { getRouter, verifyUser, populateUser, getBodyParser } from '@qelos/api-kit';
import { onlyEditPrivilegedOrPlugin } from '../middlewares/privileged-check';
import { getIntegrationSource, validateChatSources, chatCompletion, noCodeBlueprintsCompletion, noCodeMicroFrontendsCompletion, noCodeIntegrationsCompletion } from '../controllers/integrate-to-sources';

export function integrateToSourcesRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [getBodyParser(), populateUser, verifyUser, onlyEditPrivilegedOrPlugin, getIntegrationSource];

  router
    .post('/api/integrate-source/:sourceId/chat-completion', AUTHENTICATION_MIDDLEWARES.concat(validateChatSources), chatCompletion)
    .post('/api/integrate-source/:sourceId/no-code-completion/blueprints', AUTHENTICATION_MIDDLEWARES.concat(validateChatSources), noCodeBlueprintsCompletion)
    .post('/api/integrate-source/:sourceId/no-code-completion/micro-frontends', AUTHENTICATION_MIDDLEWARES.concat(validateChatSources), noCodeMicroFrontendsCompletion)
    .post('/api/integrate-source/:sourceId/no-code-completion/integrations', AUTHENTICATION_MIDDLEWARES.concat(validateChatSources), noCodeIntegrationsCompletion)

  return router;
}
