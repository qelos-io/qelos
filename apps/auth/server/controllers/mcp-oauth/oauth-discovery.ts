import { Response } from 'express';
import { AuthRequest } from '../../../types';
import { buildOAuthDiscoveryDocument, buildTenantBaseUrl } from '../../services/mcp-oauth-service';

export async function mcpOAuthDiscovery(req: AuthRequest, res: Response) {
  const tenantHost = req.headers.tenanthost || req.headers.host;
  if (!tenantHost) {
    return res.status(400).json({ message: 'tenant host is required' }).end();
  }

  const baseUrl = buildTenantBaseUrl(String(tenantHost));
  return res.json(buildOAuthDiscoveryDocument(baseUrl)).end();
}
