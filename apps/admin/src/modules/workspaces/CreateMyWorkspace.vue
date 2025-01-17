<template>
  <div>
    <PageTitle title="Create Workspace"/>
    <WorkspaceForm :workspace='{}' @submitted="save"/>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useCreateWorkspace } from './compositions/workspaces'
import WorkspaceForm from './components/WorkspaceForm.vue'
import PageTitle from '../core/components/semantics/PageTitle.vue'
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';
import { fetchAuthUser } from '@/modules/core/store/auth';

const router = useRouter();
const { createWorkspace } = useCreateWorkspace()
const store = useWorkspacesList();

const save = async (data) => {
  const newWorkspace = await createWorkspace(data)
  if (store.workspaces.length === 0) {
    store.reload()
    await store.activateSilently(newWorkspace);
    await router.push({ name: 'home' });
  } else {
    store.reload()
    await router.push({ name: 'editMyWorkspace', params: { id: newWorkspace._id } });
  }
};

</script>
