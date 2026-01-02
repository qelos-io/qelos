import { getRouter, getBodyParser } from '@qelos/api-kit';
import { triggerWebhook } from '../controllers/webhook-trigger';

export function webhookTriggerRouter() {
  const router = getRouter();

  router.post('/api/webhooks/trigger/:webhookId', getBodyParser(), triggerWebhook);

  return router;
}
