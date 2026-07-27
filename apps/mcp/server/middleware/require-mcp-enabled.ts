import type { NextFunction, Response } from 'express';
import {
  getMcpConfiguration,
  isMcpConfigurationEnabled,
} from '../services/mcp-configuration-service';
import { mcpServiceUnavailable } from '../services/mcp-json-rpc';
import type { McpRequest } from '../types';

export async function requireMcpEnabled(
  req: McpRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenant = String(req.headers.tenant || req.user?.tenant || '').trim();
  if (!tenant) {
    mcpServiceUnavailable(res, 'MCP service is disabled');
    return;
  }

  const configuration = await getMcpConfiguration(tenant);
  if (!isMcpConfigurationEnabled(configuration)) {
    mcpServiceUnavailable(res, 'MCP service is disabled for this tenant');
    return;
  }

  req.mcpConfiguration = configuration;
  next();
}

export default requireMcpEnabled;
