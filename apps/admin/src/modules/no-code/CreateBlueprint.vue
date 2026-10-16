<template>
  <BlueprintEditor
    :blueprint="emptyBlueprint"
    :submitting="store.submittingNewItem"
    :loading="!wsConfig.loaded"
    :save="create"
    @saved="onSaved"
  />
</template>
<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import BlueprintEditor from '@/modules/no-code/components/editor/BlueprintEditor.vue';
import {
  BlueprintPropertyType,
  CRUDOperation,
  EntityIdentifierMechanism,
  IBlueprint,
  PermissionScope,
} from '@qelos/global-types';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

const router = useRouter();
const store = useBlueprintsStore();
const wsConfig = useWsConfiguration();
const emptyBlueprint = ref<Partial<IBlueprint>>({});

const create = (payload: Partial<IBlueprint>) => store.create(payload);

function onSaved(data: IBlueprint) {
  store.retry();
  router.push({ name: 'editBlueprint', params: { blueprintIdentifier: data.identifier } });
}

const grant = (operation: CRUDOperation, scope: PermissionScope, workspaceRoleBased = ['admin', 'member']) => ({
  operation,
  scope,
  roleBased: ['admin', 'user'],
  workspaceRoleBased,
  workspaceLabelsBased: ['*'],
});

watch(() => wsConfig.loaded, (loaded) => {
  if (!loaded) return;
  const readScope = wsConfig.isActive ? PermissionScope.WORKSPACE : PermissionScope.USER;
  emptyBlueprint.value = {
    name: '',
    description: '',
    entityIdentifierMechanism: EntityIdentifierMechanism.OBJECT_ID,
    permissionScope: readScope,
    permissions: [
      grant(CRUDOperation.CREATE, PermissionScope.USER),
      grant(CRUDOperation.READ, readScope),
      grant(CRUDOperation.UPDATE, PermissionScope.USER),
      grant(CRUDOperation.UPDATE, PermissionScope.WORKSPACE, ['admin']),
      grant(CRUDOperation.DELETE, PermissionScope.USER),
      grant(CRUDOperation.DELETE, PermissionScope.WORKSPACE, ['admin']),
    ],
    properties: {
      title: {
        title: 'Title',
        type: BlueprintPropertyType.STRING,
        description: 'The title of the entity',
        required: true,
      },
    },
    updateMapping: {},
    relations: [],
    limitations: [],
  };
}, { immediate: true });
</script>
