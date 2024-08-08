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

const router = useRouter();
const { createWorkspace } = useCreateWorkspace()

const save = async (data) => {
  const { _id } = await createWorkspace(data)
  await router.push({ name: 'editWorkspace', params: { id: _id } });
};

</script>
