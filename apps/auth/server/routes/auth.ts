import { getRouter } from '@qelos/api-kit'
import { onlyAuthenticated } from '../middleware/auth-check';
import verifyUser from '../middleware/verify-user';
import { signin } from '../controllers/signin';
import { signup } from '../controllers/signup';
import { refreshToken } from '../controllers/refresh-token';
import { logout } from '../controllers/logout';
import { authCallback } from '../controllers/auth-callback';
import {
  authCallbackFromLinkedIn,
  getLinkedinSource,
  loginWithLinkedIn
} from '../controllers/social-logins/linkedin-login';
import { authConfigCheck } from '../middleware/auth-config-check';

const router = getRouter()

router
  .post('/api/signin', signin)
  .post('/api/signup', signup)
  .post('/api/token/refresh', refreshToken)
  .post('/api/logout', verifyUser, onlyAuthenticated, logout)
  .post('/api/auth/callback', authCallback)
  .get('/api/auth/linkedin', authConfigCheck, getLinkedinSource, loginWithLinkedIn)
  .get('/api/auth/linkedin/callback', authConfigCheck, getLinkedinSource, authCallbackFromLinkedIn)

export default router;
