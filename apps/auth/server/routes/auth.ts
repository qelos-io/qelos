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
import {
  authCallbackFromFacebook,
  getFacebookSource,
  loginWithFacebook
} from '../controllers/social-logins/facebook-login';
import {
  authCallbackFromGoogle,
  getGoogleSource,
  loginWithGoogle
} from '../controllers/social-logins/google-login';
import {
  authCallbackFromGithub,
  getGithubSource,
  loginWithGithub
} from '../controllers/social-logins/github-login';
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
  .get('/api/auth/facebook', authConfigCheck, getFacebookSource, loginWithFacebook)
  .use('/api/auth/facebook/callback', authConfigCheck, getFacebookSource, authCallbackFromFacebook)
  .get('/api/auth/google', authConfigCheck, getGoogleSource, loginWithGoogle)
  .get('/api/auth/google/callback', authConfigCheck, getGoogleSource, authCallbackFromGoogle)
  .get('/api/auth/github', authConfigCheck, getGithubSource, loginWithGithub)
  .get('/api/auth/github/callback', authConfigCheck, getGithubSource, authCallbackFromGithub)

export default router;
