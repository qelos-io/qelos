import { getRouter, verifyUser, populateUser, verifyInternalCall } from '@qelos/api-kit';
import { getIntegrationToIntegrate, chatCompletion, internalChatCompletion } from '../controllers/chat-completion';
import { IntegrationSourceKind } from '@qelos/global-types';
import { forceTriggerIntegrationKind } from '../middlewares/integration-kind-check';

export function chatCompletionRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser];

  router
    .post('/api/ai/:integrationId/chat-completion',
       AUTHENTICATION_MIDDLEWARES,
       forceTriggerIntegrationKind([IntegrationSourceKind.Qelos]),
       getIntegrationToIntegrate,
       chatCompletion
    )

  router
    .post('/internal-api/chat-completion', AUTHENTICATION_MIDDLEWARES, verifyInternalCall, internalChatCompletion)
  
  return router;
}
