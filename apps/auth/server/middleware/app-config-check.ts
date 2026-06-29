import { NextFunction, Response, RequestHandler } from 'express';
import { AuthRequest } from '../../types';
import { getAppConfiguration } from '../services/app-configuration';

export const appConfigCheck = <RequestHandler>async function appConfigCheck(req: AuthRequest, res: Response, next: NextFunction) {
  req.appConfig = await getAppConfiguration(req.headers.tenant);
  next();
};
