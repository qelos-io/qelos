import logger from '../services/logger';
import {UserDocument, UserModel} from '../models/user';

const User = require('../models/user')
const { verifyRefreshToken } = require('../services/tokens')

export async function refreshToken (req, res) {
  if (!req.headers.authorization) {
    return res.status(401).end()
  }

  // get the last part from a authorization header string like "bearer token-value"
  const token = req.headers.authorization.split(' ')[1]
  const tenant = req.headers.tenant = req.headers.tenant || '0'

  try {
    const decoded = await verifyRefreshToken(token, tenant)
    const user: UserDocument & UserModel = await User.findOne({ _id: decoded.sub, tenant: decoded.tenant })

    if (!user.tokens.some(token => token.tokenIdentifier === decoded.tokenIdentifier)) {
      throw new Error('refresh token not valid')
    }

    user.tokens = user.tokens.filter(token => token.tokenIdentifier !== decoded.tokenIdentifier);

    const newToken = user.getToken('oauth');
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
