<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue';
import AddNewCard from '@/modules/core/components/cards/AddNewCard.vue';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import integrationsService from '@/services/integrations-service';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { ElMessage } from 'element-plus';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { IIntegrationSource, IIntegration } from '@qelos/global-types';
import { useIntegrationsStore } from '../store/integrations';

const props = defineProps({
  filter: {
    type: Object,
    default: () => ({})
  },
  compact: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['retry', 'create', 'edit']);

const kinds = useIntegrationKinds();
const integrationsStore = useIntegrationsStore();
const integrationSourcesStore = useIntegrationSourcesStore();

// Map source IDs to source objects
const sourcesById = computed(() => {
  if (!integrationSourcesStore.result) return {};
  return integrationSourcesStore.result.reduce((acc, source) => {
    acc[source._id] = source;
    return acc;
  }, {} as Record<string, IIntegrationSource>);
});

// Filter integrations based on props.filter
const filteredIntegrations = computed(() => {
  if (!integrationsStore.integrations) return [];
  
  return integrationsStore.integrations.filter(integration => {
    // If no filter is provided, return all integrations
    if (!props.filter || Object.keys(props.filter).length === 0) {
      return true;
    }
    
    // Filter by triggerSource and blueprintId if provided
    if (props.filter.triggerSource && props.filter.blueprintId) {
      return integration.trigger && 
             integration.trigger.details && 
             integration.trigger.details.source === props.filter.triggerSource && 
             integration.trigger.details.kind === props.filter.blueprintId;
    }
    
    // Filter by triggerSource only
    if (props.filter.triggerSource) {
      return integration.trigger && 
             integration.trigger.details && 
             integration.trigger.details.source === props.filter.triggerSource;
    }
    
    return true;
  });
});

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

const handleEdit = (integrationId: string) => {
  emit('edit', integrationId);
};

const handleCreate = () => {
  emit('create');
};
</script>

<template>
  <div>
    <div v-if="!compact" class="section-divider-container">
      <div class="section-divider"></div>
      <h3 class="section-title">{{ $t('Your Integrations') }}</h3>
    </div>
    
    <el-skeleton :loading="!integrationsStore.loaded" :count="3" animated>
      <template #template>
        <div class="integrations-grid" :class="{ 'compact-grid': compact }">
          <div class="integration-skeleton" v-for="i in 3" :key="i">
            <el-skeleton-item variant="h3" style="width: 40%" />
            <el-skeleton-item variant="text" style="width: 60%" />
            <el-skeleton-item variant="text" style="width: 50%" />
          </div>
        </div>
      </template>
      
      <template #default>
        <div v-if="integrationsStore.loaded && filteredIntegrations.length === 0" class="empty-state">
          <el-empty :description="$t('No integrations found')">
            <el-button type="primary" @click="handleCreate">
              <el-icon><font-awesome-icon :icon="['fas', 'plus']" /></el-icon>
              {{ $t('Add Integration') }}
            </el-button>
          </el-empty>
        </div>
        
        <div v-else class="integrations-grid" :class="{ 'compact-grid': compact }">
          <div v-for="integration in filteredIntegrations" 
               :key="integration._id"
               :id="'integration-' + integration._id"
               class="integration-card"
               :class="{ 'integration-card-inactive': !integration.active, 'compact-card': compact }"
               @click="handleEdit(integration._id)">
            
            <div class="integration-header">
              <div class="integration-title">
                <h3>
                  <a href="#" @click.prevent.stop="handleEdit(integration._id)">
                    {{ sourcesById[integration.trigger.source]?.name || 'Unknown' }} → {{ sourcesById[integration.target.source]?.name || 'Unknown' }}
                  </a>
                </h3>
                <div class="integration-subtitle" v-if="integration.trigger.details?.name">
                  {{ integration.trigger.details.name }}
                </div>
              </div>
              <p class="integration-description" v-if="integration.trigger.details?.description">{{ integration.trigger.details.description }}</p>
            </div>

            <div class="integration-flow" :class="{ 'compact-flow': compact }">
              <div class="integration-icon-container">
                <div class="integration-icon" :class="{ 'compact-icon': compact }">
                  <img v-if="kinds[integration.kind[0]]?.logo" :src="kinds[integration.kind[0]]?.logo" :alt="kinds[integration.kind[0]]?.name" class="integration-logo">
                  <p v-else class="large">{{ kinds[integration.kind[0]]?.name }}</p>
                </div>
                <div class="integration-details">
                  <div class="integration-source-name">{{ sourcesById[integration.trigger.source]?.name || 'Unknown' }}</div>
                  <div class="integration-operation">{{ integration.trigger.operation }}</div>
                </div>
              </div>
              
              <div class="integration-arrow">
                <el-icon><font-awesome-icon :icon="['fas', 'arrow-right']" /></el-icon>
              </div>
              
              <div class="integration-icon-container">
                <div class="integration-icon" :class="{ 'compact-icon': compact }">
                  <img v-if="kinds[integration.kind[1]]?.logo" :src="kinds[integration.kind[1]]?.logo" :alt="kinds[integration.kind[1]]?.name" class="integration-logo">
                  <p v-else class="large">{{ kinds[integration.kind[1]]?.name }}</p>
                </div>
                <div class="integration-details">
                  <div class="integration-source-name">{{ sourcesById[integration.target.source]?.name || 'Unknown' }}</div>
                  <div class="integration-operation">{{ integration.target.operation }}</div>
                </div>
              </div>
            </div>
            
            <div class="integration-actions">
              <el-tooltip :content="$t('Toggle Active Status')" placement="top">
                <el-button 
                  :type="integration.active ? 'success' : 'info'" 
                  circle 
                  size="small"
                  @click.stop="toggleActive(integration)"
                >
                  <el-icon><font-awesome-icon :icon="integration.active ? 'check' : 'times'" /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip :content="$t('Edit Integration')" placement="top">
                <el-button 
                  type="primary" 
                  circle 
                  size="small"
                  @click.stop="handleEdit(integration._id)"
                >
                  <el-icon><font-awesome-icon :icon="'edit'" /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip :content="$t('Delete Integration')" placement="top">
                <el-button 
                  type="danger" 
                  circle 
                  size="small"
                  @click.stop="remove(integration._id)"
                >
                  <el-icon><font-awesome-icon :icon="'trash'" /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
          
          <AddNewCard 
            v-if="!compact"
            :title="$t('Create new Integration')"
            :description="$t('Connect your services together')"
            :to="{}"
            @click="handleCreate"
          />
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  width: 100%;
  margin-top: 20px;
}

