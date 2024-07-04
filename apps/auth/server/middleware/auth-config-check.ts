import { NextFunction, Response, RequestHandler } from 'express';
import { AuthRequest } from '../../types';
import { getAuthConfiguration } from '../services/auth-configuration';

export const authConfigCheck = <RequestHandler>async function authConfigCheck(req: AuthRequest, res: Response, next: NextFunction) {
  const authConfig = await getAuthConfiguration(req.headers.tenant)
  if (!authConfig) {
    res.status(403).json({ message: 'tenant auth config does not exist' }).end()
    return;
  }
  req.authConfig = authConfig
  next()
}
