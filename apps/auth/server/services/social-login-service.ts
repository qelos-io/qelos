import jwt from 'jsonwebtoken';
import { AuthRequest } from '../../types';
import User from '../models/user';
import { DecryptedSourceAuthentication, getIntegrationSource } from './integration-source';
import { getRequestHost } from './req-host';
import { getCookieTokenName, getUser } from './users';
import { getSignedToken, getUniqueId, setCookie } from './tokens';
import { cookieTokenExpiration, refreshTokenSecret } from '../../config';
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
 * Extract the raw OAuth state parameter (CSRF token / round-tripped client state) from a request.
 */
export function extractState(req: AuthRequest): string | null {
  const state = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;
  return state && typeof state === 'string' ? state : null;
}

/**
 * Extract the optional returnUrl parameter from a request. Used by SDK callers to
 * receive the issued refresh token after the OAuth round-trip.
 */
export function extractReturnUrl(req: AuthRequest): string | null {
  const value = Array.isArray(req.query.returnUrl) ? req.query.returnUrl[0] : req.query.returnUrl;
  return value && typeof value === 'string' ? value : null;
}

interface OAuthStatePayload {
  s?: string;
  ru?: string;
}

/**
 * Pack the user-supplied state and returnUrl into a single signed token to be
 * round-tripped through the OAuth provider as the `state` parameter. Returns the
 * raw user state when there is nothing extra to carry, preserving the original
 * browser-only behaviour.
 */
export function buildProviderState(req: AuthRequest): string | null {
  const userState = extractState(req);
  const returnUrl = extractReturnUrl(req);
  if (!returnUrl) {
    return userState;
  }
  const payload: OAuthStatePayload = { ru: returnUrl };
  if (userState) payload.s = userState;
  return jwt.sign(payload, refreshTokenSecret, { expiresIn: '10m' });
}

/**
 * Reverse of {@link buildProviderState}. Falls back to treating an unsigned value
 * as raw user state for backward compatibility with the original browser flow.
 */
export function unpackProviderState(req: AuthRequest): { userState: string | null; returnUrl: string | null } {
  const raw = extractState(req);
  if (!raw) {
    return { userState: null, returnUrl: null };
  }
  try {
    const decoded = jwt.verify(raw, refreshTokenSecret) as OAuthStatePayload;
    return { userState: decoded.s ?? null, returnUrl: decoded.ru ?? null };
  } catch {
    return { userState: raw, returnUrl: null };
  }
}

/**
 * Validate a returnUrl against the request's tenant host so that we never act as
 * an open redirector. Accepts:
 *  - relative paths beginning with `/` (but not protocol-relative `//`)
 *  - absolute URLs whose hostname matches `tenanthost`
 */
export function isReturnUrlSafe(returnUrl: string, tenantHost?: string): boolean {
  if (!returnUrl) return false;
  if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) return true;
  if (!tenantHost) return false;
  try {
    const target = new URL(returnUrl);
    const tenantHostname = tenantHost.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    return target.hostname === tenantHostname;
  } catch {
    return false;
  }
}

/**
 * Append the issued refresh token (and any user-supplied state) to the returnUrl
 * as query parameters.
 */
export function appendCallbackParams(returnUrl: string, refreshToken: string, userState?: string | null): string {
  const separator = returnUrl.includes('?') ? '&' : '?';
  let result = `${returnUrl}${separator}rt=${encodeURIComponent(refreshToken)}`;
  if (userState) {
    result += `&state=${encodeURIComponent(userState)}`;
  }
  return result;
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
        logger.error('failed to upload profile image for new user', error);
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
 * Complete authentication flow.
 *
 * Two modes:
 *   1. Browser mode (default): set the auth cookie and redirect to `/`.
 *   2. SDK / server-to-server mode: when a `returnUrl` was supplied at the start
 *      of the flow, issue a single-use refresh token and redirect to
 *      `<returnUrl>?rt=<refreshToken>`. The caller then exchanges that refresh
 *      token for a session via `POST /api/auth/callback?rt=<token>`.
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

  const { userState, returnUrl } = unpackProviderState(req);

  if (returnUrl && isReturnUrlSafe(returnUrl, req.headers.tenanthost)) {
    // SDK flow: issue a refresh token and hand it off via the returnUrl.
    const oauthToken = user.getToken({ authType: 'oauth', workspace });
    const refreshToken = user.getRefreshToken(oauthToken, workspace);
    await user.save();
    res.redirect(appendCallbackParams(returnUrl, refreshToken, userState));
    return;
  }

  // Browser flow: set the auth cookie and land on the app root.
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
