<template>
  <ConfigPageShell v-if="config" :config-key="config.key" :is-public="config.public === undefined ? undefined : !!config.public" :submitting="submitting" :saved-token="savedToken">
    <SsrScriptsForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"
      v-if="config.key === 'ssr-scripts'" />
    <WorkspaceConfigurationForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"
      v-else-if="config.key === 'workspace-configuration'" />
    <AuthConfigurationForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"
      v-else-if="config.key.startsWith('auth-configuration') || config.kind === 'auth'" />
    <AppConfigurationForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"
      v-else-if="config.key === 'app-configuration'" />
    <McpConfigurationForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"
      v-else-if="config.key === 'mcp-configuration'" />
    <UsersHeaderForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"
      v-else-if="config.kind === 'users-header' || config.key?.startsWith('users-header')" />
    <ConfigurationForm v-else :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit" />
  </ConfigPageShell>
  <div v-else class="loading"><el-skeleton :rows="6" animated /></div>
</template>
<script lang="ts" setup>
import { useSubmitting } from '../core/compositions/submitting'
import { useEditConfiguration } from './compositions/configurations'
import ConfigPageShell from './components/ConfigPageShell.vue'
import { ref } from 'vue'
import ConfigurationForm from './components/ConfigurationForm.vue'
import SsrScriptsForm from './components/SsrScriptsForm.vue'
import { useRoute } from 'vue-router'
import WorkspaceConfigurationForm from '@/modules/configurations/components/WorkspaceConfigurationForm.vue';
import AuthConfigurationForm from '@/modules/configurations/components/AuthConfigurationForm.vue';
import AppConfigurationForm from '@/modules/configurations/components/AppConfigurationForm.vue';
import UsersHeaderForm from '@/modules/configurations/components/UsersHeaderForm.vue'
import McpConfigurationForm from '@/modules/configurations/components/McpConfigurationForm.vue'

const { params } = useRoute()
const { config, updateConfiguration } = useEditConfiguration((params as any).key)
const savedToken = ref(0)
const { submitting, submit } = useSubmitting(
  (metadata) => updateConfiguration({ metadata }),
  { success: 'Configurations updated successfully', error: 'Failed to updated configurations' },
  () => savedToken.value++)
</script>
<style scoped>
.loading {
  padding: 24px;
}
</style>
