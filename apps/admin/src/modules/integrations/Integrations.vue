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
      <BlockItem class="source" v-for="kind in kinds" :key="kind.kind"
        @click="$router.push({ name: 'integrations-sources', params: { kind: kind.kind } })">
        <img v-if="kind.logo" :src="kind.logo" :alt="kind.name">
        <p centered v-else class="large">{{ kind.name }}</p>
      </BlockItem>
    </div>

    <EmptyState v-if="loaded && result.length === 0" description="No integrations found.">
      <el-button type="primary" @click="$router.push({ query: { mode: 'create' } })">Create new Integration</el-button>
    </EmptyState>
    <div class="content-list">
      <BlockItem class="integration" v-for="integration in result" :key="integration._id">
        <div class="flex-row flex-center flex-middle">
          <div class="flex-middle">
            <img v-if="kinds[integration.kind[0]]?.logo" :src="kinds[integration.kind[0]]?.logo" :alt="kinds[integration.kind[0]]?.name">
            <p centered v-else class="large">{{ kinds[integration.kind[0]]?.name }}</p>
          </div>
          <div centered class="flex-middle font-lg">
            <el-icon>
              <icon-arrow-right />  
            </el-icon>
          </div>
          <div class="flex-middle">
            <img v-if="kinds[integration.kind[1]]?.logo" :src="kinds[integration.kind[1]]?.logo" :alt="kinds[integration.kind[1]]?.name">
            <p centered v-else class="large">{{ kinds[integration.kind[1]]?.name }}</p>
          </div>
        </div>
        <template #actions>
          <el-button type="primary" @click="$router.push({ query: { mode: 'edit' }, params: { id: integration._id } })">Edit</el-button>
          <RemoveButton @click="remove(integration._id)" />
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
}

.source, .integration {
  cursor: pointer;
}

:is(.source, .integration) :deep(.el-card__body) {
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

.integration img {
  max-width: 100%;
  max-height: 10px;
  border-radius: 25px;
  margin: 0;
}

:is(.source, .integration) .blocks-list>* {
  width: 120px;
  margin: 10px;
}

@media screen and (max-width: 700px) {
  .blocks-list {
    flex-direction: column;

    :is(.source, .integration) >* {
      width: 96%;
    }
  }
}

.large {
  font-size: 32px;
}
</style>