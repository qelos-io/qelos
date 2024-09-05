import QelosSDK from '../index';
import { QelosSDKOptions } from '../types';
import QlDrafts from './drafts';
import QlEvents from './events';
import QlManageLayouts from './manage-layouts';
import QlUsers from './users';
import QlManageConfigurations from './manage-configurations';
import QlAdminWorkspaces from './workspaces';
import QlManageBlueprints from './manage-blueprints';
import { QlRoles } from './roles';

export default class QelosAdministratorSDK<T = any> extends QelosSDK {
  users: QlUsers<T>;
  manageLayouts: QlManageLayouts;
  manageConfigurations: QlManageConfigurations;
  manageBlueprints: QlManageBlueprints;
  drafts: QlDrafts;
  events: QlEvents;
  adminWorkspaces: QlAdminWorkspaces;
  roles: QlRoles; // Added the roles property

  constructor(options: QelosSDKOptions) {
    super(options);
    this.users = new QlUsers<T>(options);
    this.manageLayouts = new QlManageLayouts(options);
    this.manageConfigurations = new QlManageConfigurations(options);
    this.manageBlueprints = new QlManageBlueprints(options);
    this.drafts = new QlDrafts(options);
    this.events = new QlEvents(options);
    this.adminWorkspaces = new QlAdminWorkspaces(options);
    this.roles = new QlRoles(options) //Instantiated the QlRoles class inside the constructor

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
