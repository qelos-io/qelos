import { getRouter } from '@qelos/api-kit';
import getAllRoles from '../controllers/roles';
import verifyUser from '../middleware/verify-user';
import { onlyPrivileged } from '../middleware/auth-check';
import { handleImpersonation } from '../middleware/impersonation';

const router = getRouter();

router.get('/api/roles', verifyUser, handleImpersonation, onlyPrivileged, getAllRoles);

export default router;
