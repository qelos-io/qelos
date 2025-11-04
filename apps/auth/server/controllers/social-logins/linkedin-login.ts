import { AuthRequest } from '../../../types';
import { DecryptedSourceAuthentication } from '../../services/integration-source';
import jwt from 'jsonwebtoken';
import {
  createSourceMiddleware,
  buildRedirectUri,
  emitFailedSocialLogin,
  extractAuthCode,
  findOrCreateUser,
  completeAuthentication,
  UserData,
} from '../../services/social-login-service';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'

type AuthWithLinkedinRequest = AuthRequest & { source: DecryptedSourceAuthentication };

export const getLinkedinSource = createSourceMiddleware('linkedin');

export async function loginWithLinkedIn(req: AuthWithLinkedinRequest, res) {
  const { clientId, scope } = req.source.metadata;
  const redirectUri = buildRedirectUri(req.headers.tenanthost, '/api/auth/linkedin/callback');
  const linkedinAuthUrl = `${LINKEDIN_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  res.redirect(linkedinAuthUrl);
}

export async function authCallbackFromLinkedIn(req: AuthWithLinkedinRequest, res) {
  const { clientId } = req.source.metadata;
  const { clientSecret } = req.source.authentication;

  const authCode = extractAuthCode(req);

  if (!authCode) {
    emitFailedSocialLogin(req.headers.tenant, 'linkedin', 'Invalid authorization code');
    return res.status(400).json({ message: 'Invalid authorization code' });
  }

  const redirectUri = buildRedirectUri(req.headers.tenanthost, '/api/auth/linkedin/callback');

  try {
    // Exchange the authorization code for an access token and ID token
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
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
      emitFailedSocialLogin(req.headers.tenant, 'linkedin', tokenData);
      res.status(tokenResponse.status).json({ message: 'Failed to get access token', details: tokenData }).end();
      return;
    }

    if (!tokenData.access_token) {
      emitFailedSocialLogin(req.headers.tenant, 'linkedin', tokenData);
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
      'linkedin',
      req.authConfig.allowSocialAutoRegistration
    );

    if (shouldRedirect) {
      res.redirect(shouldRedirect);
      return;
    }

    // Complete authentication
    await completeAuthentication(req, res, user, tokenData, 'linkedin');
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}
