<script setup lang="ts">

import AddNewCard from '@/modules/core/components/cards/AddNewCard.vue';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import { useIntegrations } from '@/modules/integrations/compositions/integrations';

import IntegrationFormModal from '@/modules/integrations/components/IntegrationFormModal.vue';

import integrationsService from '@/services/integrations-service';
import { useConfirmAction } from '../core/compositions/confirm-action';
import { computed } from 'vue';

import { useIntegrationSourcesStore } from './store/integration-sources';
import { IIntegrationSource } from '@qelos/global-types';

const kinds = useIntegrationKinds();
const { loaded, result, retry } = useIntegrations();
const integrationSourcesStore = useIntegrationSourcesStore();

// Count sources by kind
const sourcesCount = computed(() => {
  if (!integrationSourcesStore.groupedSources) return {};
  const counts = {};
  for (const [kind, sources] of Object.entries(integrationSourcesStore.groupedSources)) {
    counts[kind] = sources?.length || 0;
  }
  return counts;
});

// Map source IDs to source objects
const sourcesById = computed(() => {
  if (!integrationSourcesStore.result) return {};
  return integrationSourcesStore.result.reduce((acc, source) => {
    acc[source._id] = source;
    return acc;
  }, {} as Record<string, IIntegrationSource>);
});

const remove = useConfirmAction((id: string) => {
  integrationsService.remove(id).then(() => {
    retry();
  });
})
</script>

<template>
  <div>
    <ListPageTitle title="Integrations" :create-route-query="{ mode: $route.query.mode ? undefined : 'create' }" />
    <p>{{ $t('Choose any provider to manage connections') }}:</p>
    
    <div class="blocks-list">
      <el-tooltip 
        v-for="kind in kinds" 
        :key="kind.kind"
        :content="kind.name"
        placement="top"
        :effect="'light'"
        :enterable="false"
      >
        <BlockItem 
          class="source" 
          @click="$router.push({ name: 'integrations-sources', params: { kind: kind.kind } })">
          <div class="integration-logo-container">
            <img v-if="kind.logo" :src="kind.logo" :alt="kind.name" class="integration-logo">
            <p centered v-else class="large">{{ kind.name }}</p>
            <el-badge v-if="sourcesCount[kind.kind] && sourcesCount[kind.kind] > 0" :value="sourcesCount[kind.kind]" class="source-count-badge" type="primary" />
          </div>
          <div class="integration-name">{{ kind.name }}</div>
        </BlockItem>
      </el-tooltip>
    </div>
    
    <div class="section-divider-container">
      <div class="section-divider"></div>
      <h3 class="section-title">{{ $t('Your Integrations') }}</h3>
    </div>
    
    <el-skeleton :loading="!loaded" :count="3" animated>
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
        <div v-if="loaded && result.length === 0" class="empty-state">
          <el-empty :description="$t('No integrations found')">
            <el-button type="primary" @click="$router.push({ query: { mode: 'create' } })">
              <el-icon><icon-plus /></el-icon>
              {{ $t('Add Integration') }}
            </el-button>
          </el-empty>
        </div>
        
        <div v-else class="integrations-grid">
          <div v-for="integration in result" 
               :key="integration._id"
               :id="'integration-' + integration._id"
               class="integration-card"
               @click="$router.push({query: { mode: 'edit' }, params: { id: integration._id }})">
            
            <div class="integration-header">
              <div class="integration-title">
                <h3>
                  <router-link :to="{query: { mode: 'edit' }, params: { id: integration._id }}" @click.stop>
                    {{ sourcesById[integration.trigger.source]?.name || 'Unknown' }} → {{ sourcesById[integration.target.source]?.name || 'Unknown' }}
                  </router-link>
                </h3>
              </div>
            </div>
            
            <div class="integration-flow">
              <div class="integration-icon-container">
                <div class="integration-icon">
                  <img v-if="kinds[integration.kind[0]]?.logo" :src="kinds[integration.kind[0]]?.logo" :alt="kinds[integration.kind[0]]?.name" class="integration-logo">
                  <p v-else class="large">{{ kinds[integration.kind[0]]?.name }}</p>
                </div>
                <div class="integration-details">
                  <div class="integration-source-name">{{ sourcesById[integration.trigger.source]?.name || 'Unknown' }}</div>
                  <div class="integration-operation">{{ integration.trigger.operation }}</div>
                </div>
              </div>
              
              <div class="integration-arrow">
                <el-icon><icon-arrow-right /></el-icon>
              </div>
              
              <div class="integration-icon-container">
                <div class="integration-icon">
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
              <el-tooltip :content="$t('Edit Integration')" placement="top">
                <el-button 
                  type="primary" 
                  circle 
                  @click.stop="$router.push({ query: { mode: 'edit' }, params: { id: integration._id } })"
                >
                  <el-icon><icon-edit /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip :content="$t('Delete Integration')" placement="top">
                <el-button 
                  type="danger" 
                  circle 
                  @click.stop="remove(integration._id)"
                >
                  <el-icon><icon-delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
          
          <AddNewCard 
            :title="$t('Create new Integration')"
            :description="$t('Connect your services together')"
            :to="{ query: { mode: 'create' } }"
          />
        </div>
      </template>
    </el-skeleton>

    <IntegrationFormModal :visible="$route.query.mode === 'create' || $route.query.mode === 'edit'"
      :editing-integration="($route.query.mode === 'edit' && $route.params.id) ? result.find(integration => integration._id === $route.params.id) : undefined"
      @saved="retry"
     @close="$router.push({ query: { mode: undefined, id: undefined } })" />
  </div>
</template>

<style scoped>
.blocks-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-content: flex-start;
  gap: 16px;
  margin-top: 20px;
}

.source, .integration {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  width: 140px;
  height: 140px;
}

.source:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

:is(.source, .integration) :deep(.el-card__body) {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.integration-logo-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70px;
  width: 100%;
}

.integration-logo {
  max-width: 100%;
  max-height: 60px;
  border-radius: var(--border-radius);
  margin: 0;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.integration-name {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  width: 100%;
  margin-top: 20px;
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
  align-items: center;
  justify-content: space-between;
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

.integration-icons-old {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
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

.integration-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 20px;
}

.integration-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.popular {
  border: 2px solid var(--el-color-primary-light-3);
}

.popular-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: var(--el-color-primary);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
}

.integration-filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.category-tag {
  cursor: pointer;
  user-select: none;
}

.search-input {
  max-width: 300px;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .integrations-grid {
    grid-template-columns: 1fr;
  }
  
  .integration-filters {
    align-items: center;
  }
  
  .search-input {
    width: 100%;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .integrations-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.large {
  font-size: 32px;
}

.source-count-badge {
  position: absolute;
  top: -8px;
  right: -8px;
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
</style>