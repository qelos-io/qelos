import type { NextFunction, Response } from 'express';
import { authenticateWithAuthService } from '../services/auth-service-api';
import {
  getAuthConfiguration,
  isApiKeyAuthenticationAllowed,
} from '../services/auth-configuration-service';
import { mcpUnauthorized } from '../services/mcp-json-rpc';
import type { McpRequest } from '../types';

export function extractTenantHeader(req: McpRequest): string | null {
  const tenant = req.headers.tenant;
  if (tenant === undefined || tenant === null) {
    return null;
  }

  const value = String(tenant).trim();
  return value.length > 0 ? value : null;
}

export function extractBearerAuthorization(req: McpRequest): string | undefined {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) {
    return undefined;
  }

  const value = String(header).trim();
  return value.length > 0 ? value : undefined;
}

export function extractApiKey(req: McpRequest): string | undefined {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return undefined;
  }

  const value = String(apiKey).trim();
  return value.length > 0 ? value : undefined;
}

export async function authenticateMcpRequest(
  req: McpRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenant = extractTenantHeader(req);
  if (!tenant) {
    mcpUnauthorized(res, 'Tenant header is required');
    return;
  }

  req.headers.tenant = tenant;

  const authorization = extractBearerAuthorization(req);
  const apiKey = extractApiKey(req);

  if (!authorization && !apiKey) {
    mcpUnauthorized(res);
    return;
  }

  if (apiKey) {
    const authConfiguration = await getAuthConfiguration(tenant);
    if (!isApiKeyAuthenticationAllowed(authConfiguration)) {
      mcpUnauthorized(res, 'API key authentication is not enabled for this tenant');
      return;
    }
  }

  const user = await authenticateWithAuthService(tenant, { authorization, apiKey });
  if (!user) {
    mcpUnauthorized(res, 'Invalid or expired credentials');
    return;
  }

  req.user = user;
  req.workspace = user.workspace ?? null;
  next();
}

export default authenticateMcpRequest;
