import { getRouter, verifyUser, populateUser, verifyInternalCall } from '@qelos/api-kit';
import { onlyEditPrivileged } from '../middlewares/privileged-check';
import { getSourceToIntegrate, chatCompletion, internalChatCompletion, chatCompletionPages, chatCompletionIntegrations ,chatCompletionAdmin, chatCompletionPlain } from '../controllers/sources-chat-completion';
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
    .post('/api/ai/sources/:sourceId/chat-completion/plain',
       AUTHENTICATION_MIDDLEWARES,
       getSourceToIntegrate,
       chatCompletionPlain
    )

  router
    .post('/api/ai/sources/:sourceId/chat-completion/pages',
       AUTHENTICATION_MIDDLEWARES,
       getSourceToIntegrate,
       chatCompletionPages  
    )
  
  router
    .post('/api/ai/sources/:sourceId/chat-completion/integrations',
       AUTHENTICATION_MIDDLEWARES,
       getSourceToIntegrate,
       chatCompletionIntegrations  
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
