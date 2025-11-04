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

const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v15.0/dialog/oauth'
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v15.0/oauth/access_token'

type AuthWithFacebookRequest = AuthRequest & { source: DecryptedSourceAuthentication };

export const getFacebookSource = createSourceMiddleware('facebook');

export async function loginWithFacebook(req: AuthWithFacebookRequest, res) {
  const { clientId, scope } = req.source.metadata;
  // Facebook only supports specific basic scopes
  // Only use email and public_profile which are the most commonly approved
  const validFacebookScopes = ['email', 'public_profile'];
  
  // Start with a clean scope string
  let finalScope = '';
  
  // If there's a configured scope, use it as a base
  if (scope) {
    // Split by commas or spaces to handle different formats
    const configuredScopes = scope.split(/[, ]+/);
    finalScope = configuredScopes
      .filter(s => validFacebookScopes.includes(s))
      .join(',');
  } else {
    // Default to these two basic scopes
    finalScope = 'email,public_profile';
  }
  
  
  const redirectUri = buildRedirectUri(req.headers.tenanthost, '/api/auth/facebook/callback', false);
  // Add auth_type=rerequest to prompt user for email permission again
  const facebookAuthUrl = `${FACEBOOK_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(finalScope)}&auth_type=rerequest`;
  res.redirect(facebookAuthUrl);
}

export async function authCallbackFromFacebook(req: AuthWithFacebookRequest, res) {
  const { clientId } = req.source.metadata;
  const { clientSecret } = req.source.authentication;

  const authCode = extractAuthCode(req);

  if (!authCode) {
    emitFailedSocialLogin(req.headers.tenant, 'facebook', 'Invalid authorization code');
    return res.status(400).json({ message: 'Invalid authorization code' });
  }

  const redirectUri = buildRedirectUri(req.headers.tenanthost, '/api/auth/facebook/callback', false);

  try {
    // Exchange the authorization code for an access token and ID token
    const tokenResponse = await fetch(FACEBOOK_TOKEN_URL, {
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
      emitFailedSocialLogin(req.headers.tenant, 'facebook', tokenData);
      res.status(tokenResponse.status).json({ message: 'Failed to get access token', details: tokenData }).end();
      return;
    }

    if (!tokenData.access_token) {
      emitFailedSocialLogin(req.headers.tenant, 'facebook', tokenData);
      res.status(400).json({ message: 'Failed to get access token' }).end();
      return;
    }

    if (!tokenData.id_token) {
      res.status(400).json({ message: 'ID token is missing in the response' }).end();
      return
    }

    // Get user data from Facebook API
    const userDataResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`);
    const fbUserData = await userDataResponse.json();
    
    // Extract email with fallback logic
    let email = fbUserData.email;
    if (!email) {
      // Try to get email from ID token if available
      try {
        if (tokenData.id_token) {
          const decodedToken = jwt.decode(tokenData.id_token);
          if (decodedToken && typeof decodedToken === 'object' && decodedToken.email) {
            email = decodedToken.email;
          }
        }
      } catch {
        // ignore
      }
      
      // Final fallback
      if (!email && fbUserData.id) {
        email = `${fbUserData.id}@facebook.user`;
      }
    }

    // Parse name from Facebook data
    const fullName = fbUserData.name || '';
    const firstName = fullName.split(' ')[0] || '';
    const lastName = fullName.split(' ').slice(1).join(' ') || '';

    const userData: UserData = {
      email,
      fullName,
      firstName,
      lastName,
      picture: fbUserData.picture?.data?.url,
    };

    // Find or create user
    const { user, shouldRedirect } = await findOrCreateUser(
      req.headers.tenant,
      userData,
      'facebook',
      req.authConfig.allowSocialAutoRegistration
    );

    if (shouldRedirect) {
      res.redirect(shouldRedirect);
      return;
    }

    // Complete authentication
    await completeAuthentication(req, res, user, tokenData, 'facebook');
  } catch (error) {
    logger.error('failed to login via facebook', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
