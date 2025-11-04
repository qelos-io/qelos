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
        formPosition: 'right',
        showLoginPage: true,
        showRegisterPage: false,
        allowSocialAutoRegistration: true,
        additionalUserFields: [],
        socialLoginsSources: {
          linkedin: null,
          facebook: null,
          google: null,
          github: null,
        },
      };
    } catch {
      value = {
        treatUsernameAs: 'email',
        formPosition: 'right',
        showLoginPage: true,
        showRegisterPage: false,
        allowSocialAutoRegistration: true,
        additionalUserFields: [],
        socialLoginsSources: {
          linkedin: null,
          facebook: null,
          google: null,
          github: null,
        },
      };
    }
    return JSON.stringify(value);
  }, { ttl: 60 * 5 /* 5 minutes */ }).then(JSON.parse);
}