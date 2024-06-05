<template>
  <div v-if="wsConfig.loaded">
    <BlueprintForm :blueprint="emptyBlueprint" :submitting="store.submittingNewItem"/>
  </div>
</template>
<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import BlueprintForm from '@/modules/no-code/components/BlueprintForm.vue';
import { CRUDOperation, IBlueprint, PermissionScope } from '@qelos/global-types';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

const store = useBlueprintsStore();
const wsConfig = useWsConfiguration();
const emptyBlueprint = ref<Partial<IBlueprint>>()


watch(() => wsConfig.loaded, (loaded) => {
  if (loaded) {
    const tenantScope = wsConfig.isActive ? PermissionScope.WORKSPACE : PermissionScope.USER;

    emptyBlueprint.value = {
      name: '',
      permissionScope: tenantScope,
      permissions: [
        {
          operation: CRUDOperation.CREATE,
          scope: PermissionScope.USER,
          roleBased: ['admin', 'user'],
          workspaceRoleBased: ['admin', 'member']
        },
        {
          operation: CRUDOperation.READ,
          scope: tenantScope,
          roleBased: ['admin', 'user'],
          workspaceRoleBased: ['admin', 'member']
        },
        {
          operation: CRUDOperation.UPDATE,
          scope: PermissionScope.USER,
          roleBased: ['admin', 'user'],
          workspaceRoleBased: ['admin', 'member']
        },
        {
          operation: CRUDOperation.UPDATE,
          scope: PermissionScope.WORKSPACE,
          roleBased: ['admin', 'user'],
          workspaceRoleBased: ['admin']
        },
        {
          operation: CRUDOperation.DELETE,
          scope: PermissionScope.USER,
          roleBased: ['admin', 'user'],
          workspaceRoleBased: ['admin', 'member']
        },
        {
          operation: CRUDOperation.DELETE,
          scope: PermissionScope.WORKSPACE,
          roleBased: ['admin', 'user'],
          workspaceRoleBased: ['admin']
        },
      ],
      properties: {}
    }
  }
}, { immediate: true })
</script>
