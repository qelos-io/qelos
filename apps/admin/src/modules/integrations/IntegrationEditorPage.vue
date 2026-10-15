<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useIntegrationsStore } from './store/integrations';
import { useIntegrationSourcesStore } from './store/integration-sources';
import IntegrationEditor from './components/IntegrationEditor.vue';

const route = useRoute();
const router = useRouter();
const integrationsStore = useIntegrationsStore();
const sourcesStore = useIntegrationSourcesStore();

const id = computed(() => route.params.integrationId as string | undefined);
const loaded = computed(() => integrationsStore.loaded && sourcesStore.loaded);
const integration = computed(() => (id.value ? integrationsStore.integrations?.find((entry) => entry._id === id.value) : undefined));
const notFound = computed(() => loaded.value && !!id.value && !integration.value);
</script>

<template>
  <el-skeleton v-if="!loaded" :rows="8" animated class="loading" />

  <el-empty v-else-if="notFound" :description="$t('Integration not found')" :image-size="140">
    <el-button type="primary" @click="router.push({ name: 'integrations' })">{{ $t('Back to integrations') }}</el-button>
  </el-empty>

  <IntegrationEditor
    v-else
    :key="`${id || 'new'}:${route.query.type || ''}:${route.query.clone || ''}`"
    :editing-integration="integration"
    :agent="!id && route.query.type === 'agent'"
    :pre-selected-source-id="route.query.sourceId as string | undefined"
    :clone="route.query.clone === 'true'"
  />
</template>

<style scoped>
.loading {
  padding: 24px;
}
</style>
