import { NextFunction, Response, RequestHandler } from 'express';
import { AuthRequest } from '../../types';
import { showLogs } from '../../config';
import logger from '../services/logger';
import { getAuthConfiguration } from '../services/auth-configuration';

export const onlyAuthenticated = <RequestHandler>async function onlyAuthenticated(req: AuthRequest, res: Response, next: NextFunction) {
  const authConfig = await getAuthConfiguration(req.headers.tenant)
  req.authConfig = authConfig
  next()
}
