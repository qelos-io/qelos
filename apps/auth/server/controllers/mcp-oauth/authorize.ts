import { Response } from 'express';
import { AuthRequest } from '../../../types';
import {
  buildAuthorizePath,
  buildConsentPageUrl,
  buildLoginRedirectUrl,
  buildMcpOAuthState,
  isRedirectUriPermitted,
  parseAuthorizeQuery,
  validatePkceMethod,
} from '../../services/mcp-oauth-service';

export async function mcpAuthorize(req: AuthRequest, res: Response) {
  const tenant = req.headers.tenant || '0';
  const { redirectUri, state, codeChallenge, codeChallengeMethod, clientId } = parseAuthorizeQuery(req.query);

  if (!redirectUri) {
    return res.status(400).json({ message: 'redirect_uri is required' }).end();
  }

  if (!req.mcpConfig?.enabled) {
    return res.status(503).json({ message: 'MCP OAuth is not enabled for this tenant' }).end();
  }

  if (!isRedirectUriPermitted(redirectUri, req.mcpConfig.permittedCallbackUrls)) {
    return res.status(400).json({ message: 'redirect_uri is not permitted' }).end();
  }

  if (codeChallenge && !validatePkceMethod(codeChallengeMethod)) {
    return res.status(400).json({ message: 'code_challenge_method must be S256 or plain' }).end();
  }

  const authorizeParams = {
    redirectUri,
    state,
    codeChallenge,
    codeChallengeMethod,
    clientId,
    tenant,
  };

  const authorizePath = buildAuthorizePath(authorizeParams);

  if (!req.userPayload) {
    return res.redirect(buildLoginRedirectUrl(authorizePath));
  }

  const packedState = buildMcpOAuthState(authorizeParams);
  return res.redirect(buildConsentPageUrl(packedState));
}
