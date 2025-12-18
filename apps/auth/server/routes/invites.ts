import { getRouter } from '@qelos/api-kit';
import verifyUser from '../middleware/verify-user';
import { onlyAuthenticated } from '../middleware/auth-check';
import { getInvites, respondToInvite } from '../controllers/invites';
import { handleImpersonation } from '../middleware/impersonation';

const invitesRouter = getRouter()

invitesRouter
  .get('/api/invites', verifyUser, onlyAuthenticated, handleImpersonation, getInvites)
  .post('/api/invites', verifyUser, onlyAuthenticated, handleImpersonation, respondToInvite);

export default invitesRouter;