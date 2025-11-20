<script setup lang="ts">
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import IntegrationFormModal from '@/modules/integrations/components/IntegrationFormModal.vue';
import ConnectionsList from '@/modules/integrations/components/ConnectionsList.vue';
import IntegrationsList from '@/modules/integrations/components/IntegrationsList.vue';
import WorkflowsView from '@/modules/integrations/components/WorkflowsView.vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElRadioGroup, ElRadioButton } from 'element-plus';
import { List, Connection } from '@element-plus/icons-vue';

const route = useRoute();
const integrationsStore = useIntegrationsStore();
const router = useRouter();

const viewMode = ref<'list' | 'workflows'>('list');

const editingIntegration = computed(() => {
  if (route.query.mode === 'create') return undefined;
  if (route.query.mode === 'edit' && route.query.id) {
    return integrationsStore.integrations?.find(integration => integration._id === route.query.id);
  }
  return undefined;
})

const closeIntegrationFormModal = () => {
  integrationsStore.retry();
  router.push({ query: { mode: undefined, id: undefined } });
}
</script>

<template>
  <div>
    <ListPageTitle 
      title="Integrations" 
      description="Integrations connect your application to external services and APIs. Set up triggers, actions, and data flows between different platforms."
      :create-route-query="{ mode: $route.query.mode ? undefined : 'create' }" 
    />
    
    <div class="view-mode-selector">
      <el-radio-group v-model="viewMode" size="default">
        <el-radio-button value="list">
          <el-icon><List /></el-icon>
          List View
        </el-radio-button>
        <el-radio-button value="workflows">
          <el-icon><Connection /></el-icon>
          Workflows
        </el-radio-button>
      </el-radio-group>
    </div>
    
    <template v-if="viewMode === 'list'">
      <ConnectionsList />
      <IntegrationsList @retry="integrationsStore.retry" />
    </template>
    
    <WorkflowsView v-else />

    <IntegrationFormModal :visible="$route.query.mode === 'create' || ($route.query.mode === 'edit' && !!editingIntegration)"
      :editing-integration="editingIntegration"
      @close="closeIntegrationFormModal" />
  </div>
</template>

<style scoped>
.view-mode-selector {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}
</style>