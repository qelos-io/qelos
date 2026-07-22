import { getRouter } from '@qelos/api-kit';
import populateUser from '../middleware/populate-user';
import { onlyPrivileged } from '../middleware/auth-check';
import { getPaymentsConfiguration, updatePaymentsConfiguration } from '../controllers/configuration';

const router = getRouter();

router
  .get('/api/payments/configuration', populateUser, onlyPrivileged, getPaymentsConfiguration)
  .put('/api/payments/configuration', populateUser, onlyPrivileged, updatePaymentsConfiguration);

export default router;
