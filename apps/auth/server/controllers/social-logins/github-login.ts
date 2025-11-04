import { AuthRequest } from '../../../types';
import User, { UserDocument } from '../../models/user';
import { DecryptedSourceAuthentication, getIntegrationSource } from '../../services/integration-source';
import { getRequestHost } from '../../services/req-host';
import { getCookieTokenName, getUser } from '../../services/users';
import { getSignedToken, getUniqueId, setCookie } from '../../services/tokens';
import { cookieTokenExpiration } from '../../../config';
import { setEncryptedData } from '../../services/encrypted-data';
import { emitPlatformEvent } from '@qelos/api-kit';
import { getWorkspaceConfiguration } from '../../services/workspace-configuration';
import { getWorkspaceForUser } from '../../services/workspaces';
import { uploadProfileImage } from '../../services/assets-service-api';
import logger from '../../services/logger';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_USER_EMAILS_URL = 'https://api.github.com/user/emails'

type AuthWithGithubRequest = AuthRequest & { source: DecryptedSourceAuthentication };

export async function getGithubSource(req: AuthWithGithubRequest, res, next) {
  if (!req.authConfig.socialLoginsSources?.github) {
    res.status(400).json({ message: 'GitHub social login does not exist' }).end();
    return;
  }

  const source = await getIntegrationSource(req.headers.tenant, req.authConfig.socialLoginsSources.github);
  if (!source) {
    res.status(400).json({ message: 'GitHub social login is not enabled' }).end();
    return;
  }
  req.source = source;
  next();
}

function getGithubRedirectUri(tenantHost: string): string {
  const fullTenantHost = tenantHost.startsWith('http://') || tenantHost.startsWith('https://')
    ? tenantHost
    : `https://${tenantHost}`;

  return `${fullTenantHost}/api/auth/github/callback`;
}

function emitFailedSocialLogin(tenant: string, error: any) {
  emitPlatformEvent({
    tenant,
    user: null,
    source: 'auth',
    kind: 'failed-social-login',
    eventName: 'failed-github-login',
    description: 'Failed to login via GitHub',
    metadata: {
      error,
    },
  });
}

export async function loginWithGithub(req: AuthWithGithubRequest, res) {
  const { clientId, scope } = req.source.metadata;
  const redirectUri = getGithubRedirectUri(req.headers.tenanthost);
  const githubAuthUrl = `${GITHUB_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope || 'user:email')}`;
  res.redirect(githubAuthUrl);
}

export async function authCallbackFromGithub(req: AuthWithGithubRequest, res) {
  const { clientId } = req.source.metadata;
  const { clientSecret } = req.source.authentication;

  const authCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;

  if (!authCode || typeof authCode !== 'string') {
    emitFailedSocialLogin(req.headers.tenant, 'Invalid authorization code');
    return res.status(400).json({ message: 'Invalid authorization code' });
  }

  const redirectUri = getGithubRedirectUri(req.headers.tenanthost);

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: authCode,
        redirect_uri: redirectUri,
      }),
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

    // Get user data from GitHub API
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      emitFailedSocialLogin(req.headers.tenant, userData);
      res.status(userResponse.status).json({ message: 'Failed to get user data', details: userData }).end();
      return;
    }

    // Get user email if not provided in user data
    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch(GITHUB_USER_EMAILS_URL, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      });
      
      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find(e => e.primary && e.verified);
        if (primaryEmail) {
          email = primaryEmail.email;
        } else if (emails.length > 0) {
          email = emails[0].email;
        }
      }
    }

    // Fallback email if still not found
    if (!email) {
      email = `${userData.login}@github.user`;
    }

    let user: any;
    try {
      user = await getUser({ username: email, tenant: req.headers.tenant });
      user.email = email;

      if (userData.avatar_url) {
        try {
          user.profileImage = await uploadProfileImage(
            req.headers.tenant, 
            (user._id as string), 
            userData.avatar_url
          );
        } catch (error) {
          logger.error('failed to upload profile image', error);
          user.profileImage = userData.avatar_url; // Fallback to original URL
        }
      }

      if (!user.emailVerified) {
        user.emailVerified = true;
      }
      if (!user.socialLogins?.includes('github')) {
        user.socialLogins = user.socialLogins || [];
        user.socialLogins.push('github');
        user.markModified('socialLogins');
      }
      await user.save();
    } catch {
      if (typeof req.authConfig.allowSocialAutoRegistration === 'boolean' && !req.authConfig.allowSocialAutoRegistration) {
        res.redirect('/login?error=needs-registration&email=' + encodeURIComponent(email));
        return;
      }

      const tempUserId = `profile_${Date.now()}`;
      let profileImage = "";
      if (userData.avatar_url) {
        try {
          profileImage = await uploadProfileImage(
            req.headers.tenant,
            tempUserId,
            userData.avatar_url
          );
        } catch (error) {
          profileImage = userData.avatar_url;
        }
      }

      const fullName = userData.name || userData.login || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const newUser = new User({
        tenant: req.headers.tenant,
        username: email,
        email: email,
        fullName,
        firstName,
        lastName,
        profileImage,
        emailVerified: true,
        socialLogins: ['github'],
      });
      await newUser.save();
      user = newUser as any;

      emitPlatformEvent({
        tenant: req.headers.tenant,
        user: user.id,
        source: 'auth',
        kind: 'signup',
        eventName: 'user-registered',
        description: 'User registered via GitHub',
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
          source: 'github',
        },
      });
    }

    await setEncryptedData(req.headers.tenant, `${user.id}-githubToken`, JSON.stringify(tokenData))

    let workspace;
    try {
      const wsConfig = await getWorkspaceConfiguration(req.headers.tenant)
      if (wsConfig.isActive) {
        workspace = await getWorkspaceForUser(req.headers.tenant, user._id, user.lastLogin?.workspace || user.tokens?.at(-1)?.metadata?.workspace);
      }
    } catch {
      logger.log('Error getting workspace in github login');
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
    logger.error('failed to login via github', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
