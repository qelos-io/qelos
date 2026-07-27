import { NextFunction, Response, RequestHandler } from 'express';
import { AuthRequest } from '../../types';
import { getMcpConfiguration } from '../services/mcp-configuration';

export const mcpConfigCheck = <RequestHandler>async function mcpConfigCheck(req: AuthRequest, res: Response, next: NextFunction) {
  req.mcpConfig = await getMcpConfiguration(req.headers.tenant);
  next();
};
