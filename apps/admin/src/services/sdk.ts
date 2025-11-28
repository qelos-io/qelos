import { isAdmin, isLoadingDataAsUser, authStore } from '@/modules/core/store/auth';
import QelosAdministratorSDK from '@qelos/sdk/administrator'
import { computed } from 'vue';

const extraQueryForSdk = computed(() => {
  if (authStore.isLoaded && !isAdmin.value) {
    return {};
  }
  return {
    bypassAdmin: isLoadingDataAsUser.value ? 'true' : '',
  };
});

const sdk = new QelosAdministratorSDK({
  appUrl: location.origin,
  fetch: globalThis.fetch.bind(globalThis),
  extraQueryParams() {
    return extraQueryForSdk.value;
  },
})

export default sdk;
