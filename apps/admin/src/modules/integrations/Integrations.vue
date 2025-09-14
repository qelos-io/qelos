<script setup lang="ts">
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import IntegrationFormModal from '@/modules/integrations/components/IntegrationFormModal.vue';
import ConnectionsList from '@/modules/integrations/components/ConnectionsList.vue';
import IntegrationsList from '@/modules/integrations/components/IntegrationsList.vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const integrationsStore = useIntegrationsStore();
const router = useRouter();

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
    
    <ConnectionsList />
    
    <IntegrationsList @retry="integrationsStore.retry" />

    <IntegrationFormModal :visible="$route.query.mode === 'create' || ($route.query.mode === 'edit' && !!editingIntegration)"
      :editing-integration="editingIntegration"
      @saved="integrationsStore.retry"
      @close="closeIntegrationFormModal" />
  </div>
</template>

<style scoped>
/* No styles needed in the main component as they've been moved to the child components */
</style>