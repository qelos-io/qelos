import { getRouter, getBodyParser } from '@qelos/api-kit';
import { triggerWebhook } from '../controllers/webhooks';

export function webhooksRouter() {
  const router = getRouter();

  router.post('/api/webhooks/:integrationId', getBodyParser(), triggerWebhook);

  return router;
}
