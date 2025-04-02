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

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'

type AuthWithLinkedinRequest = AuthRequest & { source: DecryptedSourceAuthentication };

export async function getLinkedinSource(req: AuthWithLinkedinRequest, res, next) {
  if (!req.authConfig.socialLoginsSources?.linkedin) {
    res.status(400).json({ message: 'LinkedIn social login does not exist' }).end();
    return;
  }

  const source = await getIntegrationSource(req.headers.tenant, req.authConfig.socialLoginsSources.linkedin);
  if (!source) {
    res.status(400).json({ message: 'LinkedIn social login is not enabled' }).end();
    return;
  }
  req.source = source;
  next();
}

function getLinkedInRedirectUri(tenantHost: string): string {
  const fullTenantHost = tenantHost.startsWith('http://') || tenantHost.startsWith('https://')
    ? tenantHost
    : `https://${tenantHost}`;

  return `${fullTenantHost}/api/auth/linkedin/callback`;
}

export async function loginWithLinkedIn(req: AuthWithLinkedinRequest, res) {
  const { clientId, scope } = req.source.metadata;
  const redirectUri = getLinkedInRedirectUri(req.headers.tenanthost);
  const linkedinAuthUrl = `${LINKEDIN_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  res.redirect(linkedinAuthUrl);
}

export async function authCallbackFromLinkedIn(req: AuthWithLinkedinRequest, res) {
  const { clientId } = req.source.metadata;
  const { clientSecret } = req.source.authentication;

  const authCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;

  if (!authCode || typeof authCode !== 'string') {
    return res.status(400).json({ message: 'Invalid authorization code' });
  }

  const redirectUri = getLinkedInRedirectUri(req.headers.tenanthost);

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
      res.status(tokenResponse.status).json({ message: 'Failed to get access token', details: tokenData }).end();
      return;
    }

    if (!tokenData.access_token) {
      res.status(400).json({ message: 'Failed to get access token' }).end();
      return;
    }

    if (!tokenData.id_token) {
      res.status(400).json({ message: 'ID token is missing in the response' }).end();
      return
    }

    let userData;
    if (tokenData.id_token) {
      userData = jwt.decode(tokenData.id_token);
    }

    let user: UserDocument;
    try {
      user = await getUser({ username: userData.email, tenant: req.headers.tenant });
      user.email = userData.email;

      if (userData.picture) {
        try {
          user.profileImage = await uploadProfileImage(
            req.headers.tenant, 
            (user._id as string), 
            userData.picture
          );
        } catch (error) {
          logger.error('failed to upload profile image', error);
          user.profileImage = userData.picture; // Fallback to original URL
        }
      }

      if (!user.emailVerified) {
        user.emailVerified = true;
      }
      if (!user.socialLogins?.includes('linkedin')) {
        user.socialLogins = user.socialLogins || [];
        user.socialLogins.push('linkedin');
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
      if (userData.picture) {
        try {
          profileImage = await uploadProfileImage(
            req.headers.tenant,
            tempUserId,
            userData.picture
          );
        } catch (error) {
          profileImage = userData.picture;
        }
      }

      user = new User({
        tenant: req.headers.tenant,
        username: userData.email,
        email: userData.email,
        fullName: userData.name || '',
        firstName: userData.given_name || '',
        lastName: userData.family_name || '',
        profileImage,
        emailVerified: true,
        socialLogins: ['linkedin'],
      });
      await user.save();

      emitPlatformEvent({
        tenant: req.headers.tenant,
        user: user.id,
        source: 'auth',
        kind: 'signup',
        eventName: 'user-registered',
        description: 'User registered via LinkedIn',
        metadata: {
          user: {
            tenant: user.tenant,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImage: user.profileImage,
            roles: user.roles,
            _id: user._id,
            created: user.created,
          },
          source: 'linkedin',
        },
      });
    }

    await setEncryptedData(req.headers.tenant, `${user.id}-linkedinToken`, JSON.stringify(tokenData))

    let workspace;
    try {
      const wsConfig = await getWorkspaceConfiguration(req.headers.tenant)
      if (wsConfig.isActive) {
        workspace = await getWorkspaceForUser(req.headers.tenant, user._id, user.lastLogin?.workspace || user.tokens?.at(-1)?.metadata?.workspace);
      }
    } catch {
      logger.log('Error getting workspace in linkedin login');
    }

    const requestHost = getRequestHost(req);
    const { token: newToken } = getSignedToken(
      user,
      workspace,
      getUniqueId(),
      String(cookieTokenExpiration / 1000)
    );

    setCookie(res, getCookieTokenName(user.tenant), newToken, null, requestHost);
    res.redirect('/');
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}
