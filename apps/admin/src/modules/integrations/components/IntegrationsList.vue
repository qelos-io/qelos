<script setup lang="ts">
import AddNewCard from '@/modules/core/components/cards/AddNewCard.vue';
import IntegrationCard from './IntegrationCard.vue';
import SectionHeader from './shared/SectionHeader.vue';
import EmptyState from './shared/EmptyState.vue';
import integrationsService from '@/services/apis/integrations-service';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { IIntegrationSource, IIntegration } from '@qelos/global-types';
import { useIntegrationsStore } from '../store/integrations';
import { useRoute, useRouter } from 'vue-router';

const emit = defineEmits(['retry']);

const integrationsStore = useIntegrationsStore();
const integrationSourcesStore = useIntegrationSourcesStore();
const route = useRoute();
const router = useRouter();

// Map source IDs to source objects
const sourcesById = computed(() => {
  if (!integrationSourcesStore.result) return {};
  return integrationSourcesStore.result.reduce((acc, source) => {
    acc[source._id] = source;
    return acc;
  }, {} as Record<string, IIntegrationSource>);
});

const filteredIntegrations = computed(() => {
  const list = integrationsStore.integrations || [];
  const queryParam = route.query.q;
  if (!queryParam) return list;

  const query = String(queryParam).toLowerCase();
  const includesQuery = (value?: string | null) => (value || '').toLowerCase().includes(query);

  return list.filter((integration) => {
    const triggerSourceName = sourcesById.value[integration.trigger.source]?.name;
    const targetSourceName = sourcesById.value[integration.target.source]?.name;
    const triggerDetails = integration.trigger.details;
    const targetDetails = integration.target.details;

    return [
      triggerSourceName,
      targetSourceName,
      integration.trigger.operation,
      integration.target.operation,
      triggerDetails?.name,
      triggerDetails?.description,
      targetDetails?.name,
      targetDetails?.description,
      integration.kind?.join(' '),
      integration._id,
    ].some(includesQuery);
  });
});

// Group integrations by categories
const groupedIntegrations = computed(() => {
  const groups: Record<string, IIntegration[]> = {
    'AI Agents': [],
    'Function callings': [],
    'API Webhooks': [],
  };
  
  const webhookGroups: Record<string, IIntegration[]> = {};
  
  filteredIntegrations.value.forEach(integration => {
    // AI Agents: kind[0] === qelos && trigger.operation === chatCompletion
    if (integration.kind[0] === 'qelos' && integration.trigger.operation === 'chatCompletion') {
      groups['AI Agents'].push(integration);
    }
    // Function callings: trigger.operation === functionCalling
    else if (integration.trigger.operation === 'functionCalling') {
      groups['Function callings'].push(integration);
    }
    // API Webhooks: kind[0] === qelos && trigger.operation === apiWebhook
    else if (integration.kind[0] === 'qelos' && integration.trigger.operation === 'apiWebhook') {
      groups['API Webhooks'].push(integration);
    }
    // Webhooks: trigger.operation === webhook && trigger.details.source
    else if (integration.trigger.operation === 'webhook' && integration.trigger.details?.source) {
      const sourceName = integration.trigger.details.source;
      if (!webhookGroups[sourceName]) {
        webhookGroups[sourceName] = [];
      }
      webhookGroups[sourceName].push(integration);
    }
  });
  
  // Add webhook groups to the main groups object
  Object.keys(webhookGroups).forEach(sourceName => {
    groups[`Webhook - ${sourceName}`] = webhookGroups[sourceName];
  });
  
  return groups;
});

// Get only non-empty groups for display
const nonEmptyGroups = computed(() => {
  return Object.entries(groupedIntegrations.value).filter(([_, integrations]) => integrations.length > 0);
});

// Track which groups are collapsed
const collapsedGroups = ref<Record<string, boolean>>({});

const remove = useConfirmAction((id: string) => {
  integrationsService.remove(id).then(() => {
    integrationsStore.retry();
    emit('retry');
  });
});

const toggleActive = async (integration: IIntegration) => {
  try {
    const newStatus = !integration.active;
    await integrationsService.update(integration._id, { active: newStatus });
    integration.active = newStatus; // Update locally for immediate UI feedback
    ElMessage.success(newStatus ? 'Integration activated' : 'Integration deactivated');
  } catch (error) {
    console.error('Failed to toggle integration status:', error);
    ElMessage.error('Failed to update integration status');
  }
};

