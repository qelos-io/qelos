<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useIntegrationsStore } from './store/integrations';
import { useIntegrationSourcesStore } from './store/integration-sources';
import IntegrationEditor from './components/IntegrationEditor.vue';
import { emits } from './services/flow-graph';
import { allSignatures, generateSignature, type FullIntegration } from './services/flow-links';
import { automationName } from './services/integration-presentation';

const route = useRoute();
const router = useRouter();
const integrationsStore = useIntegrationsStore();
const sourcesStore = useIntegrationSourcesStore();

const id = computed(() => route.params.integrationId as string | undefined);
const loaded = computed(() => integrationsStore.loaded && sourcesStore.loaded);
const integration = computed(() => (id.value ? integrationsStore.integrations?.find((entry) => entry._id === id.value) : undefined));
// "Add next step" from the canvas: start the new integration from an event, or from what another integration announces
const startFrom = computed(() => {
  const after = route.query.after as string | undefined;
  if (!after || id.value) return undefined;
  if (after.startsWith('event:')) {
    const [source, kind, eventName] = after.slice('event:'.length).split('|');
    return { signature: { source, kind, eventName }, needsAnnounce: false };
  }
  const list = (integrationsStore.integrations || []) as FullIntegration[];
  const previous = list.find((entry) => entry._id === after);
  if (!previous) return undefined;
  const announced = emits(previous);
  const names = Object.fromEntries((sourcesStore.result || []).map((source: any) => [source._id, source]));
  return {
    signature: announced ?? generateSignature(automationName(previous, names), allSignatures(list)),
    needsAnnounce: !announced,
    afterId: previous._id,
  };
});

const notFound = computed(() => loaded.value && !!id.value && !integration.value);
</script>

<template>
  <el-skeleton v-if="!loaded" :rows="8" animated class="loading" />

  <el-empty v-else-if="notFound" :description="$t('Integration not found')" :image-size="140">
    <el-button type="primary" @click="router.push({ name: 'integrations' })">{{ $t('Back to integrations') }}</el-button>
  </el-empty>

  <IntegrationEditor
    v-else
    :key="`${id || 'new'}:${route.query.type || ''}:${route.query.clone || ''}:${route.query.after || ''}`"
    :editing-integration="integration"
    :agent="!id && route.query.type === 'agent'"
    :pre-selected-source-id="route.query.sourceId as string | undefined"
    :clone="route.query.clone === 'true'"
    :start-from="startFrom"
  />
</template>

<style scoped>
.loading {
  padding: 24px;
}
</style>
