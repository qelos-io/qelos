import { isAdmin, isLoadingDataAsUser, authStore } from '@/modules/core/store/auth';
import { setImpersonation, clearImpersonation as clearImpersonationState, isImpersonating, impersonatedUser, impersonatedWorkspace } from '@/modules/core/store/impersonation';
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

// Sync SDK with impersonation state on initialization
if (isImpersonating.value) {
  if (impersonatedUser.value) {
    sdk.impersonateUser(impersonatedUser.value._id, impersonatedWorkspace.value?._id);
  }
}

// Wrapper methods for impersonation that also manage localStorage
export const impersonateUser = (user: { _id: string; name?: string; email?: string }, workspace?: { _id: string; name: string }) => {
  // Use the existing SDK method with string IDs
  sdk.impersonateUser(user._id, workspace?._id);
  
  // Also update our store state
  setImpersonation(user, workspace);
};

export const clearImpersonation = () => {
  // Use the existing SDK method
  sdk.clearImpersonation();
  
  // Also update our store state
  clearImpersonationState();
};

export const getImpersonationState = () => ({
  isImpersonating: isImpersonating.value,
  user: impersonatedUser.value,
  workspace: impersonatedWorkspace.value
});

export default sdk;
