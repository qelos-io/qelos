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
  // get the last part from an authorization header string like "bearer token-value"
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
    
    // Check if this token was already processed (token refresh happening)
    if (await isCookieProcessed(payload.tokenIdentifier)) {
      setUserPayload(payload, req, res, next);
      return;
    }
    
    // Time to refresh the token - mark it as being processed to prevent race conditions
    await setCookieAsProcessed(payload.tokenIdentifier);
    
    const newCookieIdentifier = getUniqueId();
    
    // Try to get user with the existing token
    let user;
    try {
      user = await getUserIfTokenExists(
        payload.tenant,
        payload.sub,
        payload.tokenIdentifier
      );
    } catch (e) {
      // If user not found, check if token was processed by another request
      if (await isCookieProcessed(payload.tokenIdentifier)) {
        setUserPayload(payload, req, res, next);
        return;
      }
      // Log the error for debugging
      logger.log('Token refresh failed - user not found', {
        error: e?.code || 'UNKNOWN',
        tokenIdentifier: payload.tokenIdentifier,
        userId: payload.sub,
        tenant: payload.tenant
      });
      throw e;
    }
    
    let newToken, newPayload;
    try {
      // Update the token in database
      await updateToken(
        user,
        'cookie',
        payload,
        newCookieIdentifier
      );
      
      // Generate new token and set cookie
      const { token, payload: p } = getSignedToken(
        user,
        payload.workspace,
        newCookieIdentifier,
        String(cookieTokenExpiration)
      );
      newToken = token;
      newPayload = p;
    } catch (e) {
      // If update fails, check if another request already processed it
      if (await isCookieProcessed(payload.tokenIdentifier)) {
        setUserPayload(payload, req, res, next);
        return;
      }
      logger.log('Token update failed', {
        error: e?.code || 'UNKNOWN',
        tokenIdentifier: payload.tokenIdentifier,
        userId: payload.sub,
        tenant: payload.tenant
      });
      throw e;
    }

    if (newToken && newPayload) {
      setCookie(res, getCookieTokenName(req.headers.tenant), newToken, null, getRequestHost(req));
      setUserPayload(newPayload, req, res, next);
    } else {
      throw new Error('could not create new token and new payload for user');
    }
  } catch (e) {
    // Log the error but don't fail the request - let user continue with existing token
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

async function setCookieAsProcessed(tokenIdentifier: string) {
  await cacheManager.setItem(tokenIdentifier, 'tokenIdentifier', { ttl: processedCookieExpiration });
}

async function isCookieProcessed(tokenIdentifier: string) {
  try {
    const res = await cacheManager.getItem(tokenIdentifier);
    return !!res;
  } catch (err) {
    logger.log('failed to check isCookieProcessed', {
      error: err?.message || err,
      tokenIdentifier: tokenIdentifier.substring(0, 20) + '...'
    });
    return false;
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
  const cookie = getCookieTokenValue(req);
  const token = req.headers.authorization || req.headers.Authorization
  if (cookie) {
    return cookieVerify(req, res, next).catch(next);
  } else if (token) {
    return oAuthVerify(req, res, next).catch(next);
  } else {
    next();
  }
};
