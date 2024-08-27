import { getRouter } from '@qelos/api-kit';
import getAllRoles from '../controllers/roles';
import verifyUser from '../middleware/verify-user';
import { onlyPrivileged } from '../middleware/auth-check';

const router = getRouter();

router.get('/api/roles', verifyUser, onlyPrivileged, getAllRoles);

export default router;
