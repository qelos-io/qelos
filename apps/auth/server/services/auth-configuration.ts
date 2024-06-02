import { callContentService } from './content-service-api';
import { cacheManager } from './cache-manager';

export interface IAdditionalField {
  key: string
  name: string,
  label: string,
  inputType: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'radio',
  valueType: 'string' | 'number' | 'boolean',
  required: boolean,
  defaultValue?: any;
  options?: Array<{ label: string, value: string }>,
}

export interface IAuthConfigurationMetadata {
  treatUsernameAs: 'email' | 'username' | 'phone',
  showLoginPage: boolean,
  showRegisterPage: boolean,
  additionalUserFields: Array<IAdditionalField>
}

export async function getAuthConfiguration(tenant: string): Promise<IAuthConfigurationMetadata> {
  return cacheManager.wrap('auth-configuration:' + tenant, async () => {
    let value: any;
    try {
      const config = await callContentService('/api/configurations/auth-configuration', tenant);
      value = config.metadata;
    } catch {
      value = {
        treatUsernameAs: 'email',
        showLoginPage: true,
        showRegisterPage: false,
        additionalUserFields: [],
      };
    }
    return JSON.stringify(value);
  }).then(JSON.parse);
}