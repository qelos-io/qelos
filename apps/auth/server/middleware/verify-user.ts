import {
  verifyToken,
  getUniqueId,
  setCookie,
  getSignedToken,
} from '../services/tokens';
import {getUserIfTokenExists, updateToken} from '../services/users';
import {
  cookieTokenExpiration,
  privilegedRoles,
  cookieTokenVerificationTime,
  processedCookieExpiration, showLogs
} from '../../config';
import {NextFunction, RequestHandler, Response} from 'express';
import {AuthRequest} from '../../types';
import {cacheManager} from '../services/cache-manager';
import {getRequestHost} from '../services/req-host';
import logger from '../services/logger';
import Logger from '../services/logger';

function oAuthVerify(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  // get the last part from an authorization header string like "bearer token-value"
  const tokenHeader = req.headers.authorization || req.headers.Authorization

  const token = tokenHeader!.split(' ')[1];
  const tenant = (req.headers.tenant = req.headers.tenant as string || '0');

  return verifyToken(token, tenant)
    .then((payload) => setUserPayload(payload, req, next))
    .catch(() => {
      next();
    });
}

async function cookieVerify(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // get the last part from an authorization header string like "bearer token-value"
  const token = req.signedCookies.token || req.cookies.token;
  const tenant = (req.headers.tenant = req.headers.tenant as string || '0');

  if (!tenant && showLogs) {
    logger.log('CookieVerify requires a tenant', {
      url: req.url,
      tenanthost: req.headers.tenanthost,
    });
  }

  try {
    const payload: any = await verifyToken(token, tenant);
    const created = Number(payload.tokenIdentifier?.split(':')[0]);
    if ((Date.now() - created < cookieTokenVerificationTime) || await isCookieProcessed(payload.tokenIdentifier)) {
      setUserPayload(payload, req, next);
      return;
    }
    const newCookieIdentifier = getUniqueId();
    let user;
    try {
      user = await getUserIfTokenExists(
        payload.tenant,
        payload.sub,
        payload.tokenIdentifier
      )
    } catch (e) {
      if (await isCookieProcessed(payload.tokenIdentifier)) {
        setUserPayload(payload, req, next);
        return;
      } else {
        throw e;
      }
    }
    setCookieAsProcessed(payload.tokenIdentifier).catch(Logger.log);
    await updateToken(
      user,
      'cookie',
      payload.tokenIdentifier,
      newCookieIdentifier
    );
    const {token: newToken, payload: newPayload} = getSignedToken(
      user,
      newCookieIdentifier,
      String(cookieTokenExpiration / 1000)
    );

    setCookie(res, newToken, null, getRequestHost(req));
    setUserPayload(newPayload, req, next);
  } catch (e) {
    logger.log('failed to handle cookie verification', e)
    next();
  }
}

async function setCookieAsProcessed(tokenIdentifier: string) {
  await cacheManager.setItem(tokenIdentifier, 'tokenIdentifier', {ttl: processedCookieExpiration});
}

async function isCookieProcessed(tokenIdentifier: string) {
  try {
    const res = await cacheManager.getItem(tokenIdentifier);
    return !!res;
  } catch (err) {
    logger.log('failed to check isCookieProcessed', err);
    return false;
  }
}

function setUserPayload(payload: any, req: AuthRequest, next: NextFunction) {
  req.userPayload = payload;
  req.userPayload.isPrivileged = payload.roles.some((role: string) =>
    privilegedRoles.includes(role)
  );
  next();
}

/**
 *  The Auth Checker middleware function.
 */
export default <RequestHandler>function verifyUser(req: AuthRequest, res: Response, next: NextFunction) {
  const cookie = req.cookies.token || req.signedCookies.token;
  const token = req.headers.authorization || req.headers.Authorization
  if (cookie) {
    cookieVerify(req, res, next).catch(next);
  } else if (token) {
    oAuthVerify(req, res, next).catch(next);
  } else {
    next();
  }
};
