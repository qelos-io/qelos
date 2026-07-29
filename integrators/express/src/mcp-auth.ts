import type QelosSDK from '@qelos/sdk';
import type { McpCallbackInput, McpTokenExchangeResult } from '@qelos/sdk';
import { parseMcpCallbackParams } from '@qelos/sdk';

export interface CompleteMcpAuthorizationCallbackOptions {
  redirectUri: string;
  codeVerifier: string;
}

/**
 * Parse an MCP OAuth callback and exchange the authorization code for tokens.
 * Use when your app owns the MCP client callback URL (e.g. a local loopback server).
 */
export async function completeMcpAuthorizationCallback(
  sdk: QelosSDK,
  input: McpCallbackInput,
  options: CompleteMcpAuthorizationCallbackOptions,
): Promise<McpTokenExchangeResult> {
  const params = parseMcpCallbackParams(input);
  if (params.error) {
    throw new Error(params.errorDescription || params.error);
  }
  if (!params.code) {
    throw new Error('missing authorization code');
  }

  return sdk.authentication.exchangeMcpAuthorizationCode({
    code: params.code,
    redirectUri: options.redirectUri,
    codeVerifier: options.codeVerifier,
  });
}

export {
  appendMcpAccessDeniedRedirect,
  buildMcpAuthorizePath,
  buildMcpAuthorizePathFromQuery,
  buildMcpConsentPageUrl,
  buildMcpLoginRedirectUrl,
  buildMcpTokenExchangeBody,
  decodeMcpOAuthStatePayload,
  parseMcpCallbackParams,
  resolveMcpLoginRedirect,
  type DecodedMcpOAuthStatePayload,
  type McpAuthorizeOptions,
  type McpCallbackInput,
  type McpCallbackParams,
  type McpPagePathOptions,
  type McpTokenExchangeOptions,
  type McpTokenExchangeResult,
} from '@qelos/sdk';