const cloneIntegration = (integration: IIntegration) => {
  // Create a deep copy of the integration
  const clonedIntegration = JSON.parse(JSON.stringify(integration));
  
  // Remove system fields to make it a new integration
  delete clonedIntegration._id;
  delete clonedIntegration.created;
  delete clonedIntegration.tenant;
  delete clonedIntegration.__v;
  
  // Update the trigger details name
  if (clonedIntegration.trigger?.details?.name) {
    clonedIntegration.trigger.details.name = clonedIntegration.trigger.details.name + '_COPY';
  }
  
  // Remove _id from nested objects
  if (clonedIntegration.trigger?._id) {
    delete clonedIntegration.trigger._id;
  }
  if (clonedIntegration.target?._id) {
    delete clonedIntegration.target._id;
  }
  if (clonedIntegration.dataManipulation) {
    clonedIntegration.dataManipulation.forEach((item: any) => {
      if (item._id) {
        delete item._id;
      }
    });
  }
  
  // Check if this is an AI agent integration (chat completion)
  const isAIAgent = clonedIntegration.trigger?.operation === 'chatCompletion';
  
  // Store the cloned integration in sessionStorage for the modal to retrieve
  sessionStorage.setItem('clonedIntegration', JSON.stringify(clonedIntegration));
  
  // Navigate to create mode with the cloned integration
  // Build query parameters
  const query: any = { mode: 'create', clone: 'true' };
  if (isAIAgent) {
    query.agentMode = 'true';
  }
  
  router.push({ query });
};
</script>

<template>
  <div>
    <SectionHeader 
      title="Your Integrations"
      :count="filteredIntegrations.length"
    />

    <el-skeleton :loading="!integrationsStore.loaded" :count="3" animated>
      <template #template>
        <div class="integrations-grid">
          <div class="integration-skeleton" v-for="i in 3" :key="i">
            <el-skeleton-item variant="h3" style="width: 40%" />
            <el-skeleton-item variant="text" style="width: 60%" />
            <el-skeleton-item variant="text" style="width: 50%" />
          </div>
        </div>
      </template>
      
      <template #default>
        <EmptyState
          v-if="integrationsStore.loaded && filteredIntegrations.length === 0"
          type="integrations"
          @action="$router.push({ query: { mode: 'create' } })"
        />
        
        <div v-else>
          <!-- Display grouped integrations -->
          <template v-for="[groupName, integrations] in nonEmptyGroups" :key="groupName">
            <div class="group-section">
              <div class="group-header" @click="collapsedGroups[groupName] = !collapsedGroups[groupName]">
                <h4 class="group-title">{{ groupName }}</h4>
                <div class="group-header-right">
                  <el-badge :value="integrations.length" type="primary" class="group-count" />
                  <el-icon class="collapse-icon" :class="{ 'collapsed': collapsedGroups[groupName] }">
                    <icon-arrow-down />
                  </el-icon>
                </div>
              </div>
              <el-collapse-transition>
                <div v-show="!collapsedGroups[groupName]">
                  <div class="integrations-grid">
                    <IntegrationCard 
                      v-for="integration in integrations" 
                      :key="integration._id"
                      :id="'integration-' + integration._id"
                      :integration="integration"
                      :sources-by-id="sourcesById"
                      @toggle-active="toggleActive"
                      @remove="remove"
                      @clone="cloneIntegration"
                    />
                    
                    <AddNewCard 
                      v-if="groupName === Object.keys(nonEmptyGroups)[0]"
                      :title="$t('Create new Integration')"
                      :description="$t('Connect your services together')"
                      :to="{ query: { mode: 'create' } }"
                    />
                  </div>
                </div>
              </el-collapse-transition>
            </div>
          </template>
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.group-section {
  margin-bottom: 40px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--el-border-color-light);
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
}

.group-header:hover {
  border-bottom-color: var(--el-color-primary-light-5);
}

.group-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.group-count {
  flex-shrink: 0;
}

.collapse-icon {
  transition: transform 0.3s ease;
  color: var(--el-text-color-secondary);
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
  width: 100%;
}

.integration-skeleton {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  height: 300px;
}
</style>
