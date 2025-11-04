import { AuthRequest } from '../../types';
import User from '../models/user';
import { DecryptedSourceAuthentication, getIntegrationSource } from './integration-source';
import { getRequestHost } from './req-host';
import { getCookieTokenName, getUser } from './users';
import { getSignedToken, getUniqueId, setCookie } from './tokens';
import { cookieTokenExpiration } from '../../config';
import { setEncryptedData } from './encrypted-data';
import { emitPlatformEvent } from '@qelos/api-kit';
import { getWorkspaceConfiguration } from './workspace-configuration';
import { getWorkspaceForUser } from './workspaces';
import { uploadProfileImage } from './assets-service-api';
import logger from './logger';

export type SocialProvider = 'linkedin' | 'facebook' | 'google' | 'github';

export interface SocialLoginConfig {
  provider: SocialProvider;
  authUrl: string;
  tokenUrl: string;
  redirectPath: string;
}

export interface UserData {
  email: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

export interface TokenExchangeParams {
  authCode: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Middleware to validate and attach social login source to request
 */
export function createSourceMiddleware(provider: SocialProvider) {
  return async function (req: AuthRequest & { source?: DecryptedSourceAuthentication }, res, next) {
    const sourceKey = `${provider}` as keyof typeof req.authConfig.socialLoginsSources;
    
    if (!req.authConfig.socialLoginsSources?.[sourceKey]) {
      res.status(400).json({ message: `${capitalize(provider)} social login does not exist` }).end();
      return;
    }

    const source = await getIntegrationSource(
      req.headers.tenant,
      req.authConfig.socialLoginsSources[sourceKey]
    );
    
    if (!source) {
      res.status(400).json({ message: `${capitalize(provider)} social login is not enabled` }).end();
      return;
    }
    
    req.source = source;
    next();
  };
}

/**
 * Generate redirect URI for OAuth callback
 */
export function buildRedirectUri(tenantHost: string, redirectPath: string, useHttps: boolean = true): string {
  const protocol = useHttps ? 'https' : 'http';
  const fullTenantHost = tenantHost.startsWith('http://') || tenantHost.startsWith('https://')
    ? tenantHost
    : `${protocol}://${tenantHost}`;

  return `${fullTenantHost}${redirectPath}`;
}

/**
 * Emit failed social login event
 */
export function emitFailedSocialLogin(tenant: string, provider: SocialProvider, error: any): void {
  emitPlatformEvent({
    tenant,
    user: null,
    source: 'auth',
    kind: 'failed-social-login',
    eventName: `failed-${provider}-login`,
    description: `Failed to login via ${capitalize(provider)}`,
    metadata: { error },
  });
}

/**
 * Extract authorization code from request query
 */
export function extractAuthCode(req: AuthRequest): string | null {
  const authCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  return authCode && typeof authCode === 'string' ? authCode : null;
}

/**
 * Handle user lookup or creation
 */
export async function findOrCreateUser(
  tenant: string,
  userData: UserData,
  provider: SocialProvider,
  allowAutoRegistration: boolean | undefined
): Promise<{ user: any; isNewUser: boolean; shouldRedirect?: string }> {
  try {
    // Try to find existing user
    const user = await getUser({ username: userData.email, tenant });
    user.email = userData.email;

    // Update profile image if provided
    if (userData.picture) {
      try {
        user.profileImage = await uploadProfileImage(tenant, user._id as string, userData.picture);
      } catch (error) {
        logger.error('failed to upload profile image', error);
        user.profileImage = userData.picture;
      }
    }

    // Verify email if not already verified
    if (!user.emailVerified) {
      user.emailVerified = true;
    }

    // Track social login provider
    if (!user.socialLogins?.includes(provider)) {
      user.socialLogins = user.socialLogins || [];
      user.socialLogins.push(provider);
      user.markModified('socialLogins');
    }

    await user.save();
    return { user, isNewUser: false };
  } catch {
    // User doesn't exist - check if auto-registration is allowed
    if (typeof allowAutoRegistration === 'boolean' && !allowAutoRegistration) {
      return {
        user: null,
        isNewUser: false,
        shouldRedirect: `/login?error=needs-registration&email=${encodeURIComponent(userData.email)}`,
      };
    }

    // Create new user
    const tempUserId = `profile_${Date.now()}`;
    let profileImage = '';
    
    if (userData.picture) {
      try {
        profileImage = await uploadProfileImage(tenant, tempUserId, userData.picture);
      } catch (error) {
        profileImage = userData.picture;
      }
    }

    const newUser = new User({
      tenant,
      username: userData.email,
      email: userData.email,
      fullName: userData.fullName || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      profileImage,
      emailVerified: true,
      socialLogins: [provider],
    });
    
    await newUser.save();

    // Emit user registration event
    emitPlatformEvent({
      tenant,
      user: newUser.id,
      source: 'auth',
      kind: 'signup',
      eventName: 'user-registered',
      description: `User registered via ${capitalize(provider)}`,
      metadata: {
        user: {
          tenant: newUser.tenant,
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          profileImage: newUser.profileImage,
          roles: newUser.roles,
          _id: newUser._id,
          created: newUser.created,
        },
        source: provider,
      },
    });

    return { user: newUser, isNewUser: true };
  }
}

/**
 * Complete authentication flow: store token, get workspace, set cookie
 */
export async function completeAuthentication(
  req: AuthRequest,
  res,
  user: any,
  tokenData: any,
  provider: SocialProvider
): Promise<void> {
  // Store encrypted token data
  await setEncryptedData(req.headers.tenant, `${user.id}-${provider}Token`, JSON.stringify(tokenData));

  // Get workspace if enabled
  let workspace;
  try {
    const wsConfig = await getWorkspaceConfiguration(req.headers.tenant);
    if (wsConfig.isActive) {
      workspace = await getWorkspaceForUser(
        req.headers.tenant,
        user._id,
        user.lastLogin?.workspace || user.tokens?.at(-1)?.metadata?.workspace
      );
    }
  } catch {
    logger.log(`Error getting workspace in ${provider} login`);
  }

  // Generate and set authentication token
  const requestHost = getRequestHost(req);
  const { token: newToken } = getSignedToken(user, workspace, getUniqueId(), String(cookieTokenExpiration));

  setCookie(res, getCookieTokenName(user.tenant), newToken, null, requestHost);
  res.redirect('/');
}

/**
 * Capitalize first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
