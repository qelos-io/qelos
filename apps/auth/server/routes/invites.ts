import {getRouter} from '@qelos/api-kit';
import verifyUser from '../middleware/verify-user';
import {onlyAuthenticated} from '../middleware/auth-check';
import {getInvites, respondToInvite} from '../controllers/invites';

const invitesRouter = getRouter()

invitesRouter
  .get('/api/invites', verifyUser, onlyAuthenticated, getInvites)
  .post('/api/invites', verifyUser, onlyAuthenticated, respondToInvite);

export default invitesRouter;