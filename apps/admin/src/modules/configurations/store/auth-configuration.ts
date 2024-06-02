import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import configurationsService from '@/services/configurations-service';

export interface IAuthConfigurationMetadata {
  treatUsernameAs: 'email' | 'username' | 'phone',
  showLoginPage: boolean,
  showRegisterPage: boolean,
  additionalUserFields: Array<{
    key: string
    name: string,
    label: string,
    inputType: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'radio',
    valueType: 'string' | 'number' | 'boolean',
    required: boolean,
    defaultValue: any,
    options?: Array<{ label: string, value: string }>,
  }>
}

export const useAuthConfiguration = defineStore('auth-configuration', () => {
  const DEFAULT_VALUE: IAuthConfigurationMetadata = {
    treatUsernameAs: 'email',
    showLoginPage: true,
    showRegisterPage: false,
    additionalUserFields: [],
  }
  const { result, loaded, loading } = useDispatcher(() => configurationsService.getOne('auth-configuration'), {
    metadata: DEFAULT_VALUE
  });

  const metadata = computed<IAuthConfigurationMetadata>(() => result.value?.metadata || DEFAULT_VALUE);

  return {
    metadata,
    loaded,
    loading,
  }
})