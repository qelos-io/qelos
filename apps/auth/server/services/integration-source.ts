import { cacheManager } from './cache-manager';
import { IIntegrationSource } from '@qelos/global-types';
import { callPluginsService } from './plugins-service-api';

export type DecryptedSourceAuthentication<T = any> = IIntegrationSource & {
  authentication: T
}

export async function getIntegrationSource(tenant: string, sourceId: string): Promise<DecryptedSourceAuthentication> {
  return cacheManager.wrap('integration-source:' + tenant + ':' + sourceId, async () => {
    let value: any;
    try {
      value = await callPluginsService(`/internal-api/integration-sources/${sourceId}`, tenant);
    } catch {
      // no integration source
    }
    return JSON.stringify(value || null);
  }).then(JSON.parse);
}