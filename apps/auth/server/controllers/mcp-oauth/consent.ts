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
import { getRegisteredClient } from './register';

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

  logger.log('[MCP Consent] Request received:', { action, hasState: !!rawState });

  if (!rawState || (action !== 'accept' && action !== 'deny')) {
    logger.error('[MCP Consent] Invalid request: missing mcp_state or invalid action');
    return res.status(400).json({ message: 'mcp_state and action are required' }).end();
  }

  const state = unpackMcpOAuthState(rawState);
  if (!state) {
    logger.error('[MCP Consent] Invalid or expired mcp_state');
    return res.status(400).json({ message: 'mcp_state is invalid or expired' }).end();
  }

  logger.log('[MCP Consent] State decoded:', { redirectUri: state.ru, clientId: state.cid, tenant: state.t });

  const tenant = req.headers.tenant || '0';
  if (state.t !== tenant) {
    logger.error('[MCP Consent] Tenant mismatch:', { stateTenant: state.t, requestTenant: tenant });
    return res.status(400).json({ message: 'tenant mismatch' }).end();
  }

  if (!req.mcpConfig?.enabled) {
    logger.error('[MCP Consent] MCP OAuth not enabled for tenant');
    return res.status(503).json({ message: 'MCP OAuth is not enabled for this tenant' }).end();
  }

  logger.log('[MCP Consent] MCP config permittedCallbackUrls:', req.mcpConfig.permittedCallbackUrls);

  // If client_id is in state, validate against registered clients
  let redirectUriPermitted = false;
  if (state.cid) {
    logger.log('[MCP Consent] Validating registered client:', state.cid);
    const registeredClient = await getRegisteredClient(state.cid);
    if (!registeredClient || registeredClient.tenant !== tenant) {
      logger.error('[MCP Consent] Invalid client_id or tenant mismatch:', { clientId: state.cid, registeredClient: !!registeredClient, clientTenant: registeredClient?.tenant, requestTenant: tenant });
      return res.status(400).json({ message: 'Invalid client_id' }).end();
    }
    logger.log('[MCP Consent] Registered client redirect_uris:', registeredClient.redirect_uris);
    // Check if redirect_uri matches any of the client's registered redirect_uris (with wildcard support)
    redirectUriPermitted = registeredClient.redirect_uris.some((permitted) =>
      isRedirectUriPermitted(state.ru, [permitted])
    );
    logger.log('[MCP Consent] Registered client redirect URI check:', { redirectUri: state.ru, permitted: redirectUriPermitted });
    // Also check tenant's permittedCallbackUrls as fallback (for wildcard patterns)
    if (!redirectUriPermitted) {
      redirectUriPermitted = isRedirectUriPermitted(state.ru, req.mcpConfig.permittedCallbackUrls);
      logger.log('[MCP Consent] Fallback to permittedCallbackUrls:', { redirectUri: state.ru, permitted: redirectUriPermitted });
    }
  } else {
    // Fall back to permittedCallbackUrls for pre-configured clients
    logger.log('[MCP Consent] No client_id, using permittedCallbackUrls');
    redirectUriPermitted = isRedirectUriPermitted(state.ru, req.mcpConfig.permittedCallbackUrls);
    logger.log('[MCP Consent] PermittedCallbackUrls check:', { redirectUri: state.ru, permitted: redirectUriPermitted });
  }

  if (!redirectUriPermitted) {
    logger.error('[MCP Consent] Redirect URI not permitted:', { redirectUri: state.ru, permittedCallbackUrls: req.mcpConfig.permittedCallbackUrls });
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
