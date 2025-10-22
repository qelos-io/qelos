<template>
  <div>
    <WorkspaceForm v-if="wsConfig.loaded" :ws-config="config" :workspace='{}' @submitted="save"/>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { WorkspaceConfigurationMetadata } from '@qelos/global-types';
import { useCreateWorkspace } from './compositions/workspaces'
import WorkspaceForm from './components/WorkspaceForm.vue'
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

const wsConfig = useWsConfiguration();

const props = defineProps<{wsConfig?: WorkspaceConfigurationMetadata}>()

const config = computed(() => props.wsConfig || wsConfig.metadata);

const router = useRouter();
const { createWorkspace } = useCreateWorkspace()
const store = useWorkspacesList();

const save = async (data) => {
  const newWorkspace = await createWorkspace(data);
  store.reload();
  await store.activateSilently(newWorkspace);

  const navigateHome = store.workspaces.length === 0;

  if (navigateHome) {
    await router.push({ name: 'qelos-home' });
  } else {
    await router.push({ name: 'editMyWorkspace', params: { id: newWorkspace._id } });
  }
};

</script>
