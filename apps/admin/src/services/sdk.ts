import { isPrivilegedUser, isLoadingDataAsUser, authStore } from '@/modules/core/store/auth';
import QelosAdministratorSDK from '@qelos/sdk/administrator'
import { computed } from 'vue';

const extraHeadersForSdk = computed(() => {
  if (authStore.isLoaded && !isPrivilegedUser.value) {
    return {};
  }
  return {
    bypassAdmin: isLoadingDataAsUser.value ? 'true' : '',
  };
});

const sdk = new QelosAdministratorSDK({
  appUrl: location.origin,
  fetch: globalThis.fetch.bind(globalThis),
  async extraHeaders() {
    return extraHeadersForSdk.value;
  },
})

export default sdk;
