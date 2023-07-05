import {getRouter} from '@qelos/api-kit';


import verifyUser from '../middleware/verify-user';
import {onlyAuthenticated} from '../middleware/auth-check';
import {getMe, setMe} from '../controllers/me';

const router = getRouter()

router
  .get('/api/me', verifyUser, onlyAuthenticated, getMe)
  .post('/api/me', verifyUser, onlyAuthenticated, setMe);

export default router;