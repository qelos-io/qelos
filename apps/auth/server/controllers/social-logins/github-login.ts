import { AuthRequest } from '../../../types';
import { DecryptedSourceAuthentication } from '../../services/integration-source';
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

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_USER_EMAILS_URL = 'https://api.github.com/user/emails'

type AuthWithGithubRequest = AuthRequest & { source: DecryptedSourceAuthentication };

export const getGithubSource = createSourceMiddleware('github');

export async function loginWithGithub(req: AuthWithGithubRequest, res) {
  const { clientId, scope } = req.source.metadata;
  const redirectUri = buildRedirectUri(req.headers.tenanthost, '/api/auth/github/callback');
  const githubAuthUrl = `${GITHUB_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope || 'user:email')}`;
  res.redirect(githubAuthUrl);
}

export async function authCallbackFromGithub(req: AuthWithGithubRequest, res) {
  const { clientId } = req.source.metadata;
  const { clientSecret } = req.source.authentication;

  const authCode = extractAuthCode(req);

  if (!authCode) {
    emitFailedSocialLogin(req.headers.tenant, 'github', 'Invalid authorization code');
    return res.status(400).json({ message: 'Invalid authorization code' });
  }

  const redirectUri = buildRedirectUri(req.headers.tenanthost, '/api/auth/github/callback');

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
      emitFailedSocialLogin(req.headers.tenant, 'github', tokenData);
      res.status(tokenResponse.status).json({ message: 'Failed to get access token', details: tokenData }).end();
      return;
    }

    if (!tokenData.access_token) {
      emitFailedSocialLogin(req.headers.tenant, 'github', tokenData);
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
      emitFailedSocialLogin(req.headers.tenant, 'github', userData);
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

    // Parse name from GitHub data
    const fullName = userData.name || userData.login || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const userDataFormatted: UserData = {
      email,
      fullName,
      firstName,
      lastName,
      picture: userData.avatar_url,
    };

    // Find or create user
    const { user, shouldRedirect } = await findOrCreateUser(
      req.headers.tenant,
      userDataFormatted,
      'github',
      req.authConfig.allowSocialAutoRegistration
    );

    if (shouldRedirect) {
      res.redirect(shouldRedirect);
      return;
    }

    // Complete authentication
    await completeAuthentication(req, res, user, tokenData, 'github');
  } catch (error) {
    logger.error('failed to login via github', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
