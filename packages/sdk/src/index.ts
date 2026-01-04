import { QelosSDKOptions } from './types';
import BaseSDK from './base-sdk';
import QlAppConfigurations from './configurations';
import QlBlocks from './blocks';
import QlAuthentication from './authentication';
import QlWorkspaces from './workspaces';
import QlInvites from './invites';
import QlBlueprints from './blueprints';
import QlAI from './ai';
import QlLambdas from './lambdas';

const noExtraHeadersUrls = new Set(['/api/token/refresh', '/api/signin', '/api/signup'])

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

    const isBrowser = globalThis.navigator && globalThis.window && globalThis.document

    if (!options.getAccessToken) {
      options.getAccessToken = () => this.authentication.accessToken;
    }

    if (!options.extraHeaders) {
      options.extraHeaders = async (relativeUrl: string, forceRefresh?: boolean) => {
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

  setCustomHeader(key: string, value: string) {
    this.#customHeaders[key] = value;
  }

  removeCustomHeader(key: string) {
    delete this.#customHeaders[key];
  }
}