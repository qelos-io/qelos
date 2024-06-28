import {QelosSDKOptions} from './types';
import BaseSDK from './base-sdk';
import QlAppConfigurations from './configurations';
import QlBlocks from './blocks';
import QlLayouts from './administrator/layouts';
import QlAuthentication from './authentication';
import QlWorkspaces from './workspaces';
import QlInvites from './invites';
import QlBlueprints from './blueprints';

const noExtraHeadersUrls = new Set(['/api/token/refresh', '/api/signin', '/api/signup'])

export default class QelosSDK extends BaseSDK {

  blocks: QlBlocks;
  layouts: QlLayouts;
  appConfigurations: QlAppConfigurations;
  authentication: QlAuthentication;
  workspaces: QlWorkspaces;
  invites: QlInvites;
  blueprints: QlBlueprints;

  constructor(private options: QelosSDKOptions) {
    super(options);
    this.blocks = new QlBlocks(this.options);
    this.layouts = new QlLayouts(this.options);
    this.appConfigurations = new QlAppConfigurations(this.options);
    this.authentication = new QlAuthentication(this.options);
    this.workspaces = new QlWorkspaces(this.options);
    this.invites = new QlInvites(this.options);
    this.blueprints = new QlBlueprints(this.options);

    if (!options.getAccessToken) {
      options.getAccessToken = () => this.authentication.accessToken;
    }

    if (!options.extraHeaders) {
      options.extraHeaders = async (relativeUrl: string, forceRefresh?: boolean) => {
        if (globalThis.navigator || noExtraHeadersUrls.has(relativeUrl)) {
          return {};
        }
        let token = forceRefresh ? '' : options.getAccessToken();
        if (!token) {
          await this.authentication.refreshToken();
          token = options.getAccessToken();
        }
        if (token) {
          return {authorization: 'Bearer ' + token}
        }
        return {}
      }
    }
  }

}
