import { callContentService } from './content-service-api';
import { cacheManager } from './cache-manager';
import { IAuthConfigurationMetadata } from '@qelos/global-types';

export async function getAuthConfiguration(tenant: string): Promise<IAuthConfigurationMetadata> {
  return cacheManager.wrap('auth-configuration:' + tenant, async () => {
    let value: any;
    try {
      const config = await callContentService('/internal-api/configurations/auth-configuration', tenant);
      value = config.metadata || {
        treatUsernameAs: 'email',
        showLoginPage: true,
        showRegisterPage: false,
        additionalUserFields: [],
        socialLoginsSources: {},
      };
    } catch {
      value = {
        treatUsernameAs: 'email',
        showLoginPage: true,
        showRegisterPage: false,
        additionalUserFields: [],
        socialLoginsSources: {},
      };
    }
    return JSON.stringify(value);
  }, { ttl: 60 * 5 /* 5 minutes */ }).then(JSON.parse);
}