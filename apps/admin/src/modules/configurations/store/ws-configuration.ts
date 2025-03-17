import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import configurationsService from '@/services/configurations-service';
import { computed } from 'vue';
import { authStore } from '@/modules/core/store/auth';
import { WorkspaceConfigurationMetadata } from '@qelos/global-types'

export const useWsConfiguration = defineStore('ws-configuration', () => {
  const DEFAULT_VALUE: WorkspaceConfigurationMetadata = {
    isActive: false,
    creationPrivilegedRoles: [],
    viewMembersPrivilegedWsRoles: [],
    labels: [],
    allowNonLabeledWorkspaces: true,
    allowNonWorkspaceUsers: false,
  }
  const { result, loaded, loading, promise } = useDispatcher(() => configurationsService.getOne('workspace-configuration'), {
    metadata: DEFAULT_VALUE
  });

  const metadata = computed<WorkspaceConfigurationMetadata>(() => result.value?.metadata || DEFAULT_VALUE);
  const isActive = computed(() => !!metadata.value.isActive);

  const canUserCreateWorkspace = computed(() =>
    authStore.user?.roles &&
    (
      !metadata.value.creationPrivilegedRoles?.length ||
      metadata.value.creationPrivilegedRoles.some(role => role === '*' || authStore.user.roles.includes(role))
    )
  )

  return {
    metadata,
    loaded,
    loading,
    isActive,
    canUserCreateWorkspace,
    promise,
  }
})