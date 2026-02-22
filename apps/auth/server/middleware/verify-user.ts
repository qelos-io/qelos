import {
  verifyToken,
  getUniqueId,
  setCookie,
  getSignedToken,
} from '../services/tokens';
import { getCookieTokenName, getCookieTokenValue, getUserIfTokenExists, updateToken } from '../services/users';
import {
  cookieTokenExpiration,
  privilegedRoles,
  cookieTokenVerificationTime,
  processedCookieExpiration, showLogs,
  basicTenant
} from '../../config';
import { NextFunction, RequestHandler, Response } from 'express';
import { AuthRequest } from '../../types';
import { cacheManager } from '../services/cache-manager';
import { getRequestHost } from '../services/req-host';
import logger from '../services/logger';
import { authenticateByApiToken } from '../services/api-tokens';

function oAuthVerify(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // get the last part from an authorization header string like "bearer token-value"
  const tokenHeader = req.headers.authorization || req.headers.Authorization

  const token = tokenHeader!.split(' ')[1];
  const tenant = (req.headers.tenant = req.headers.tenant as string || '0');

  return verifyToken(token, tenant)
    .then((payload) => setUserPayload(payload, req, res, next))
    .catch(() => {
      if (token && tenant) {
        res.status(401).json({ message: 'authorization token is not valid.' }).end();
        return;
      }
      next();
    });
}

async function cookieVerify(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const tenant = (req.headers.tenant = req.headers.tenant as string || '0');
  const token = getCookieTokenValue(req);

  if (!token) {
    next();
    return;
  }

  if (!tenant && showLogs) {
    logger.log('CookieVerify requires a tenant', {
      url: req.url,
      tenanthost: req.headers.tenanthost,
    });
  }

  try {
    const payload: any = await verifyToken(token, tenant);
    const created = Number(payload.tokenIdentifier?.split(':')[0]);

    // If token is still fresh, no need to verify further
    const tokenAge = Date.now() - created;
    if (tokenAge < cookieTokenVerificationTime) {
      setUserPayload(payload, req, res, next);
      return;
    }

    // Atomically try to acquire exclusive refresh lock for this token.
    // Only one request wins — all others use the existing (valid) JWT payload.
    const acquiredLock = await tryAcquireRefreshLock(payload.tokenIdentifier);
    if (!acquiredLock) {
      setUserPayload(payload, req, res, next);
      return;
    }

    // We won the lock — proceed with token refresh
    const user = await getUserIfTokenExists(
      payload.tenant,
      payload.sub,
      payload.tokenIdentifier
    );

    const newCookieIdentifier = getUniqueId();

    await updateToken(
      user,
      'cookie',
      payload,
      newCookieIdentifier
    );

    const { token: newToken, payload: newPayload } = getSignedToken(
      user,
      payload.workspace,
      newCookieIdentifier,
      String(cookieTokenExpiration)
    );

    if (newToken && newPayload) {
      setCookie(res, getCookieTokenName(req.headers.tenant), newToken, null, getRequestHost(req));
      setUserPayload(newPayload, req, res, next);
    } else {
      throw new Error('could not create new token and new payload for user');
    }
  } catch (e) {
    logger.log('Cookie verification failed, continuing without auth', {
      error: e?.code || e?.message || 'UNKNOWN',
      url: req.url,
      tenant: req.headers.tenant,
      hasCookie: !!getCookieTokenValue(req),
      hasAuth: !!(req.headers.authorization || req.headers.Authorization)
    });
    next();
  }
}

async function tryAcquireRefreshLock(tokenIdentifier: string): Promise<boolean> {
  try {
    return await cacheManager.setIfNotExists(tokenIdentifier, 'locked', { ttl: processedCookieExpiration });
  } catch (err) {
    logger.log('failed to acquire refresh lock', {
      error: err?.message || err,
      tokenIdentifier: tokenIdentifier.substring(0, 20) + '...'
    });
    // If Redis is down, allow the refresh attempt to avoid blocking all users
    return true;
  }
}

async function apiKeyVerify(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  const tenant = (req.headers.tenant = req.headers.tenant as string || '0');

  try {
    const result = await authenticateByApiToken(tenant, apiKey);
    if (!result) {
      res.status(401).json({ message: 'Invalid or expired API token' }).end();
      return;
    }

    const { user, workspace } = result;
    const payload = {
      sub: user._id.toString(),
      tenant: user.tenant,
      username: user.username,
      email: user.email,
      phone: user.phone,
      name: user.fullName,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate,
      profileImage: user.profileImage,
      roles: user.roles,
      workspace: workspace ? {
        _id: workspace._id.toString(),
        name: workspace.name,
        roles: workspace.roles,
        labels: workspace.labels,
      } : undefined,
      isApiToken: true,
    };

    setUserPayload(payload, req, res, next);
  } catch (error) {
    res.status(401).json({ message: 'API token authentication failed' }).end();
  }
}

function setUserPayload(payload: any, req: AuthRequest, res: Response, next: NextFunction) {
  req.userPayload = payload;
  req.userPayload.isPrivileged = payload.roles.some((role: string) => {
    return privilegedRoles.includes(role)
  });
  req.activeWorkspace = payload.workspace;

  if (req.headers.tenant === basicTenant && req.userPayload.isPrivileged &&(req.get('x-impersonate-tenant') || req.query.impersonateTenant)) {
    const impersonatedTenant = req.get('x-impersonate-tenant') || req.query.impersonateTenant?.toString();
    logger.log('impersonating tenant', impersonatedTenant);
    req.headers.tenant = impersonatedTenant;
    res.set('x-qelos-tenant', impersonatedTenant);
  }

  next();
}

/**
 *  The Auth Checker middleware function.
 */
export default <RequestHandler>function verifyUser(req: AuthRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  const cookie = getCookieTokenValue(req);
  const token = req.headers.authorization || req.headers.Authorization
  if (apiKey) {
    return apiKeyVerify(req, res, next).catch(next);
  } else if (cookie) {
    return cookieVerify(req, res, next).catch(next);
  } else if (token) {
    return oAuthVerify(req, res, next).catch(next);
  } else {
    next();
  }
};
