import { QelosSDKOptions } from './types.js';
import BaseSDK from './base-sdk.js';
import QlAppConfigurations from './configurations.js';
import QlBlocks from './blocks.js';
import QlAuthentication from './authentication.js';
import QlWorkspaces from './workspaces.js';
import QlInvites from './invites.js';
import QlBlueprints from './blueprints.js';
import QlBlueprintEntities from './blueprints-entities.js';
import QlAI from './ai/index.js';
import QlLambdas from './lambdas.js';
import QlPayments from './payments.js';

const noExtraHeadersUrls = new Set([
  '/api/token/refresh',
  '/api/signin',
  '/api/signup',
  '/api/auth/callback',
  '/api/auth/mcp/token',
])

export type {
  SocialCallbackInput,
  SocialAuthCallbackPayload,
  SocialProvider,
  SocialLoginOptions,
  McpAuthorizeOptions,
  McpCallbackInput,
  McpCallbackParams,
  McpTokenExchangeOptions,
  McpTokenExchangeResult,
  DecodedMcpOAuthStatePayload,
  McpPagePathOptions,
} from './authentication.js';

export type { BlueprintEntitiesRegistry } from './blueprints.js';

export {
  parseSocialCallbackRefreshToken,
  getSocialAuthSetCookieParts,
  applySocialAuthCookiesToServerResponse,
  parseMcpCallbackParams,
} from './authentication.js';

export {
  buildMcpAuthorizePath,
  buildMcpAuthorizePathFromQuery,
  buildMcpLoginRedirectUrl,
  buildMcpConsentPageUrl,
  resolveMcpLoginRedirect,
  appendMcpAccessDeniedRedirect,
  decodeMcpOAuthStatePayload,
  buildMcpTokenExchangeBody,
} from './mcp-auth.js';

export default class QelosSDK extends BaseSDK {
  #customHeaders = {}

  blocks: QlBlocks;
  appConfigurations: QlAppConfigurations;
  authentication: QlAuthentication;
  workspaces: QlWorkspaces;
  invites: QlInvites;
  blueprints: QlBlueprints;
  ai: QlAI;
  lambdas: QlLambdas;
  payments: QlPayments;

  constructor(private options: QelosSDKOptions) {
    super(options);
    this.blocks = new QlBlocks(this.options);
    this.appConfigurations = new QlAppConfigurations(this.options);
    this.authentication = new QlAuthentication(this.options);
    this.workspaces = new QlWorkspaces(this.options);
    this.invites = new QlInvites(this.options);
    this.blueprints = new QlBlueprints(this.options);
    this.ai = new QlAI(this.options);
    this.lambdas = new QlLambdas(this.options);
    this.payments = new QlPayments(this.options);

    const isBrowser = globalThis.navigator && globalThis.window && globalThis.document

    if (!options.getAccessToken) {
      options.getAccessToken = () => this.authentication.accessToken;
    }

    if (!options.extraHeaders) {
      options.extraHeaders = async (relativeUrl: string, forceRefresh?: boolean) => {
        if (options.apiToken) {
          return {
            'x-api-key': options.apiToken,
            ...(options.workspace ? { 'x-workspace': options.workspace } : {}),
            ...this.#customHeaders,
          };
        }
        if (isBrowser || noExtraHeadersUrls.has(relativeUrl)) {
          return { ...this.#customHeaders };
        }
        let token = forceRefresh ? '' : options.getAccessToken();
        if (!token) {
          await this.authentication.refreshToken();
          token = options.getAccessToken();
        }
        if (token) {
          return { authorization: 'Bearer ' + token, ...this.#customHeaders }
        }
        return { ...this.#customHeaders }
      }
    }
  }

  entities<T = any>(blueprintKey: string): QlBlueprintEntities<T> {
    return this.blueprints.entitiesOf<T>(blueprintKey);
  }

  /**
   * Selects the workspace for API-token authentication (sent as `x-workspace`).
   * Ignored by the server when the token is already bound to a workspace.
   * Pass `undefined` to clear it.
   */
  setWorkspace(workspaceId?: string) {
    this.options.workspace = workspaceId;
  }

  setCustomHeader(key: string, value: string) {
    this.#customHeaders[key] = value;
  }

  removeCustomHeader(key: string) {
    delete this.#customHeaders[key];
  }
}