<template>
  <div>
    <PageTitle title="Edit Workspace"/>
    <WorkspaceForm v-if="loaded" :workspace='workspace' @submitted="save"/>
  </div>
</template>
<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useUpdateWorkspace } from './compositions/workspaces'
import WorkspaceForm from './components/WorkspaceForm.vue'
import PageTitle from '../core/components/semantics/PageTitle.vue'

const route = useRoute()
const { workspace, updateWorkspace, loaded } = useUpdateWorkspace(route.params?.id as string)

const save = async (data) => {
  await updateWorkspace(data)
};

</script>
