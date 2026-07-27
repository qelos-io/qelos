import { Response } from 'express';
import User from '../../models/user';
import { AuthRequest } from '../../../types';
import { cacheManager } from '../../services/cache-manager';
import {
  getAuthCodeCacheKey,
  getAuthCodeTtlSeconds,
  isRedirectUriPermitted,
  issueMcpOAuthTokens,
  toOAuthTokenResponse,
  verifyPkceChallenge,
  type StoredMcpAuthCode,
} from '../../services/mcp-oauth-service';
import logger from '../../services/logger';

function readTokenRequestBody(body: Record<string, unknown>) {
  const read = (key: string): string | null => {
    const value = body[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  };

  return {
    grantType: read('grant_type'),
    code: read('code'),
    redirectUri: read('redirect_uri'),
    codeVerifier: read('code_verifier'),
  };
}

export async function mcpToken(req: AuthRequest, res: Response) {
  const tenant = req.headers.tenant || '0';
  const { grantType, code, redirectUri, codeVerifier } = readTokenRequestBody(req.body || {});

  if (grantType !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' }).end();
  }

  if (!code || !redirectUri || !codeVerifier) {
    return res.status(400).json({ error: 'invalid_request' }).end();
  }

  if (!req.mcpConfig?.enabled) {
    return res.status(503).json({ error: 'temporarily_unavailable' }).end();
  }

  if (!isRedirectUriPermitted(redirectUri, req.mcpConfig.permittedCallbackUrls)) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is not permitted' }).end();
  }

  const cacheKey = getAuthCodeCacheKey(code);
  let cached: string | undefined;
  try {
    cached = await cacheManager.getItem(cacheKey);
  } catch {
    cached = undefined;
  }

  if (!cached) {
    return res.status(400).json({ error: 'invalid_grant' }).end();
  }

  let stored: StoredMcpAuthCode;
  try {
    stored = JSON.parse(String(cached)) as StoredMcpAuthCode;
  } catch {
    await cacheManager.setItem(cacheKey, '', { ttl: 1 });
    return res.status(400).json({ error: 'invalid_grant' }).end();
  }

  if (stored.tenant !== tenant) {
    return res.status(400).json({ error: 'invalid_grant' }).end();
  }

  if (stored.redirectUri !== redirectUri) {
    return res.status(400).json({ error: 'invalid_grant' }).end();
  }

  if (!verifyPkceChallenge(codeVerifier, stored.codeChallenge, stored.codeChallengeMethod)) {
    return res.status(400).json({ error: 'invalid_grant' }).end();
  }

  try {
    const user = await User.findOne({ _id: stored.userId, tenant }).exec();
    if (!user) {
      await cacheManager.setItem(cacheKey, '', { ttl: 1 });
      return res.status(400).json({ error: 'invalid_grant' }).end();
    }

    await cacheManager.setItem(cacheKey, '', { ttl: 1 });

    const tokens = await issueMcpOAuthTokens(user, stored.workspace);

    return res.json(toOAuthTokenResponse(tokens)).end();
  } catch (error) {
    logger.error('failed MCP OAuth token exchange', error);
    return res.status(500).json({ error: 'server_error' }).end();
  }
}
