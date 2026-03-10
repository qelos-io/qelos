import { getRouter } from '@qelos/api-kit';
import populateUser from '../middleware/populate-user';
import { onlyAuthenticated, onlyPrivileged } from '../middleware/auth-check';
import { getPlans, getPublicPlans, getPlan, createPlan, updatePlan, deletePlan } from '../controllers/plans';

const router = getRouter();

router
  .get('/api/plans/public', getPublicPlans)
  .get('/api/plans', populateUser, onlyPrivileged, getPlans)
  .get('/api/plans/:planId', populateUser, onlyAuthenticated, getPlan)
  .post('/api/plans', populateUser, onlyPrivileged, createPlan)
  .put('/api/plans/:planId', populateUser, onlyPrivileged, updatePlan)
  .delete('/api/plans/:planId', populateUser, onlyPrivileged, deletePlan);

export default router;
