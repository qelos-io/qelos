import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import configurationsService from '@/services/configurations-service';
import { IAuthConfigurationMetadata } from '@qelos/global-types';

export const useAuthConfiguration = defineStore('auth-configuration', () => {
  const DEFAULT_VALUE: IAuthConfigurationMetadata = {
    treatUsernameAs: 'email',
    formPosition: 'right',
    showLoginPage: true,
    showRegisterPage: false,
    allowSocialAutoRegistration: true,
    additionalUserFields: [],
    socialLoginsSources: {},
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