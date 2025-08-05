import { AuthRequest } from '../../../types';
import User, { UserDocument } from '../../models/user';
import { DecryptedSourceAuthentication, getIntegrationSource } from '../../services/integration-source';
import { getRequestHost } from '../../services/req-host';
import jwt from 'jsonwebtoken';
import { getCookieTokenName, getUser } from '../../services/users';
import { getSignedToken, getUniqueId, setCookie } from '../../services/tokens';
import { cookieTokenExpiration } from '../../../config';
import { setEncryptedData } from '../../services/encrypted-data';
import { emitPlatformEvent } from '@qelos/api-kit';
import { getWorkspaceConfiguration } from '../../services/workspace-configuration';
import { getWorkspaceForUser } from '../../services/workspaces';
import { uploadProfileImage } from '../../services/assets-service-api';
import logger from '../../services/logger';

const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v15.0/dialog/oauth'
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v15.0/oauth/access_token'

type AuthWithFacebookRequest = AuthRequest & { source: DecryptedSourceAuthentication };

export async function getFacebookSource(req: AuthWithFacebookRequest, res, next) {
  if (!req.authConfig.socialLoginsSources?.facebook) {
    res.status(400).json({ message: 'Facebook social login does not exist' }).end();
    return;
  }

  const source = await getIntegrationSource(req.headers.tenant, req.authConfig.socialLoginsSources.facebook);
  if (!source) {
    res.status(400).json({ message: 'Facebook social login is not enabled' }).end();
    return;
  }
  req.source = source;
  next();
}

function getFacebookRedirectUri(tenantHost: string): string {
  const fullTenantHost = tenantHost.startsWith('http://') || tenantHost.startsWith('https://')
    ? tenantHost
    : `http://${tenantHost}`;

  return `${fullTenantHost}/api/auth/facebook/callback`;
}

function emitFailedSocialLogin(tenant: string, error: any) {
  emitPlatformEvent({
    tenant,
    user: null,
    source: 'auth',
    kind: 'failed-social-login',
    eventName: 'failed-linkedin-login',
    description: 'Failed to login via LinkedIn',
    metadata: {
      error,
    },
  });
}

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
  
  console.log('Using Facebook scope:', finalScope);
  
  const redirectUri = getFacebookRedirectUri(req.headers.tenanthost);
  // Add auth_type=rerequest to prompt user for email permission again
  const facebookAuthUrl = `${FACEBOOK_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(finalScope)}&auth_type=rerequest`;
  res.redirect(facebookAuthUrl);
}

export async function authCallbackFromFacebook(req: AuthWithFacebookRequest, res) {
  const { clientId } = req.source.metadata;
  const { clientSecret } = req.source.authentication;

  const authCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;

  if (!authCode || typeof authCode !== 'string') {
    emitFailedSocialLogin(req.headers.tenant, 'Invalid authorization code');
    return res.status(400).json({ message: 'Invalid authorization code' });
  }

  const redirectUri = getFacebookRedirectUri(req.headers.tenanthost);

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
      emitFailedSocialLogin(req.headers.tenant, tokenData);
      res.status(tokenResponse.status).json({ message: 'Failed to get access token', details: tokenData }).end();
      return;
    }

    if (!tokenData.access_token) {
      emitFailedSocialLogin(req.headers.tenant, tokenData);
      res.status(400).json({ message: 'Failed to get access token' }).end();
      return;
    }

    if (!tokenData.id_token) {
      res.status(400).json({ message: 'ID token is missing in the response' }).end();
      return
    }

    // get user data from facebook api

    let userData;
    if (tokenData.access_token) {
      // First try to get user data with email
      const userDataResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`);
      userData = await userDataResponse.json();
      
      // Check if email is present in the response
      if (!userData.email) {        
        try {
          if (tokenData.id_token) {
            const decodedToken = jwt.decode(tokenData.id_token);
            if (decodedToken && typeof decodedToken === 'object' && decodedToken.email) {
              userData.email = decodedToken.email;
            }
          }
        } catch (error) {
          console.error('Error decoding id_token:', error);
        }
        
        if (!userData.email && userData.id) {
          userData.email = `${userData.id}@facebook.user`;
        }
      }
    }

    console.log('userData!!!!', userData);

    let user: UserDocument;
    try {
      user = await getUser({ username: userData.email, tenant: req.headers.tenant });
      user.email = userData.email;

      if (userData.picture?.data?.url) {
        try {
          user.profileImage = await uploadProfileImage(
            req.headers.tenant, 
            (user._id as string), 
            userData.picture.data.url
          );
        } catch (error) {
          logger.error('failed to upload profile image', error);
          user.profileImage = userData.picture.data.url; // Fallback to original URL
        }
      }

      if (!user.emailVerified) {
        user.emailVerified = true;
      }
      if (!user.socialLogins?.includes('facebook')) {
        user.socialLogins = user.socialLogins || [];
        user.socialLogins.push('facebook');
        user.markModified('socialLogins');
      }
      await user.save();
    } catch {
      if (typeof req.authConfig.allowSocialAutoRegistration === 'boolean' && !req.authConfig.allowSocialAutoRegistration) {
        res.redirect('/login?error=needs-registration&email=' + encodeURIComponent(userData.email));
        return;
      }

      const tempUserId = `profile_${Date.now()}`;
      let profileImage = "";
      if (userData.picture?.data?.url) {
        try {
          profileImage = await uploadProfileImage(
            req.headers.tenant,
            tempUserId,
            userData.picture.data.url
          );
        } catch (error) {
          profileImage = userData.picture.data.url;
        }
      }

      const fullName = userData.name || '';
      const firstName = fullName.split(' ')[0] || '';
      const lastName = fullName.split(' ').slice(1).join(' ') || '';

      user = new User({
        tenant: req.headers.tenant,
        username: userData.email,
        email: userData.email,
        fullName,
        firstName,
        lastName,
        profileImage,
        emailVerified: true,
        socialLogins: ['facebook'],
      });
      await user.save();

      emitPlatformEvent({
        tenant: req.headers.tenant,
        user: user.id,
        source: 'auth',
        kind: 'signup',
        eventName: 'user-registered',
        description: 'User registered via Facebook',
        metadata: {
          user: {
            tenant: user.tenant,
            username: user.username,
            email: user.email,
            fullName,
            firstName,
            lastName,
            profileImage,
            roles: user.roles,
            _id: user._id,
            created: user.created,
          },
          source: 'facebook',
        },
      });
    }

    await setEncryptedData(req.headers.tenant, `${user.id}-facebookToken`, JSON.stringify(tokenData))

    let workspace;
    try {
      const wsConfig = await getWorkspaceConfiguration(req.headers.tenant)
      if (wsConfig.isActive) {
        workspace = await getWorkspaceForUser(req.headers.tenant, user._id, user.lastLogin?.workspace || user.tokens?.at(-1)?.metadata?.workspace);
      }
    } catch {
      logger.log('Error getting workspace in facebook login');
    }

    const requestHost = getRequestHost(req);
    const { token: newToken } = getSignedToken(
      user,
      workspace,
      getUniqueId(),
      String(cookieTokenExpiration)
    );

    setCookie(res, getCookieTokenName(user.tenant), newToken, null, requestHost);
    res.redirect('/');
  } catch (error) {
    logger.error('failed to login via facebook', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
