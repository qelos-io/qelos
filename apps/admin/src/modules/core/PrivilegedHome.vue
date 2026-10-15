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
        <IntegrationsFlowTab />

      </el-tab-pane>

      <el-tab-pane name="connect" :label="$t('Connect your app')">
        <IntegratorsSuggestions />
      </el-tab-pane>

      <el-tab-pane name="metadata" :label="$t('Settings')">
        <ConfigHub />
      </el-tab-pane>
    </el-tabs>
    <footer><QuickStartWizard/></footer>
  </div>
</template>

<script setup lang="ts">

import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import YourPluginsList from '@/modules/plugins/components/YourPluginsList.vue';
import QuickStartWizard from '@/modules/admins/components/QuickStartWizard.vue';
import DashboardOverview from '@/modules/core/components/DashboardOverview.vue';
import IntegratorsSuggestions from '@/modules/core/components/IntegratorsSuggestions.vue';
import ConfigHub from '@/modules/core/components/home/ConfigHub.vue';
import IntegrationsFlowTab from '../integrations/components/flow/IntegrationsFlowTab.vue';
import { useLegacyEditorRedirect } from '../integrations/compositions/legacy-editor-redirect';
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();

const activeTab = computed({
  get: () => {
  return route.query.tab?.toString() || 'dashboard';
  },
  set: (tab) => {
    router.push({ query: { ...route.query, tab } });
  }
});

// old dialog-style links on this tab open the editor page
useLegacyEditorRedirect(computed(() => activeTab.value === 'integrations'));
</script>
<style scoped lang="scss">
.dashboard-tabs {
  inline-size: 100%;
}
</style>
