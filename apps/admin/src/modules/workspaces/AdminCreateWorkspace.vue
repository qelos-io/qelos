<template>
  <div>
    <PageTitle title="Create Workspace"/>
    <AdminWorkspaceForm :workspace='{}' @submitted="save"/>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useCreateWorkspace } from './compositions/workspaces'
import AdminWorkspaceForm from './components/AdminWorkspaceForm.vue'
import PageTitle from '../core/components/semantics/PageTitle.vue'
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';

const router = useRouter();
const { createWorkspace } = useCreateWorkspace()
const store = useWorkspacesList();

const save = async (data) => {
  const { _id } = await createWorkspace(data)
  await store.reload()
  await router.push({ name: 'adminEditWorkspace', params: { id: _id } });
};

</script>
