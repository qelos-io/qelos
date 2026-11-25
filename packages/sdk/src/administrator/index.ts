import QelosSDK from '../index.js';
import { QelosSDKOptions } from '../types.js';
import QlDrafts from './drafts.js';
import QlEvents from './events.js';
import QlUsers from './users.js';
import QlManageConfigurations from './manage-configurations.js';
import QlAdminWorkspaces from './workspaces.js';
import QlManageBlueprints from './manage-blueprints.js';
import { QlRoles } from './roles.js';
import QlIntegrationSources from './integration-sources.js';
import QlManagePlugins from './manage-plugins.js';
import QlComponents from './components.js';
import QlScripts from './scripts.js';
import QlIntegrations from './integrations.js';
import QlManageLambdas from './admin-lambdas.js';
import QlPaymentsAdmin from './payments.js';


export default class QelosAdministratorSDK<T = any> extends QelosSDK {
  manageLambdas: QlManageLambdas;
  users: QlUsers<T>;
  manageConfigurations: QlManageConfigurations;
  manageBlueprints: QlManageBlueprints;
  drafts: QlDrafts;
  events: QlEvents;
  adminWorkspaces: QlAdminWorkspaces;
  roles: QlRoles;
  integrationSources: QlIntegrationSources;
  managePlugins: QlManagePlugins;
  /** @deprecated use `scripts`, which accepts both scripts and components */
  components: QlComponents;
  scripts: QlScripts;
  integrations: QlIntegrations;
  managePayments: QlPaymentsAdmin;

  constructor(options: QelosSDKOptions) {
    super(options);
    this.manageLambdas = new QlManageLambdas(options);
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
    this.scripts = new QlScripts(options);
    this.integrations = new QlIntegrations(options);
    this.managePayments = new QlPaymentsAdmin(options);

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