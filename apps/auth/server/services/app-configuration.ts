import { callContentService } from './content-service-api';
import { cacheManager } from './cache-manager';
import { IAppConfigurationMetadata } from '@qelos/global-types';

export async function getAppConfiguration(tenant: string): Promise<IAppConfigurationMetadata> {
  return cacheManager.wrap('app-configuration:' + tenant, async () => {
    try {
      const config = await callContentService('/internal-api/configurations/app-configuration', tenant);
      return JSON.stringify(config.metadata || { websiteUrls: [] });
    } catch {
      return JSON.stringify({ websiteUrls: [] });
    }
  }, { ttl: 60 * 5 /* 5 minutes */ }).then(JSON.parse);
}
