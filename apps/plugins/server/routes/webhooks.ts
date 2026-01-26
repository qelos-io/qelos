import { getRouter, getBodyParser, populateUser, verifyUser } from '@qelos/api-kit';
import { triggerWebhook } from '../controllers/webhooks';

export function webhooksRouter() {
  const router = getRouter();

  router.use('/api/webhooks/:integrationId', getBodyParser(), populateUser, verifyUser, triggerWebhook);

  return router;
}
