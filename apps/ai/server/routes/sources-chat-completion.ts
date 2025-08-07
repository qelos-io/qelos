import { getRouter, verifyUser, populateUser, verifyInternalCall } from '@qelos/api-kit';
import { onlyEditPrivileged } from '../middlewares/privileged-check';
import { getSourceToIntegrate, chatCompletion, internalChatCompletion, chatCompletionPages } from '../controllers/sources-chat-completion';
import { createBlueprintUsingAI } from '../controllers/ai-blueprints';

export function sourcesChatCompletionRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, onlyEditPrivileged];

  router
    .post('/api/ai/sources/:sourceId/chat-completion',
       AUTHENTICATION_MIDDLEWARES,
       getSourceToIntegrate,
       chatCompletion
    )

  router
    .post('/api/ai/sources/:sourceId/chat-completion/pages',
       AUTHENTICATION_MIDDLEWARES,
       getSourceToIntegrate,
       chatCompletionPages  
    )

  router
    .post('/api/ai/sources/:sourceId/blueprints',
       AUTHENTICATION_MIDDLEWARES,
       getSourceToIntegrate,
       createBlueprintUsingAI
    )

  router
    .post('/internal-api/sources-chat-completion', AUTHENTICATION_MIDDLEWARES, verifyInternalCall, internalChatCompletion)
  
  return router;
}
