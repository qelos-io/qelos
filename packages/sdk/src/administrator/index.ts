import QelosSDK from '../index';
import { QelosSDKOptions } from '../types';
import QlDrafts from './drafts';
import QlEvents from './events';
import QlUsers from './users';
import QlManageConfigurations from './manage-configurations';
import QlAdminWorkspaces from './workspaces';
import QlManageBlueprints from './manage-blueprints';
import { QlRoles } from './roles';
import QlIntegrationSources from './integration-sources';
import QlManagePlugins from './manage-plugins';
import QlComponents from './components';
import QlIntegrations from './integrations';


export default class QelosAdministratorSDK<T = any> extends QelosSDK {
  users: QlUsers<T>;
  manageConfigurations: QlManageConfigurations;
  manageBlueprints: QlManageBlueprints;
  drafts: QlDrafts;
  events: QlEvents;
  adminWorkspaces: QlAdminWorkspaces;
  roles: QlRoles;
  integrationSources: QlIntegrationSources;
  managePlugins: QlManagePlugins;
  components: QlComponents;
  integrations: QlIntegrations;

  constructor(options: QelosSDKOptions) {
    super(options);
    this.users = new QlUsers<T>(options);
    this.manageConfigurations = new QlManageConfigurations(options);
    this.manageBlueprints = new QlManageBlueprints(options);
    this.drafts = new QlDrafts(options);
    this.events = new QlEvents(options);
    this.adminWorkspaces = new QlAdminWorkspaces(options);
    this.roles = new QlRoles(options);
    this.integrationSources = new QlIntegrationSources(options);
    this.managePlugins = new QlManagePlugins(options);
    this.components = new QlComponents(options);
    this.integrations = new QlIntegrations(options);

    if (!options.extraQueryParams) {
      options.extraQueryParams = () => ({
        bypassAdmin: 'true'
      })
    }
  }

  impersonateUser(userId: string, workspaceId?: string) {
    this.setCustomHeader('x-impersonate-user', userId);
    if (workspaceId) {
      this.setCustomHeader('x-impersonate-workspace', workspaceId);
    }
  }

  clearImpersonation() {
    this.removeCustomHeader('x-impersonate-user');
    this.removeCustomHeader('x-impersonate-workspace');
  }
}
