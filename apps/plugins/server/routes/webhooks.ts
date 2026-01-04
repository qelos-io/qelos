import { getRouter, getBodyParser } from '@qelos/api-kit';
import { triggerWebhook } from '../controllers/webhooks';
import { getIntegrationFromRequest, checkTriggerPermissions } from '../middlewares/integrations';

export function webhooksRouter() {
  const router = getRouter();

  router.use('/api/webhooks/:integrationId', getBodyParser(), getIntegrationFromRequest, checkTriggerPermissions, triggerWebhook);

  return router;
}
