<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import StepSection from '@/modules/integrations/components/steps/StepSection.vue';
import JsonDetails from '@/modules/integrations/components/steps/JsonDetails.vue';

const props = defineProps<{
  modelValue: any;
  integrationId?: string;
}>();

const emit = defineEmits(['update:modelValue']);

const integrationsStore = useIntegrationsStore();
const sourcesStore = useIntegrationSourcesStore();

const metadataText = ref('{}');

const sourcesById = computed(() => {
  if (!sourcesStore.result) return {} as Record<string, any>;
  return sourcesStore.result.reduce((acc, source) => {
    acc[source._id] = source;
    return acc;
  }, {} as Record<string, any>);
});

const triggerResponseDefaults = Object.freeze({
  source: '',
  kind: '',
  eventName: '',
  description: '',
  metadata: {}
});

const triggerResponse = computed(() => props.modelValue?.details?.triggerResponse);
const isTriggerResponseEnabled = computed(() => !!triggerResponse.value);
const missingFields = computed(() => {
  if (!isTriggerResponseEnabled.value) return [] as string[];
  const missing: string[] = [];
  if (!triggerResponse.value?.source) missing.push('source');
  if (!triggerResponse.value?.kind) missing.push('kind');
  if (!triggerResponse.value?.eventName) missing.push('eventName');
  return missing;
});
const isEventReady = computed(() => isTriggerResponseEnabled.value && missingFields.value.length === 0);
const eventSignature = computed(() => {
  if (!triggerResponse.value) return '— · — · —';
  return [triggerResponse.value.source || '—', triggerResponse.value.kind || '—', triggerResponse.value.eventName || '—'].join(' · ');
});

watch(() => triggerResponse.value, (value) => {
  metadataText.value = JSON.stringify(value?.metadata || {}, null, 2);
}, { immediate: true, deep: true });

const updateTriggerResponse = (patch: Record<string, any>) => {
  const newModelValue = {
    ...props.modelValue,
    details: {
      ...(props.modelValue?.details || {})
    }
  };

  const nextTriggerResponse = {
    ...(newModelValue.details.triggerResponse || { ...triggerResponseDefaults }),
    ...patch
  };

  if (!nextTriggerResponse.metadata) {
    nextTriggerResponse.metadata = {};
  }

  newModelValue.details.triggerResponse = nextTriggerResponse;
  emit('update:modelValue', newModelValue);
};

const clearTriggerResponse = () => {
  if (!props.modelValue?.details?.triggerResponse) return;
  const newModelValue = {
    ...props.modelValue,
    details: {
      ...(props.modelValue?.details || {})
    }
  };
  delete newModelValue.details.triggerResponse;
  emit('update:modelValue', newModelValue);
  metadataText.value = '{}';
};

const enableTriggerResponse = () => {
  if (props.modelValue?.details?.triggerResponse) return;
  updateTriggerResponse({ ...triggerResponseDefaults });
};

const triggerResponseToggle = computed({
  get: () => isTriggerResponseEnabled.value,
  set: (value: boolean) => {
    if (value) enableTriggerResponse();
    else clearTriggerResponse();
  }
});

const triggerSource = computed({
  get: () => triggerResponse.value?.source || '',
  set: (value: string) => updateTriggerResponse({ source: value })
});

const triggerKind = computed({
  get: () => triggerResponse.value?.kind || '',
  set: (value: string) => updateTriggerResponse({ kind: value })
});

const triggerEventName = computed({
  get: () => triggerResponse.value?.eventName || '',
  set: (value: string) => updateTriggerResponse({ eventName: value })
});

const triggerDescription = computed({
  get: () => triggerResponse.value?.description || '',
  set: (value: string) => updateTriggerResponse({ description: value })
});

const eventPreview = computed(() => ({
  source: triggerSource.value || '<source>',
  kind: triggerKind.value || '<kind>',
  eventName: triggerEventName.value || '<event-name>',
  description: triggerDescription.value || '<description>',
  metadata: triggerResponse.value?.metadata || {}
}));

const updateMetadata = (value: string) => {
  metadataText.value = value;
  try {
    const parsed = JSON.parse(value || '{}');
    updateTriggerResponse({ metadata: parsed });
  } catch (e) {
    // ignore invalid JSON until it is valid
  }
};

const eventExample = computed(() => ({
  tenant: 'TENANT_ID',
  source: triggerSource.value || 'source-id',
  kind: triggerKind.value || 'event-kind',
  eventName: triggerEventName.value || 'event-name',
  description: triggerDescription.value || 'Human readable summary',
  metadata: {
    ...((triggerResponse.value?.metadata as Record<string, any>) || {}),
    status: 200,
    body: '{...target response body...}'
  }
}));

const copySignature = () => {
  if (!isEventReady.value) return;
  navigator.clipboard.writeText(`${triggerSource.value}:${triggerKind.value}:${triggerEventName.value}`)
    .then(() => ElMessage.success('Event signature copied'))
    .catch(() => ElMessage.error('Failed to copy event signature'));
};

