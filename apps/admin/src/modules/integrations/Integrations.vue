<script setup lang="ts">
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import { useIntegrations } from '@/modules/integrations/compositions/integrations';
import EmptyState from '@/modules/core/components/layout/EmptyState.vue';
import IntegrationFormModal from '@/modules/integrations/components/IntegrationFormModal.vue';

const kinds = useIntegrationKinds();
const { loaded, result } = useIntegrations();
</script>

<template>
  <div>
    <ListPageTitle title="Integrations" :create-route-query="{ mode: $route.query.mode ? undefined : 'create' }"/>
    <p>{{ $t('Choose any provider to manage connections') }}:</p>

    <div class="blocks-list">
      <BlockItem class="source" v-for="kind in kinds" :key="kind.kind"
                 @click="$router.push({name: 'integrations-sources', params: {kind: kind.kind}})">
        <img v-if="kind.logo" :src="kind.logo" :alt="kind.name">
        <p centered v-else class="large">{{ kind.name }}</p>
      </BlockItem>
    </div>

    <EmptyState v-if="loaded && result.length === 0" description="No integrations found.">
      <el-button type="primary" @click="$router.push({query: {mode: 'create'}})">Create new Integration</el-button>
    </EmptyState>
    <div>
      <BlockItem class="source" v-for="integration in result" :key="integration._id">
        <img :src="kinds[integration.kind[0]]?.logo" :alt="kinds[integration.kind[0]]?.name">
        --->
        <img :src="kinds[integration.kind[1]]?.logo" :alt="kinds[integration.kind[1]]?.name">
      </BlockItem>
    </div>

    <IntegrationFormModal :visible="$route.query.mode === 'create'" @close="$router.push({query: {mode: undefined}})"/>
  </div>
</template>

<style scoped>
.blocks-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-content: flex-start;
}

.source {
  cursor: pointer;
}

.source :deep(.el-card__body) {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.source img {
  max-width: 100%;
  max-height: 150px;
  border-radius: var(--border-radius);
  margin: 0;
}

.blocks-list > * {
  width: 120px;
  margin: 10px;
}

@media screen and (max-width: 700px) {
  .blocks-list {
    flex-direction: column;

    > * {
      width: 96%;
    }
  }
}

.large {
  font-size: 32px;
}
</style>