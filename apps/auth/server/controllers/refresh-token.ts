import logger from '../services/logger';
import User, {UserDocument, UserModel} from '../models/user';
import {verifyRefreshToken} from '../services/tokens';

export async function refreshToken(req, res) {
  if (!req.headers.authorization) {
    return res.status(401).end()
  }

  // get the last part from an authorization header string like "bearer token-value"
  const token = req.headers.authorization.split(' ')[1]
  const tenant = req.headers.tenant = req.headers.tenant || '0'

  try {
    const decoded = await verifyRefreshToken(token, tenant) as any;
    const user: UserDocument & UserModel = await User.findOne({_id: decoded.sub, tenant: decoded.tenant}).exec() as any

    if (!user.tokens.some(token => token.tokenIdentifier === decoded.tokenIdentifier)) {
      throw new Error('refresh token not valid')
    }

    user.tokens = user.tokens.filter(token => token.tokenIdentifier !== decoded.tokenIdentifier);

    const newToken = user.getToken({authType: 'oauth', workspace: decoded.workspace ? {_id: decoded.workspace} : null});
    const refreshToken = user.getRefreshToken(newToken);

    await user.save()

    return res.json({
      payload: {
        user: {
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
        token: newToken,
        refreshToken,
      }
    }).end()
  } catch (e) {
    logger.error(e);
    res.status(401).end()
  }
}
