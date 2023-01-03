export interface IMicroFrontend {
  name: string;
  description: string;
  callbackUrl?: string;
  pluginId?: string;
  pluginApiPath?: string;
  url?: string;
  use?: string;
  fetchUrl?: string;
  active: boolean;
  opened: boolean;
  roles: string[],
  route?: {
    name: string;
    path: string;
    navBarPosition: 'top' | 'bottom';
    roles?: string[],
    group?: string;
    iconName?: string;
    iconSvg?: string;
  };
  component?: {
    page: string;
    position: 'top' | 'left' | 'right' | 'bottom';
  },
  modal?: {
    name: string;
    params: string[] | Record<string, string>; // schema / hints for props
    size: 'sm' | 'md' | 'xl' | 'full'
  }
}

export interface IPlugin {
  _id: string;
  tenant: string;
  name: string;
  description?: string;
  apiPath: string;
  user: string;
  proxyUrl: string;
  manifestUrl: string;
  callbackUrl?: string;
  authAcquire: {
    refreshTokenUrl: string;
    refreshTokenKey: string;
    accessTokenKey: string;
  };
  auth: {
    refreshTokenIdentifier?: string;
  };
  subscribedEvents: {
    source?: string,
    kind?: string,
    eventName?: string,
    hookUrl: string;
  }[]
  navBarGroups?: { key: string, name: string, iconName?: string, iconSvg?: string, priority?: number }[]
  microFrontends: IMicroFrontend[],
  injectables: { name?: string, description?: string, html: string, active: boolean }[]
}