const dependentIntegrations = computed(() => {
  if (!triggerSource.value || !triggerKind.value || !triggerEventName.value) {
    return [];
  }
  return (integrationsStore.integrations || []).filter((integration) => {
    if (integration._id === props.integrationId) return false;
    const details = integration.trigger?.details || {};
    return details.source === triggerSource.value &&
      details.kind === triggerKind.value &&
      details.eventName === triggerEventName.value;
  });
});
</script>

<template>
  <div class="trigger-response">
    <StepSection :title="$t('Announce an event when this succeeds')" :hint="$t('Other integrations can listen for it and run next.')">
      <template #aside>
        <el-switch v-model="triggerResponseToggle" :disabled="!modelValue?.source" :aria-label="$t('Announce an event when this succeeds')" />
      </template>
      <p v-if="!modelValue?.source" class="hint">{{ $t('Select and configure a target connection first to unlock trigger responses.') }}</p>
    </StepSection>

    <template v-if="modelValue?.source && isTriggerResponseEnabled">
      <StepSection :title="$t('The event')">
        <el-form label-position="top" class="grid" @submit.prevent>
          <el-form-item :label="$t('Source')" required>
            <el-input v-model="triggerSource" dir="ltr" placeholder="integrations" />
          </el-form-item>
          <el-form-item :label="$t('Kind')" required>
            <el-input v-model="triggerKind" dir="ltr" placeholder="orders" />
          </el-form-item>
          <el-form-item :label="$t('Event name')" required>
            <el-input v-model="triggerEventName" dir="ltr" placeholder="order-created" />
          </el-form-item>
        </el-form>
        <p class="hint">{{ $t('A trigger listens for this event by the same source, kind and event name.') }}</p>
        <el-form label-position="top" class="wide" @submit.prevent>
          <el-form-item :label="$t('Description')"><el-input v-model="triggerDescription" dir="auto" :placeholder="$t('Short human readable summary')" /></el-form-item>
        </el-form>
        <div class="status">
          <el-tag :type="isEventReady ? 'success' : 'warning'" effect="light">{{ isEventReady ? $t('Ready to emit') : $t('Missing details') }}</el-tag>
          <code dir="ltr">{{ eventSignature }}</code>
          <el-button text size="small" :disabled="!isEventReady" @click="copySignature">{{ $t('Copy signature') }}</el-button>
        </div>
        <p v-if="missingFields.length" class="warn" role="alert">{{ $t('Please fill the following fields:') }} {{ missingFields.join(', ') }}</p>
      </StepSection>

      <StepSection :title="$t('What listeners will receive')" :hint="$t('The event with the target response added to its metadata.')">
        <pre class="payload" dir="ltr">{{ JSON.stringify(eventExample, null, 2) }}</pre>
        <JsonDetails :label="$t('Add your own metadata')" height="160px" :model-value="metadataText" @update:model-value="updateMetadata" />
      </StepSection>

      <StepSection :title="$t('Listeners')" :hint="$t('Every integration whose trigger matches this event.')">
        <p v-if="!isEventReady" class="hint">{{ $t('Provide source, kind and event name to see listeners') }}</p>
        <p v-else-if="!dependentIntegrations.length" class="hint">{{ $t('No integrations listen to this event yet') }}</p>
        <ul v-else class="listeners">
          <li v-for="integration in dependentIntegrations" :key="integration._id">
            <div class="who">
              <router-link :to="{ name: 'integration-edit', params: { integrationId: integration._id } }" dir="auto">{{ integration.trigger.details?.name || sourcesById[integration.trigger.source]?.name || $t('Unnamed trigger') }}</router-link>
              <span class="sub">{{ $t('Target') }}: {{ sourcesById[integration.target.source]?.name || $t('Unknown') }}</span>
            </div>
            <el-tag :type="integration.active ? 'success' : 'info'" size="small" effect="light">{{ integration.active ? $t('Active') : $t('Paused') }}</el-tag>
          </li>
        </ul>
      </StepSection>
    </template>
  </div>
</template>

<style scoped lang="scss">
.trigger-response {
  padding-block: 4px;
}

.hint {
  margin: 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
}

.warn {
  margin: 0;
  color: var(--el-color-warning-dark-2, var(--el-color-warning));
  font-size: 0.85rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 14px;
}

.wide {
  max-inline-size: 640px;
}

.status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;

  code {
    color: var(--el-text-color-secondary);
    font-size: 0.85rem;
  }
}

.payload {
  max-block-size: 300px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  font-size: 0.82rem;
  text-align: start;
}

.listeners {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
  }

  a {
    color: var(--el-text-color-primary);
    font-weight: 600;
    text-decoration: none;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

.who {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.sub {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

@media (max-width: 820px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
