import { getRouter } from '@qelos/api-kit';
import populateUser from '../middleware/populate-user';
import { onlyAuthenticated, onlyPrivileged } from '../middleware/auth-check';
import { getSubscriptions, getSubscription, getMySubscription, createSubscription, cancelSubscription } from '../controllers/subscriptions';

const router = getRouter();

router
  .get('/api/subscriptions', populateUser, onlyAuthenticated, getSubscriptions)
  .get('/api/subscriptions/me', populateUser, onlyAuthenticated, getMySubscription)
  .get('/api/subscriptions/:id', populateUser, onlyAuthenticated, getSubscription)
  .post('/api/subscriptions', populateUser, onlyPrivileged, createSubscription)
  .put('/api/subscriptions/:id/cancel', populateUser, onlyAuthenticated, cancelSubscription);

export default router;
