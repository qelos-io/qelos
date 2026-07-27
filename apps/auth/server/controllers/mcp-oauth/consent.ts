import { Response } from 'express';
import User from '../../models/user';
import { AuthRequest } from '../../../types';
import { cacheManager } from '../../services/cache-manager';
import { getWorkspaceConfiguration } from '../../services/workspace-configuration';
import { getWorkspaceForUser } from '../../services/workspaces';
import {
  appendAccessDeniedRedirect,
  appendAuthorizationCodeRedirect,
  appendTokenRedirect,
  createAuthorizationCode,
  getAuthCodeCacheKey,
  getAuthCodeTtlSeconds,
  isRedirectUriPermitted,
  issueMcpOAuthTokens,
  unpackMcpOAuthState,
  usesPkce,
  type StoredMcpAuthCode,
} from '../../services/mcp-oauth-service';
import logger from '../../services/logger';

type ConsentBody = {
  mcp_state?: string;
  action?: 'accept' | 'deny';
  token_delivery?: 'query' | 'fragment';
};

export async function mcpConsent(req: AuthRequest, res: Response) {
  const body = req.body as ConsentBody;
  const rawState = body?.mcp_state;
  const action = body?.action;
  const tokenDelivery = body?.token_delivery === 'fragment' ? 'fragment' : 'query';

  if (!rawState || (action !== 'accept' && action !== 'deny')) {
    return res.status(400).json({ message: 'mcp_state and action are required' }).end();
  }

  const state = unpackMcpOAuthState(rawState);
  if (!state) {
    return res.status(400).json({ message: 'mcp_state is invalid or expired' }).end();
  }

  const tenant = req.headers.tenant || '0';
  if (state.t !== tenant) {
    return res.status(400).json({ message: 'tenant mismatch' }).end();
  }

  if (!req.mcpConfig?.enabled) {
    return res.status(503).json({ message: 'MCP OAuth is not enabled for this tenant' }).end();
  }

  if (!isRedirectUriPermitted(state.ru, req.mcpConfig.permittedCallbackUrls)) {
    return res.status(400).json({ message: 'redirect_uri is not permitted' }).end();
  }

  if (action === 'deny') {
    return res.redirect(appendAccessDeniedRedirect(state.ru, state.s));
  }

  try {
    const user = await User.findOne({ _id: req.userPayload.sub, tenant }).exec();
    if (!user) {
      return res.status(401).json({ message: 'user not found' }).end();
    }

    let workspace;
    try {
      const wsConfig = await getWorkspaceConfiguration(tenant);
      if (wsConfig.isActive) {
        workspace = await getWorkspaceForUser(
          tenant,
          user._id,
          req.userPayload.workspace?._id || user.lastLogin?.workspace || user.tokens?.at(-1)?.metadata?.workspace,
        );
      }
    } catch (error) {
      logger.log('Error getting workspace in MCP OAuth consent', error);
    }

    if (usesPkce(state)) {
      const code = createAuthorizationCode();
      const stored: StoredMcpAuthCode = {
        userId: String(user._id),
        tenant,
        redirectUri: state.ru,
        codeChallenge: state.cc!,
        codeChallengeMethod: state.ccm!,
        workspace,
      };

      await cacheManager.setItem(
        getAuthCodeCacheKey(code),
        JSON.stringify(stored),
        { ttl: getAuthCodeTtlSeconds() },
      );
      return res.redirect(appendAuthorizationCodeRedirect(state.ru, code, state.s));
    }

    const tokens = await issueMcpOAuthTokens(user, workspace);
    return res.redirect(appendTokenRedirect(state.ru, tokens, state.s, tokenDelivery));
  } catch (error) {
    logger.error('failed MCP OAuth consent', error);
    return res.status(500).json({ message: 'Internal server error' }).end();
  }
}
