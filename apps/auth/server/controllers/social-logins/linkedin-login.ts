import { AuthRequest } from '../../../types';
import User, { UserDocument } from '../../models/user';
import { DecryptedSourceAuthentication, getIntegrationSource } from '../../services/integration-source';
import { getRequestHost } from '../../services/req-host';
import jwt from 'jsonwebtoken';
import { getCookieTokenName, getUser } from '../../services/users';
import { getSignedToken, getUniqueId, setCookie } from '../../services/tokens';
import { cookieTokenExpiration } from '../../../config';
import { getEncryptedData, setEncryptedData } from '../../services/encrypted-data';
import { emitPlatformEvent } from '@qelos/api-kit';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'

type AuthWithLinkedinRequest = AuthRequest & { source: DecryptedSourceAuthentication };

export async function getLinkedinSource(req: AuthWithLinkedinRequest, res, next) {
  if (!req.authConfig.socialLoginsSources?.linkedin) {
    res.status(400).json({ message: 'LinkedIn social login does not exist' });
    return;
  }

  const source = await getIntegrationSource(req.headers.tenant, req.authConfig.socialLoginsSources.linkedin);
  if (!source) {
    res.status(400).json({ message: 'LinkedIn social login is not enabled' });
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
      return res.status(tokenResponse.status).json({ message: 'Failed to get access token', details: tokenData });
    }

    if (!tokenData.access_token) {
      return res.status(400).json({ message: 'Failed to get access token' })
    }

    if (!tokenData.id_token) {
      return res.status(400).json({ message: 'ID token is missing in the response' })
    }

    let userData;
    if (tokenData.id_token) {
      userData = jwt.decode(tokenData.id_token);
    }

    let user: UserDocument;
    try {
      user = await getUser({ username: userData.email, tenant: req.headers.tenant });
      user.email = userData.email;
      user.profileImage = userData.picture || user.profileImage;
      await user.save();
    } catch {
      user = new User({
        tenant: req.headers.tenant,
        username: userData.email,
        email: userData.email,
        fullName: userData.name || '',
        firstName: userData.given_name || '',
        lastName: userData.family_name || '',
        profileImage: userData.picture || '',
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

    const requestHost = getRequestHost(req);
    const { token: newToken } = getSignedToken(
      user,
      null,
      getUniqueId(),
      String(cookieTokenExpiration / 1000)
    );

    setCookie(res, getCookieTokenName(user.tenant), newToken, null, requestHost);
    res.redirect('/');
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}
