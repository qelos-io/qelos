import { AuthRequest } from '../../../types';
import { DecryptedSourceAuthentication } from '../../services/integration-source';
import jwt from 'jsonwebtoken';
import logger from '../../services/logger';
import {
  createSourceMiddleware,
  buildRedirectUri,
  emitFailedSocialLogin,
  extractAuthCode,
  findOrCreateUser,
  completeAuthentication,
  UserData,
} from '../../services/social-login-service';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

type AuthWithGoogleRequest = AuthRequest & { source: DecryptedSourceAuthentication };

export const getGoogleSource = createSourceMiddleware('google');

export async function loginWithGoogle(req: AuthWithGoogleRequest, res) {
  const { clientId, scope } = req.source.metadata;
  const redirectUri = buildRedirectUri(req.headers.tenanthost, '/api/auth/google/callback');
  const googleAuthUrl = `${GOOGLE_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope || 'openid email profile')}&access_type=offline&prompt=consent`;
  res.redirect(googleAuthUrl);
}

export async function authCallbackFromGoogle(req: AuthWithGoogleRequest, res) {
  const { clientId } = req.source.metadata;
  const { clientSecret } = req.source.authentication;

  const authCode = extractAuthCode(req);

  if (!authCode) {
    emitFailedSocialLogin(req.headers.tenant, 'google', 'Invalid authorization code');
    return res.status(400).json({ message: 'Invalid authorization code' });
  }

  const redirectUri = buildRedirectUri(req.headers.tenanthost, '/api/auth/google/callback');

  try {
    // Exchange the authorization code for an access token and ID token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      emitFailedSocialLogin(req.headers.tenant, 'google', tokenData);
      res.status(tokenResponse.status).json({ message: 'Failed to get access token', details: tokenData }).end();
      return;
    }

    if (!tokenData.access_token) {
      emitFailedSocialLogin(req.headers.tenant, 'google', tokenData);
      res.status(400).json({ message: 'Failed to get access token' }).end();
      return;
    }

    if (!tokenData.id_token) {
      res.status(400).json({ message: 'ID token is missing in the response' }).end();
      return
    }

    // Decode user data from ID token
    const decodedToken: any = tokenData.id_token ? jwt.decode(tokenData.id_token) : null;
    
    if (!decodedToken) {
      res.status(400).json({ message: 'Failed to decode ID token' }).end();
      return;
    }

    const userData: UserData = {
      email: decodedToken.email,
      fullName: decodedToken.name || '',
      firstName: decodedToken.given_name || '',
      lastName: decodedToken.family_name || '',
      picture: decodedToken.picture,
    };

    // Find or create user
    const { user, shouldRedirect } = await findOrCreateUser(
      req.headers.tenant,
      userData,
      'google',
      req.authConfig.allowSocialAutoRegistration
    );

    if (shouldRedirect) {
      res.redirect(shouldRedirect);
      return;
    }

    // Complete authentication
    await completeAuthentication(req, res, user, tokenData, 'google');
  } catch (error) {
    logger.error('failed to login via google', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