.compact-grid {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.integration-skeleton {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  height: 300px;
}

.empty-state {
  margin: 40px 0;
}

.integration-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #ebeef5;
}

.compact-card {
  padding: 12px;
}

.integration-card-inactive {
  opacity: 0.5;
}

.integration-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--el-color-primary-light-5);
}

.integration-header {
  margin-bottom: 16px;
}

.integration-title {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.integration-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.integration-title a {
  color: inherit;
  text-decoration: none;
}

.integration-title a:hover {
  text-decoration: underline;
}

.integration-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 20px 0;
  flex: 1;
}

.compact-flow {
  padding: 10px 0;
  gap: 10px;
}

.integration-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.integration-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
}

.compact-icon {
  width: 60px;
  height: 60px;
}

.integration-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.integration-source-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.integration-operation {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.integration-icon img {
  max-width: 100%;
  max-height: 60px;
  border-radius: 8px;
  margin: 0;
  object-fit: contain;
}

.compact-icon img {
  max-height: 40px;
}

.integration-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 20px;
}

.integration-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.large {
  font-size: 32px;
}

.section-divider-container {
  margin: 40px 0 20px;
  position: relative;
}

.section-divider {
  height: 1px;
  background-color: var(--el-border-color-light);
  width: 100%;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  padding: 0;
}

.integration-header {
  background-color: var(--el-color-primary-light-9);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
  position: relative;
  border-left: 4px solid var(--el-color-primary);
}

.compact-card .integration-header {
  padding: 8px 12px;
  margin-bottom: 10px;
}

.integration-subtitle {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-color-primary-dark-2);
  margin-top: 4px;
}

.integration-description {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .integrations-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .integrations-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
