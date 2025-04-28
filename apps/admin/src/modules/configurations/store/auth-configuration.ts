import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import configurationsService from '@/services/configurations-service';
import { IAuthConfigurationMetadata } from '@qelos/global-types';

// Helper functions mergeDeep and isObject remain the same
function mergeDeep(target: any, source: any): any {
  // Create a shallow clone of target to avoid mutating the original
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        // Case 1: Property is an object
        if (!(key in target)) {
          // If target doesn't have this key, simply assign the object
          Object.assign(output, { [key]: source[key] });
        } else {
          // If both target and source have this key, merge recursively
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        // Case 2: Property is a primitive/array - overwrite directly
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export const useAuthConfiguration = defineStore('auth-configuration', () => {
  // Default values for the auth configuration metadata.
  const DEFAULT_VALUE: IAuthConfigurationMetadata = {
    treatUsernameAs: 'email',
    formPosition: 'right',
    showLoginPage: true,
    showRegisterPage: false,
    allowSocialAutoRegistration: true,
    additionalUserFields: [],
    socialLoginsSources: {},
    slots: {},
    loginTitle: '',
    backgroundImage: undefined,
    disableUsernamePassword: false // Assumes IAuthConfigurationMetadata is updated
  };

  // Create a reactive reference to store the current tokenId
  const tokenId = ref<string | null>(null);

  //  Load the STANDARD 'auth-configuration' 
  const {
    result: defaultResult,
    loaded: defaultLoaded,
    loading: defaultLoading

  } = useDispatcher(
    () => configurationsService.getOne('auth-configuration'),
    { metadata: DEFAULT_VALUE }
  );

  //  Load the SPECIFIC 'auth-configuration-tokenId' ( if tokenId is set) 
  const specificConfigKey = computed(() => {
    return tokenId.value ? `auth-configuration-${tokenId.value}` : null;
  });

  const {
    result: specificResult,
    loaded: specificLoaded,
    loading: specificLoading,
    retry: retrySpecificLoad

  } = useDispatcher(
    async () => {
      const key = specificConfigKey.value;
      if (!key) {
        return null;
      }
      try {
        // Return the result, matching type T
        return await configurationsService.getOne(key);
      } catch (error: any) {
        if (error?.response?.status === 404) {

          return null;
        }
        throw error;
      }
    },
    null, // defaultValue (null)
    true // lazy: true 

  );

  // Watch for changes in the specificConfigKey.
  watch(specificConfigKey, (newKey, oldKey) => {

    if (newKey !== oldKey && newKey) {
      retrySpecificLoad();
    } else if (!newKey && oldKey) {
      specificResult.value = null; 

    }
  }, { immediate: true });

  // Computed property for the FINAL MERGED metadata.
  const metadata = computed<IAuthConfigurationMetadata>(() => {
    let mergedConfig: IAuthConfigurationMetadata = { ...DEFAULT_VALUE };

    const defaultMeta = defaultResult.value?.metadata;
    if (defaultMeta) {
      mergedConfig = mergeDeep(mergedConfig, defaultMeta);
    }

    const specificMeta = specificResult.value?.metadata;
    if (specificMeta) {
      mergedConfig = mergeDeep(mergedConfig, specificMeta);
    }
    return mergedConfig;
  });

  const loaded = computed(() => {
    const defaultDone = defaultLoaded.value;
    const specificDone = !specificConfigKey.value || specificLoaded.value;
    return defaultDone && specificDone;
  });

  const loading = computed(() => {
    const defaultInProgress = defaultLoading.value;
    const specificInProgress = !!specificConfigKey.value && specificLoading.value;
    return defaultInProgress || specificInProgress;
  });

  // Action function to set the tokenId from outside
  function loadForToken(id: string | null) {
    tokenId.value = id;
  }

  return {
    metadata,
    loaded,
    loading,
    loadForToken,
  }
});