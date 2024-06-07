import { IMicroFrontend as IBaseMicroFrontend, IPlugin as IBasePlugin } from '@qelos/global-types';

export interface IMicroFrontend extends IBaseMicroFrontend {
  callbackUrl?: string;
  pluginId?: string;
  pluginApiPath?: string;
  crudData?: {
    name: string,
    identifierKey?: string,
    display: {
      name: string;
      plural: string;
      capitalized: string;
      capitalizedPlural: string;
    }
  }
}

export interface IPlugin extends IBasePlugin {
  _id: string;
  microFrontends: IMicroFrontend[],
}
