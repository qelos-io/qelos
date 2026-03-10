import { getRouter } from '@qelos/api-kit';
import populateUser from '../middleware/populate-user';
import { onlyAuthenticated } from '../middleware/auth-check';
import { initiateCheckout, cancelSubscription } from '../controllers/checkout';
import { handleWebhook } from '../controllers/webhooks';

const router = getRouter();

router
  .post('/api/checkout', populateUser, onlyAuthenticated, initiateCheckout)
  .put('/api/checkout/:subscriptionId/cancel', populateUser, onlyAuthenticated, cancelSubscription)
  .post('/api/payments/webhooks/:providerKind', handleWebhook);

export default router;
