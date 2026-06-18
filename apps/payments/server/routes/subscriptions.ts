import { getRouter } from '@qelos/api-kit';
import populateUser from '../middleware/populate-user';
import { onlyAuthenticated, onlyPrivileged } from '../middleware/auth-check';
import { getSubscriptions, getSubscription, getMySubscription, createSubscription, setDynamicAmount, cancelSubscription } from '../controllers/subscriptions';

const router = getRouter();

router
  .get('/api/subscriptions', populateUser, onlyAuthenticated, getSubscriptions)
  .get('/api/subscriptions/me', populateUser, onlyAuthenticated, getMySubscription)
  .get('/api/subscriptions/:id', populateUser, onlyAuthenticated, getSubscription)
  .post('/api/subscriptions', populateUser, onlyAuthenticated, createSubscription)
  .put('/api/subscriptions/:id/dynamic-amount', populateUser, onlyPrivileged, setDynamicAmount)
  .put('/api/subscriptions/:id/cancel', populateUser, onlyAuthenticated, cancelSubscription);

export default router;
