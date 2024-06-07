import { IMicroFrontend } from './micro-frontend';
import { IEventSubscriber } from './event-subscriber';
import { IPluginCrud } from './plugin-crud';
import { IInjectable } from './injectable';
import { INavbarGroup } from './navbar-group';

export interface IPlugin {
  tenant: string;
  name: string;
  description?: string;
  apiPath: string;
  registerUrl: string;
  user: string;
  token: string;
  proxyUrl: string;
  authAcquire: {
    refreshTokenUrl: string;
    refreshTokenKey: string;
    accessTokenKey: string;
  };
  auth: {
    refreshTokenIdentifier?: string;
  };
  manifestUrl: string,
  callbackUrl?: string,
  subscribedEvents: IEventSubscriber[]
  microFrontends: IMicroFrontend[]
  cruds: IPluginCrud[]

  injectables: IInjectable[],
  navBarGroups?: INavbarGroup[],
}