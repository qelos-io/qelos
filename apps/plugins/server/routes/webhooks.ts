import { getRouter, getBodyParser } from '@qelos/api-kit';
import { createWebhook, triggerWebhook } from '../controllers/webhooks';

export function webhooksRouter() {
  const router = getRouter();

  router.post('/api/webhooks/:sourceId', getBodyParser(), createWebhook);
  router.post('/api/webhooks/trigger/:webhookId', getBodyParser(), triggerWebhook);

  return router;
}
