<script setup lang="ts">
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import IntegrationFormModal from '@/modules/integrations/components/IntegrationFormModal.vue';
import ConnectionsList from '@/modules/integrations/components/ConnectionsList.vue';
import IntegrationsList from '@/modules/integrations/components/IntegrationsList.vue';
import WorkflowsView from '@/modules/integrations/components/WorkflowsView.vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElRadioGroup, ElRadioButton } from 'element-plus';
import { List, Connection, Link } from '@element-plus/icons-vue';

const route = useRoute();
const integrationsStore = useIntegrationsStore();
const router = useRouter();

type ViewMode = 'connections' | 'list' | 'workflows';

const initialViewMode = ((): ViewMode => {
  if (route.query.view === 'workflows') return 'workflows';
  if (route.query.view === 'connections') return 'connections';
  return 'list';
})();

const viewMode = ref<ViewMode>(initialViewMode);

const buildQuery = (updates: Record<string, string | string[] | undefined>) => {
  const newQuery = { ...route.query, ...updates } as Record<string, any>;
  Object.keys(newQuery).forEach(key => {
    if (newQuery[key] === undefined) {
      delete newQuery[key];
    }
  });
  return newQuery;
};

watch(viewMode, newMode => {
  if (route.query.view === newMode) return;
  router.replace({ query: buildQuery({ view: newMode }) });
});

watch(() => route.query.view, newView => {
  if (newView !== 'workflows' && newView !== 'list' && newView !== 'connections') return;
  if (viewMode.value !== newView) {
    viewMode.value = newView as ViewMode;
  }
});

const createRouteQuery = computed(() => buildQuery({
  mode: route.query.mode ? undefined : 'create',
  id: undefined,
}));

const editingIntegration = computed(() => {
  if (route.query.mode === 'create') return undefined;
  if (route.query.mode === 'edit' && route.query.id) {
    return integrationsStore.integrations?.find(integration => integration._id === route.query.id);
  }
  return undefined;
})

const closeIntegrationFormModal = () => {
  integrationsStore.retry();
  router.push({ query: buildQuery({ mode: undefined, id: undefined }) });
}
</script>

<template>
  <div class="integrations-page">
    <ListPageTitle 
      title="Integrations" 
      description="Integrations connect your application to external services and APIs. Set up triggers, actions, and data flows between different platforms."
      :create-route-query="createRouteQuery"
    />
    
    <div class="view-mode-selector">
      <el-radio-group v-model="viewMode" size="default">
        <el-radio-button value="connections">
          <el-icon><Link /></el-icon>
          {{ $t('Connections') }}
        </el-radio-button>
        <el-radio-button value="list">
          <el-icon><List /></el-icon>
          {{ $t('List View') }}
        </el-radio-button>
        <el-radio-button value="workflows">
          <el-icon><Connection /></el-icon>
          {{ $t('Workflows') }}
        </el-radio-button>
      </el-radio-group>
    </div>
    
    <template v-if="viewMode === 'connections'">
      <ConnectionsList />
    </template>

    <template v-else-if="viewMode === 'list'">
      <IntegrationsList @retry="integrationsStore.retry" />
    </template>
    
    <div v-else class="workflows-container">
      <WorkflowsView />
    </div>

    <IntegrationFormModal :visible="$route.query.mode === 'create' || ($route.query.mode === 'edit' && !!editingIntegration)"
      :editing-integration="editingIntegration"
      @close="closeIntegrationFormModal" />
  </div>
</template>

<style scoped>
.integrations-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.view-mode-selector {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  border-radius: var(--border-radius);
}

.workflows-container {
  flex: 1;
  min-height: 0;
  display: flex;
}
</style>