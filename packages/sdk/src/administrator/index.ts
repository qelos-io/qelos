import QelosSDK from '../index';
import {QelosSDKOptions} from '../types';
import QlDrafts from './drafts';
import QlEvents from './events';
import QlManageLayouts from './manage-layouts';
import QlUsers from './users';
import QlManageConfigurations from './manage-configurations';

export default class QelosAdministratorSDK<T = any> extends QelosSDK {
  users: QlUsers<T>;
  manageLayouts: QlManageLayouts;
  manageConfigurations: QlManageConfigurations;
  drafts: QlDrafts;
  events: QlEvents;

  constructor(options: QelosSDKOptions) {
    super(options);
    this.users = new QlUsers<T>(options);
    this.manageLayouts = new QlManageLayouts(options);
    this.manageConfigurations = new QlManageConfigurations(options);
    this.drafts = new QlDrafts(options);
    this.events = new QlEvents(options);
  }
}
