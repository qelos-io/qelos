import BaseSDK from '../base-sdk';
import { QelosSDKOptions } from '../types';
import { IPlugin, IEventSubscriber, IMicroFrontend, IPluginCrud, IInjectable, INavbarGroup } from '@qelos/global-types';

// Fields that are typically set by the server or not directly updatable by admin
type ServerManagedPluginFields = 'tenant' | 'user' | 'token' | 'auth' | '_id' | 'id' | 'createdAt' | 'updatedAt';

export type IPluginCreateParams = Omit<IPlugin, ServerManagedPluginFields | 'subscribedEvents' | 'microFrontends' | 'cruds' | 'injectables' | 'navBarGroups'> & {
  // Make optional arrays explicitly optional for creation if they can be omitted
  subscribedEvents?: Partial<IEventSubscriber>[];
  microFrontends?: Partial<IMicroFrontend>[];
  cruds?: Partial<IPluginCrud>[];
  injectables?: Partial<IInjectable>[];
  navBarGroups?: Partial<INavbarGroup>[];
  version?: string; // Add version if it's part of creation payload
  url?: string; // Add url if it's part of creation payload (often same as appUrl)
  proxyUrl?: string; // Allow setting proxyUrl during creation
};

export type IPluginUpdateParams = Partial<Omit<IPlugin, ServerManagedPluginFields>>;

export default class QlManagePlugins extends BaseSDK {
  private relativePath = '/api/plugins'; // Please confirm/adjust this path

  constructor(options: QelosSDKOptions) {
    super(options);
  }

  async create(pluginData: IPluginCreateParams): Promise<IPlugin> {
    return this.callJsonApi<IPlugin>(this.relativePath, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pluginData),
    });
  }

  async update(pluginId: string, pluginData: IPluginUpdateParams): Promise<IPlugin> {
    return this.callJsonApi<IPlugin>(`${this.relativePath}/${pluginId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pluginData),
    });
  }

  async remove(pluginId: string): Promise<void> {
    // callApi usually doesn't expect a JSON response, so no <void> generic needed for it.
    // It will throw on non-2xx responses.
    await this.callApi(`${this.relativePath}/${pluginId}`, { method: 'DELETE' });
  }

  async getList(): Promise<IPlugin[]> {
    return this.callJsonApi<IPlugin[]>(this.relativePath);
  }

  async getById(pluginId: string): Promise<IPlugin> {
    return this.callJsonApi<IPlugin>(`${this.relativePath}/${pluginId}`);
  }
}
