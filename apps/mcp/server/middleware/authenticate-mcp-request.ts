import type { NextFunction, Response } from 'express';
import { authenticateWithAuthService } from '../services/auth-service-api';
import {
  getAuthConfiguration,
  isApiKeyAuthenticationAllowed,
} from '../services/auth-configuration-service';
import { mcpUnauthorized } from '../services/mcp-json-rpc';
import type { McpRequest } from '../types';

function getRequestBaseUrl(req: McpRequest): string {
  const host = String(req.headers.tenanthost || req.headers.host || 'localhost').replace(/\/$/, '');
  const protocol = String(req.headers['x-forwarded-proto'] || 'http');
  return `${protocol}://${host}`;
}

function buildAuthRequiredData(req: McpRequest) {
  const baseUrl = getRequestBaseUrl(req);
  const discoveryUrl = `${baseUrl}/.well-known/oauth-authorization-server`;
  const configuredLoginUrl = req.mcpConfiguration?.loginUrl?.trim();
  const defaultLoginUrl = `${baseUrl}/login`;
  return {
    loginUrl: configuredLoginUrl || defaultLoginUrl,
    authorizationServer: discoveryUrl,
  };
}

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
    const authData = buildAuthRequiredData(req);
    mcpUnauthorized(res, 'Authentication required', authData);
    return;
  }

  if (apiKey) {
    const authConfiguration = await getAuthConfiguration(tenant);
    if (!isApiKeyAuthenticationAllowed(authConfiguration)) {
      mcpUnauthorized(res, 'API key authentication is not enabled for this tenant', buildAuthRequiredData(req));
      return;
    }
  }

  const user = await authenticateWithAuthService(tenant, { authorization, apiKey });
  if (!user) {
    mcpUnauthorized(res, 'Invalid or expired credentials', buildAuthRequiredData(req));
    return;
  }

  req.user = user;
  req.workspace = user.workspace ?? null;
  next();
}

export default authenticateMcpRequest;
