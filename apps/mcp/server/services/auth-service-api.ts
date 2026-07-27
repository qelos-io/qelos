import { service } from '@qelos/api-kit';
import { authServicePort } from '../../config';
import type { McpUserContext } from '../types';

const callAuthService = service('AUTH', { port: authServicePort });

export interface AuthenticateMcpCredentials {
  authorization?: string;
  apiKey?: string;
}

function normalizeUserPayload(data: Record<string, unknown>): McpUserContext | null {
  if (!data || typeof data !== 'object' || !data._id) {
    return null;
  }

  const workspace = data.workspace as McpUserContext['workspace'] | undefined;

  return {
    sub: String(data._id),
    tenant: String(data.tenant || ''),
    username: data.username ? String(data.username) : undefined,
    email: data.email ? String(data.email) : undefined,
    roles: Array.isArray(data.roles) ? data.roles.map(String) : [],
    workspace: workspace ?? null,
    isApiToken: Boolean(data.isApiToken),
    isPrivileged: Boolean(data.isPrivileged),
  };
}

export async function authenticateWithAuthService(
  tenant: string,
  credentials: AuthenticateMcpCredentials,
): Promise<McpUserContext | null> {
  const headers: Record<string, string> = { tenant };

  if (credentials.authorization) {
    headers.authorization = credentials.authorization;
  }

  if (credentials.apiKey) {
    headers['x-api-key'] = credentials.apiKey;
  }

  try {
    const response = await callAuthService({
      method: 'GET',
      url: '/api/me',
      headers,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return null;
    }

    return normalizeUserPayload(response.data);
  } catch {
    return null;
  }
}
