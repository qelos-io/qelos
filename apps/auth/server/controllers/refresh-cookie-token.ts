import { Response } from 'express';
import logger from '../services/logger';
import User from '../models/user';
import { getSignedToken, getUniqueId, setCookie, verifyToken } from '../services/tokens';
import { getCookieTokenName, getCookieTokenValue, updateToken } from '../services/users';
import { getRequestHost } from '../services/req-host';
import { cookieTokenExpiration } from '../../config';
import { AuthRequest } from '../../types';

function readCookieToken(req: AuthRequest) {
  const cookieToken = getCookieTokenValue(req);
  if (cookieToken) {
    return cookieToken;
  }
  const auth = req.headers.authorization || (req.headers as any).Authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

export async function refreshCookieToken(req: AuthRequest, res: Response) {
  const tenant = req.headers.tenant = (req.headers.tenant as string) || '0';
  const token = readCookieToken(req);

  if (!token) {
    return res.status(401).end();
  }

  try {
    const payload: any = await verifyToken(token, tenant);

    const user: any = await User.findOne({
      _id: payload.sub,
      tenant: payload.tenant,
      'tokens.tokenIdentifier': payload.tokenIdentifier,
    }).exec();

    if (!user) {
      return res.status(401).end();
    }

    const newCookieIdentifier = getUniqueId();

    await updateToken(user, 'cookie', payload, newCookieIdentifier);

    const { token: newToken } = getSignedToken(
      user,
      payload.workspace,
      newCookieIdentifier,
      String(cookieTokenExpiration)
    );

    setCookie(res, getCookieTokenName(tenant), newToken, null, getRequestHost(req));

    return res
      .status(200)
      .json({
        payload: {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            fullName: user.fullName,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            profileImage: user.profileImage,
          },
          workspace: payload.workspace || null,
          cookieToken: newToken,
        },
      })
      .end();
  } catch (e) {
    logger.error(e);
    return res.status(401).end();
  }
}
