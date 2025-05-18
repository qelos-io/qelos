<script setup lang="ts">
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import { useIntegrations } from '@/modules/integrations/compositions/integrations';
import EmptyState from '@/modules/core/components/layout/EmptyState.vue';
import IntegrationFormModal from '@/modules/integrations/components/IntegrationFormModal.vue';
import RemoveButton from '../core/components/forms/RemoveButton.vue';
import integrationsService from '@/services/integrations-service';
import { useConfirmAction } from '../core/compositions/confirm-action';
import { ref, computed } from 'vue';
import { ElTooltip, ElTag, ElInput } from 'element-plus';

const kinds = useIntegrationKinds();
const { loaded, result, retry } = useIntegrations();

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
          </div>
          <div class="integration-name">{{ kind.name }}</div>
        </BlockItem>
      </el-tooltip>
    </div>
    
    <div class="section-divider-container">
      <div class="section-divider"></div>
      <h3 class="section-title">{{ $t('Your Integrations') }}</h3>
    </div>

    <EmptyState v-if="loaded && result.length === 0" description="No integrations found.">
      <el-button type="primary" @click="$router.push({ query: { mode: 'create' } })">Create new Integration</el-button>
    </EmptyState>
    <div class="content-list">
      <BlockItem class="integration-item" v-for="integration in result" :key="integration._id">
        <div class="integration-content">
          <div class="integration-icons">
            <div class="integration-icon">
              <img v-if="kinds[integration.kind[0]]?.logo" :src="kinds[integration.kind[0]]?.logo" :alt="kinds[integration.kind[0]]?.name" class="integration-logo">
              <p centered v-else class="large">{{ kinds[integration.kind[0]]?.name }}</p>
            </div>
            <div class="integration-arrow">
              <el-icon><icon-arrow-right /></el-icon>
            </div>
            <div class="integration-icon">
              <img v-if="kinds[integration.kind[1]]?.logo" :src="kinds[integration.kind[1]]?.logo" :alt="kinds[integration.kind[1]]?.name" class="integration-logo">
              <p centered v-else class="large">{{ kinds[integration.kind[1]]?.name }}</p>
            </div>
          </div>
        </div>
        <template #actions>
          <div class="integration-actions">
            <el-button type="primary" @click="$router.push({ query: { mode: 'edit' }, params: { id: integration._id } })">Edit</el-button>
            <RemoveButton @click="remove(integration._id)" />
          </div>
        </template>
      </BlockItem>
    </div>

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

.content-list {
  margin-top: 20px;
}

.integration-item {
  margin-bottom: 16px;
  transition: all 0.2s ease;
}

.integration-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
}

.integration-content {
  padding: 8px 0;
}

.integration-icons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.integration-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
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
  gap: 8px;
  justify-content: flex-end;
  padding: 8px 0;
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

@media screen and (max-width: 700px) {
  .blocks-list {
    justify-content: center;
  }
  
  .integration-filters {
    align-items: center;
  }
  
  .search-input {
    width: 100%;
  }
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
</style>