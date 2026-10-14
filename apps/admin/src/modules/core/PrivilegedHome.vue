<template>
  <div class="dashboard flex-container">
    <el-tabs :model-value="activeTab" @update:model-value="activeTab = $event.toString()" class="dashboard-tabs">
      <el-tab-pane name="dashboard" :label="$t('Dashboard')">
        <DashboardOverview />
      </el-tab-pane>

      <el-tab-pane name="blueprints" :label="$t('Blueprints')">
        <BlueprintsList/>
      </el-tab-pane>

      <el-tab-pane name="plugins" :label="$t('Plugins')">
        <YourPluginsList/>
      </el-tab-pane>

      <el-tab-pane name="integrations" :label="$t('Integrations')">
        <WorkflowsView />

        <IntegrationFormModal :visible="$route.query.mode === 'create' || ($route.query.mode === 'edit' && !!editingIntegration)"
          :editing-integration="editingIntegration"
          @close="closeIntegrationFormModal" />
      </el-tab-pane>

      <el-tab-pane name="connect" :label="$t('Connect your app')">
        <IntegratorsSuggestions />
      </el-tab-pane>

      <el-tab-pane name="metadata" :label="$t('Settings')">
        <ConfigHub />
      </el-tab-pane>
    </el-tabs>
  </div>
 <footer><QuickStartWizard/></footer>
</template>

<script setup lang="ts">

import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import YourPluginsList from '@/modules/plugins/components/YourPluginsList.vue';
import QuickStartWizard from '@/modules/admins/components/QuickStartWizard.vue';
import DashboardOverview from '@/modules/core/components/DashboardOverview.vue';
import IntegratorsSuggestions from '@/modules/core/components/IntegratorsSuggestions.vue';
import ConfigHub from '@/modules/core/components/home/ConfigHub.vue';
import WorkflowsView from '../integrations/components/WorkflowsView.vue';
import IntegrationFormModal from '../integrations/components/IntegrationFormModal.vue';
import { useRoute, useRouter } from 'vue-router';
import { useIntegrationsStore } from '../integrations/store/integrations';
import { computed } from 'vue';

const route = useRoute();
const integrationsStore = useIntegrationsStore();
const router = useRouter();

const activeTab = computed({
  get: () => {
  return route.query.tab?.toString() || 'dashboard';
  },
  set: (tab) => {
    router.push({ query: { ...route.query, tab } });
  }
});

const closeIntegrationFormModal = () => {
  integrationsStore.retry();
  router.push({ query: { ...route.query, mode: undefined, id: undefined } });
}

const editingIntegration = computed(() => {
  if (route.query.mode === 'create') return undefined;
  if (route.query.mode === 'edit' && route.query.id) {
    return integrationsStore.integrations?.find(integration => integration._id === route.query.id);
  }
  return undefined;
})
</script>
<style scoped lang="scss">
.dashboard-tabs {
  inline-size: 100%;
}
</style>
