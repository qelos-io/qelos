import { service } from '@qelos/api-kit';
import type { IAuthConfigurationMetadata } from '@qelos/global-types';
import { cacheManager } from './cache-manager';
import { contentServicePort, internalServicesSecret } from '../../config';

const callContentService = service('CONTENT', { port: contentServicePort });
const AUTH_CONFIGURATION_KEY = 'auth-configuration';

function internalHeaders(tenant: string) {
  return { tenant, internal_secret: internalServicesSecret };
}

const defaultAuthConfiguration: IAuthConfigurationMetadata = {
  treatUsernameAs: 'email',
  formPosition: 'right',
  showLoginPage: true,
  showRegisterPage: false,
  allowSocialAutoRegistration: true,
  allowUserTokenAuthentication: false,
  tokenAuthenticationPermissions: {
    roles: [],
    wsRoles: [],
  },
  additionalUserFields: [],
};

export function isApiKeyAuthenticationAllowed(
  authConfiguration: IAuthConfigurationMetadata,
): boolean {
  return authConfiguration.allowUserTokenAuthentication === true;
}

export async function getAuthConfiguration(tenant: string): Promise<IAuthConfigurationMetadata> {
  return cacheManager.wrap(`mcp:auth-configuration:${tenant}`, async () => {
    try {
      const response = await callContentService({
        method: 'GET',
        url: `/internal-api/configurations/${AUTH_CONFIGURATION_KEY}`,
        headers: internalHeaders(tenant),
        validateStatus: () => true,
      });

      if (response.status !== 200) {
        return JSON.stringify(defaultAuthConfiguration);
      }

      const metadata = response.data?.metadata;
      return JSON.stringify(metadata && typeof metadata === 'object' ? metadata : defaultAuthConfiguration);
    } catch {
      return JSON.stringify(defaultAuthConfiguration);
    }
  }, { ttl: 60 * 5 }).then(JSON.parse);
}
