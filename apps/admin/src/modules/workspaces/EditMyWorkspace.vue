<template>
  <div>
    <WorkspaceForm v-if="loaded" :ws-config="wsConfig.metadata" :workspace='workspace' @submitted="save"/>
  </div>
</template>
<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useUpdateWorkspace } from './compositions/workspaces'
import WorkspaceForm from './components/WorkspaceForm.vue'
import PageTitle from '../core/components/semantics/PageTitle.vue'
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

const route = useRoute()
const { workspace, updateWorkspace, loaded } = useUpdateWorkspace(route.params?.id as string)

const wsConfig = useWsConfiguration();

const save = async (data) => {
  await updateWorkspace(data)
};

</script>
