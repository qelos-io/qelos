import {QelosSDKOptions} from './types';
import BaseSDK from './base-sdk';
import QlMenus from './menus';
import QlAppConfigurations from './configurations';
import QlBlocks from './blocks';
import QlLayouts from './administrator/layouts';
import QlAuthentication from './authentication';

const noExtraHeadersUrls = new Set(['/api/token/refresh', '/api/signin', '/api/signup'])

export default class QelosSDK extends BaseSDK {

  menus: QlMenus;
  blocks: QlBlocks;
  layouts: QlLayouts;
  appConfigurations: QlAppConfigurations;
  authentication: QlAuthentication;

  constructor(private options: QelosSDKOptions) {
    super(options);
    this.menus = new QlMenus(this.options);
    this.blocks = new QlBlocks(this.options);
    this.layouts = new QlLayouts(this.options);
    this.appConfigurations = new QlAppConfigurations(this.options);
    this.authentication = new QlAuthentication(this.options);

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
