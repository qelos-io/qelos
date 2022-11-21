import QelosSDK from '../index';
import {QelosSDKOptions} from '../types';
import GpUsers from './users';
import GpManageLayouts from '../manage-layouts';
import GpDrafts from './drafts';
import QlEvents from './events';

export default class QelosAdministratorSDK<T = any> extends QelosSDK {
  users: GpUsers<T>;
  manageLayouts: GpManageLayouts;
  drafts: GpDrafts;
  events: QlEvents;

  constructor(options: QelosSDKOptions) {
    super(options);
    this.users = new GpUsers<T>(options);
    this.manageLayouts = new GpManageLayouts(options);
    this.drafts = new GpDrafts(options);
    this.events = new QlEvents(options);
  }
}
