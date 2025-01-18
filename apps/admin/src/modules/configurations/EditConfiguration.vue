<template>
  <div class="category-page" v-if="config">
    <PageTitle title="Edit Configuration" :item-name="$t(config.key)"/>
    <SsrScriptsForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"
                    v-if="config.key === 'ssr-scripts'"/>
    <WorkspaceConfigurationForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"
                                v-else-if="config.key === 'workspace-configuration'"/>
    <AuthConfigurationForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"
                                v-else-if="config.key === 'auth-configuration'"/>
    <div v-else>
      <ConfigurationForm :kind="config.kind" :metadata="config.metadata" :submitting="submitting" @save="submit"/>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useSubmitting } from '../core/compositions/submitting'
import { useEditConfiguration } from './compositions/configurations'
import PageTitle from '../core/components/semantics/PageTitle.vue'
import ConfigurationForm from './components/ConfigurationForm.vue'
import SsrScriptsForm from './components/SsrScriptsForm.vue'
import { useRoute } from 'vue-router'
import WorkspaceConfigurationForm from '@/modules/configurations/components/WorkspaceConfigurationForm.vue';
import AuthConfigurationForm from '@/modules/configurations/components/AuthConfigurationForm.vue';

const { params } = useRoute()
const { config, updateConfiguration } = useEditConfiguration((params as any).key)
const { submitting, submit } = useSubmitting(
    (metadata) => updateConfiguration({ metadata }),
    { success: 'Configurations updated successfully', error: 'Failed to updated configurations' })
</script>

