<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import Monaco from '@/modules/users/components/Monaco.vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';

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
  <div class="trigger-response-tab">
    <el-alert
      type="info"
      :closable="false"
      class="mb-3"
    >
      {{ $t('Use trigger responses to broadcast platform events once your target finishes its work.') }}
    </el-alert>

    <div class="enable-card">
      <div>
        <h4>{{ $t('Trigger response automation') }}</h4>
        <p class="help-text">{{ $t('Send a platform event whenever this target succeeds so other integrations can react immediately.') }}</p>
      </div>
      <div class="enable-switch">
        <span class="status-text" :class="{ active: isTriggerResponseEnabled }">
          {{ isTriggerResponseEnabled ? $t('Enabled') : $t('Disabled') }}
        </span>
        <el-switch v-model="triggerResponseToggle" :active-text="$t('On')" :inactive-text="$t('Off')" />
      </div>
    </div>

    <div v-if="!modelValue?.source" class="empty-target-state">
      <p>
        {{ $t('Select and configure a target connection first to unlock trigger responses.') }}
      </p>
    </div>

    <div v-else-if="!isTriggerResponseEnabled" class="empty-trigger-response-state">
      <h4>{{ $t('Trigger response is disabled') }}</h4>
      <p>{{ $t('Emit an event only when you need other integrations to react to this target output.') }}</p>
      <el-button type="primary" @click="enableTriggerResponse">
        {{ $t('Enable trigger response') }}
      </el-button>
    </div>

    <div v-else class="config-sections">
      <div class="section-card">
        <div class="event-status">
          <div class="status-left">
            <el-tag :type="isEventReady ? 'success' : 'warning'">
              {{ isEventReady ? $t('Ready to emit') : $t('Missing details') }}
            </el-tag>
            <span class="signature-text">{{ eventSignature }}</span>
          </div>
          <div class="status-actions">
            <el-button text size="small" :disabled="!isEventReady" @click="copySignature">
              {{ $t('Copy signature') }}
            </el-button>
            <el-button text type="danger" size="small" @click="clearTriggerResponse">
              {{ $t('Disable trigger response') }}
            </el-button>
          </div>
        </div>

        <el-alert
          v-if="missingFields.length"
          type="warning"
          :closable="false"
          class="mb-3"
        >
          {{ $t('Please fill the following fields:') }} {{ missingFields.join(', ') }}
        </el-alert>

        <h4 class="section-title">{{ $t('Event definition') }}</h4>
        <p class="help-text">{{ $t('Describe the platform event that will be emitted when the target succeeds.') }}</p>

        <el-form label-position="top">
          <el-row :gutter="16">
            <el-col :md="12" :sm="24">
              <el-form-item :label="$t('Source identifier')" :required="true">
                <el-input v-model="triggerSource" placeholder="e.g., auth, ai, no-code" />
                <small class="help-text">{{ $t('Matches the source configured on the listening trigger.') }}</small>
              </el-form-item>
            </el-col>
            <el-col :md="12" :sm="24">
              <el-form-item :label="$t('Kind / channel')" :required="true">
                <el-input v-model="triggerKind" placeholder="e.g., workspace, quota, blueprints" />
                <small class="help-text">{{ $t('Use a domain specific grouping so events stay organized.') }}</small>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :md="12" :sm="24">
              <el-form-item :label="$t('Event name')" :required="true">
                <el-input v-model="triggerEventName" placeholder="e.g., webhook-called, quota-exceeded" />
              </el-form-item>
            </el-col>
            <el-col :md="12" :sm="24">
              <el-form-item :label="$t('Description')">
                <el-input v-model="triggerDescription" placeholder="{{ $t('Short human readable summary') }}" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <div class="dual-columns">
        <div class="section-card">
          <h4>{{ $t('Metadata') }}</h4>
          <p class="help-text">{{ $t('Add any JSON payload you want to accompany the event.') }}</p>
          <Monaco
            :model-value="metadataText"
            language="json"
            height="220px"
            @update:modelValue="updateMetadata"
          />
        </div>
        <div class="section-card preview-card">
          <h4>{{ $t('Event preview') }}</h4>
          <p class="help-text">{{ $t('This is what downstream triggers will receive.') }}</p>
          <pre>{{ JSON.stringify(eventPreview, null, 2) }}</pre>
        </div>
      </div>

      <div class="section-card demo-card">
        <div class="section-header">
          <div>
            <h4>{{ $t('Platform event sample') }}</h4>
            <p class="help-text">{{ $t('Use this object as a reference when mapping trigger listeners or debugging.') }}</p>
          </div>
        </div>
        <pre>{{ JSON.stringify(eventExample, null, 2) }}</pre>
      </div>

      <div class="section-card">
        <div class="section-header">
          <div>
            <h4>{{ $t('Listening integrations') }}</h4>
            <p>{{ $t('Every integration whose trigger matches this event will appear here.') }}</p>
          </div>
          <div class="listeners-pill" v-if="isEventReady">
            <el-tag type="info">{{ dependentIntegrations.length }} {{ $t('listener(s)') }}</el-tag>
          </div>
        </div>

        <el-empty
          v-if="!triggerSource || !triggerKind || !triggerEventName"
          :description="$t('Provide source, kind and event name to see listeners')"
        />

        <el-empty
          v-else-if="!dependentIntegrations.length"
          :description="$t('No integrations listen to this event yet')"
        >
          <span>
            {{ $t('Use this section as a quick way to discover consumers once they exist.') }}
          </span>
        </el-empty>

        <div v-else class="listeners-grid">
          <div v-for="integration in dependentIntegrations" :key="integration._id" class="listener-card">
            <div class="listener-header">
              <strong>{{ integration.trigger.details?.name || sourcesById[integration.trigger.source]?.name || $t('Unnamed trigger') }}</strong>
              <el-tag v-if="integration.active" type="success" size="small">{{ $t('Active') }}</el-tag>
              <el-tag v-else type="info" size="small">{{ $t('Paused') }}</el-tag>
            </div>
            <p class="listener-description">
              {{ integration.trigger.details?.description || $t('No description provided') }}
            </p>
            <div class="listener-meta">
              <span>{{ $t('Target') }}: {{ sourcesById[integration.target.source]?.name || $t('Unknown') }}</span>
              <span>ID: {{ integration._id }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trigger-response-tab {
  padding: 10px 0;
}

.enable-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.enable-switch {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-text {
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.status-text.active {
  color: var(--el-color-success);
}

.section-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  background: var(--el-bg-color);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.section-header h4 {
  margin: 0;
}

.help-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 4px;
}

.dual-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.preview-card pre {
  background: var(--el-color-info-light-9);
  border-radius: 6px;
  padding: 12px;
  margin: 0;
  max-height: 240px;
  overflow: auto;
  font-size: 12px;
}

.demo-card pre {
  background: var(--el-color-info-light-9);
  border-radius: 6px;
  padding: 12px;
  margin: 0;
  font-size: 12px;
  overflow-x: auto;
}

.event-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.signature-text {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.status-actions {
  display: flex;
  gap: 6px;
}

.listeners-pill {
  align-self: center;
}

.listeners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.listener-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 12px;
  background: var(--el-bg-color-page);
}

.listener-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.listener-description {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0 0 8px 0;
}

.listener-meta {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  gap: 4px;
}

.empty-target-state {
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  color: var(--el-text-color-secondary);
}
</style>
