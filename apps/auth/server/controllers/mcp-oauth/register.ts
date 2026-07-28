import { Response } from 'express';
import { AuthRequest } from '../../../types';
import crypto from 'node:crypto';
import { cacheManager } from '../../services/cache-manager';

export interface McpClientRegistrationRequest {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string[];
}

export interface McpClientRegistrationResponse {
  client_id: string;
  client_id_issued_at: number;
  client_secret?: string;
  client_secret_expires_at?: number;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope?: string[];
}

const REGISTERED_CLIENT_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year

function getClientCacheKey(clientId: string): string {
  return `mcp:registered-client:${clientId}`;
}

function generateClientId(): string {
  return crypto.randomUUID();
}

function validateRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    // Allow HTTPS or HTTP loopback (localhost, 127.0.0.1, ::1)
    if (url.protocol === 'https:') {
      return true;
    }
    if (url.protocol === 'http:') {
      const hostname = url.hostname.toLowerCase();
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    }
    // Allow custom schemes (e.g., cursor://, windsurf://)
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(uri)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function mcpClientRegister(req: AuthRequest, res: Response) {
  const tenant = req.headers.tenant || '0';
  if (!tenant) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Tenant is required' }).end();
  }

  const body = req.body as McpClientRegistrationRequest;

  // Validate required fields
  if (!body.redirect_uris || !Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) {
    return res.status(400).json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris is required and must be a non-empty array' }).end();
  }

  // Validate each redirect URI
  for (const uri of body.redirect_uris) {
    if (typeof uri !== 'string' || !validateRedirectUri(uri)) {
      return res.status(400).json({ error: 'invalid_redirect_uri', error_description: `Invalid redirect URI: ${uri}` }).end();
    }
  }

  // Set defaults
  const grantTypes = body.grant_types || ['authorization_code', 'refresh_token'];
  const responseTypes = body.response_types || ['code'];
  const tokenEndpointAuthMethod = body.token_endpoint_auth_method || 'none';

  // Validate grant_types
  const validGrantTypes = ['authorization_code', 'refresh_token'];
  if (!grantTypes.every((gt) => validGrantTypes.includes(gt))) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Invalid grant_types' }).end();
  }

  // Validate response_types
  const validResponseTypes = ['code'];
  if (!responseTypes.every((rt) => validResponseTypes.includes(rt))) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Invalid response_types' }).end();
  }

  // Validate token_endpoint_auth_method
  const validAuthMethods = ['none', 'client_secret_basic', 'client_secret_post'];
  if (!validAuthMethods.includes(tokenEndpointAuthMethod)) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Invalid token_endpoint_auth_method' }).end();
  }

  // Generate client ID
  const clientId = generateClientId();
  const clientIdIssuedAt = Math.floor(Date.now() / 1000);

  // Build client registration
  const registration: McpClientRegistrationResponse = {
    client_id: clientId,
    client_id_issued_at: clientIdIssuedAt,
    redirect_uris: body.redirect_uris,
    grant_types: grantTypes,
    response_types: responseTypes,
    token_endpoint_auth_method: tokenEndpointAuthMethod,
  };

  if (body.scope) {
    registration.scope = body.scope;
  }

  // For public clients (token_endpoint_auth_method: "none"), no client_secret
  if (tokenEndpointAuthMethod !== 'none') {
    const clientSecret = crypto.randomBytes(32).toString('base64url');
    registration.client_secret = clientSecret;
    registration.client_secret_expires_at = 0; // Never expires
  }

  // Store registration in cache with tenant association
  const cacheKey = getClientCacheKey(clientId);
  await cacheManager.setItem(cacheKey, JSON.stringify({ ...registration, tenant }), { ttl: REGISTERED_CLIENT_TTL_SECONDS });

  // Also store by redirect_uri for quick lookup during authorization
  for (const uri of body.redirect_uris) {
    const redirectKey = `mcp:client-by-redirect:${tenant}:${uri}`;
    await cacheManager.setItem(redirectKey, clientId, { ttl: REGISTERED_CLIENT_TTL_SECONDS });
  }

  return res.status(201).json(registration).end();
}

export async function getRegisteredClient(clientId: string): Promise<McpClientRegistrationResponse & { tenant: string } | null> {
  const cacheKey = getClientCacheKey(clientId);
  const cached = await cacheManager.getItem(cacheKey);
  if (!cached) {
    return null;
  }
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export async function getClientByRedirectUri(tenant: string, redirectUri: string): Promise<string | null> {
  const redirectKey = `mcp:client-by-redirect:${tenant}:${redirectUri}`;
  return await cacheManager.getItem(redirectKey);
}
