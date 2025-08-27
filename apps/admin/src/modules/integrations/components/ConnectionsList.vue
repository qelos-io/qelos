<script setup lang="ts">
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { computed } from 'vue';

const kinds = useIntegrationKinds();
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
</script>

<template>
  <div>
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

.source {
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

:is(.source) :deep(.el-card__body) {
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

.large {
  font-size: 32px;
}

.source-count-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}
</style>
