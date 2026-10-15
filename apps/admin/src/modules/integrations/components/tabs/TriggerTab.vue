<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { TriggerOperation, useIntegrationKindsTriggerOperations } from '@/modules/integrations/compositions/integration-kinds-operations';
import { IntegrationSourceKind, QelosTriggerOperation, OpenAITriggerOperation } from '@qelos/global-types';
import { ElMessage } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import eventsService, { IEvent } from '@/services/apis/events-service';
import { PLATFORM_EVENTS, PlatformEventDefinition } from '@/modules/integrations/constants/platform-events';
import FunctionParametersSchemaEditor from '@/modules/integrations/components/forms/FunctionParametersSchemaEditor.vue';
import ConnectionSelector from '@/modules/integrations/components/ConnectionSelector.vue';
import StepSection from '@/modules/integrations/components/steps/StepSection.vue';
import JsonDetails from '@/modules/integrations/components/steps/JsonDetails.vue';
import ChipButtons from '@/modules/integrations/components/steps/ChipButtons.vue';

const props = defineProps<{
  modelValue: any;
  integrationId?: string
}>();

const emit = defineEmits(['update:modelValue']);

const store = useIntegrationSourcesStore();
const triggerOperations = useIntegrationKindsTriggerOperations();
const integrationsStore = useIntegrationsStore();

const selectedTriggerOperation = ref<TriggerOperation>();
const recordThread = ref(false);
const webhookSamples = ref<IEvent[]>([]);
const webhookSamplesLoading = ref(false);
const webhookSamplesError = ref<string | null>(null);
const webhookSampleMetadata = ref('');
const webhookSampleLoading = ref(false);
const webhookSampleSelectedId = ref<string | null>(null);
let webhookSamplesLoadTimeout: ReturnType<typeof setTimeout> | null = null;

// Computed property for the chat completion URL
const getCompletionUrl = computed(() => {
  const baseUrl = `/api/ai/${props.integrationId}/chat-completion`;
  return recordThread.value ? `${baseUrl}/[threadId]` : baseUrl;
});

// Computed property for URL help text
const urlHelpText = computed(() => {
  if (!recordThread.value) {
    return "Use this URL to access your chat completion API endpoint";
  }
  return "Use this URL to access your chat completion API endpoint. Replace [threadId] with an existing thread ID or remove the threadId path segment to create a new thread automatically.";
});

// Computed property for the selected source
const selectedTriggerSource = computed(() => store.result?.find(s => s._id === props.modelValue.source));

const isQelosWebhook = computed(() => selectedTriggerSource.value?.kind === IntegrationSourceKind.Qelos && props.modelValue.operation === QelosTriggerOperation.webhook);

const isOpenAIFunctionCalling = computed(() => selectedTriggerSource.value?.kind === IntegrationSourceKind.OpenAI && props.modelValue.operation === OpenAITriggerOperation.functionCalling);
const isMcpTool = computed(() => selectedTriggerSource.value?.kind === IntegrationSourceKind.Qelos && props.modelValue.operation === QelosTriggerOperation.mcpTool);
const isToolCalling = computed(() => isOpenAIFunctionCalling.value || isMcpTool.value);

const isChatCompletion = computed(() => selectedTriggerSource.value?.kind === IntegrationSourceKind.Qelos && props.modelValue.operation === QelosTriggerOperation.chatCompletion);
const isApiWebhook = computed(() => props.modelValue.operation === QelosTriggerOperation.apiWebhook);
/** operations with their own fields; the others are edited as JSON directly */
const hasCustomForm = computed(() => isChatCompletion.value || isQelosWebhook.value || isToolCalling.value || isApiWebhook.value);
const operationsOfKind = computed(() => (selectedTriggerSource.value ? triggerOperations[selectedTriggerSource.value.kind] || [] : []));
const testOpen = ref(false);

const chosenFromSample = ref(false);
const canLoadWebhookSamples = computed(() => {
  if (!isQelosWebhook.value) return false;
  const details = props.modelValue.details || {};
  return Boolean(details.source && details.kind && details.eventName);
});

const platformEvents: PlatformEventDefinition[] = PLATFORM_EVENTS;

const platformEventSources = computed(() => Array.from(new Set(platformEvents.map(event => event.source))).sort());

type SuggestionFetcher = (queryString: string, cb: (data: { value: string }[]) => void) => void;

const createSuggestionFetcher = (valuesGetter: () => string[]): SuggestionFetcher => {
  return (queryString, cb) => {
    const normalized = queryString.trim().toLowerCase();
    const values = valuesGetter()
      .filter((value) => !normalized || value.toLowerCase().includes(normalized))
      .slice(0, 10)
      .map((value) => ({ value }));
    cb(values);
  };
};

const fetchSourceSuggestions = createSuggestionFetcher(() => platformEventSources.value);

const fetchKindSuggestions = createSuggestionFetcher(() => {
  const source = props.modelValue.details?.source;
  const kinds = platformEvents
    .filter((event) => !source || event.source === source)
    .map((event) => event.kind);
  return Array.from(new Set(kinds)).sort();
});

const fetchEventNameSuggestions = createSuggestionFetcher(() => {
  const { source, kind } = props.modelValue.details || {};
  const events = platformEvents
    .filter((event) => (!source || event.source === source) && (!kind || event.kind === kind))
    .map((event) => event.eventName);
  return Array.from(new Set(events)).sort();
});

// Use a ref for the trigger details JSON instead of a computed property
const triggerDetailsText = ref(JSON.stringify(props.modelValue.details || {}, null, 2));

const commitTriggerDetails = (details: Record<string, any>) => {
  const newModelValue = { ...props.modelValue };
  newModelValue.details = JSON.parse(JSON.stringify(details || {}));
  triggerDetailsText.value = JSON.stringify(newModelValue.details || {}, null, 2);
  emit('update:modelValue', newModelValue);
};

// Reactive refs for function calling form
const functionName = ref('');
const functionDescription = ref('');
const functionParameters = ref(JSON.stringify({
  "type": "object",
  "properties": {},
  "required": []
}, null, 2));
const allowedIntegrationIds = ref([]);
const blockedIntegrationIds = ref([]);
const integrationAccessCollapsed = ref(true);

const qelosChatIntegrations = computed(() => {
  return (integrationsStore.integrations || []).filter(
    (integration) =>
      integration.kind?.[0] === IntegrationSourceKind.Qelos &&
      integration.trigger?.operation === QelosTriggerOperation.chatCompletion
  );
});

const integrationSummary = (ids: string[], emptyLabel: string) => {
  if (!ids?.length) {
    return emptyLabel;
  }

  const names = ids
    .map((id) => qelosChatIntegrations.value.find((integration) => integration._id === id)?.trigger?.details?.name)
    .filter((name): name is string => Boolean(name));

  if (!names.length) {
    return `${ids.length} selected`;
  }

  if (names.length === 1) {
    return names[0];
  }

  return `${names[0]} + ${ids.length - 1} more`;
};

const allowedIntegrationsSummary = computed(() => integrationSummary(allowedIntegrationIds.value, 'All integrations'));
const blockedIntegrationsSummary = computed(() => integrationSummary(blockedIntegrationIds.value, 'No blocked integrations'));

// Copy text to clipboard
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      ElMessage.success('Copied to clipboard');
    })
    .catch(() => {
      ElMessage.error('Failed to copy');
    });
};

// Update trigger details from JSON text
const updateTriggerDetails = (value: string) => {
  try {
    triggerDetailsText.value = value;
    const newModelValue = { ...props.modelValue };
    newModelValue.details = JSON.parse(value);
    emit('update:modelValue', newModelValue);
  } catch (e) {
    // Invalid JSON, ignore
  }
};

const scheduleWebhookSamplesLoad = (immediate = false) => {
  if (webhookSamplesLoadTimeout) {
    clearTimeout(webhookSamplesLoadTimeout);
    webhookSamplesLoadTimeout = null;
  }

  if (!canLoadWebhookSamples.value || !isQelosWebhook.value) {
    return;
  }

  webhookSamplesLoadTimeout = setTimeout(() => {
    webhookSamplesLoadTimeout = null;
    loadWebhookSamples();
  }, immediate ? 0 : 600);
};

type WebhookField = 'source' | 'kind' | 'eventName';

const updateWebhookDetail = (field: WebhookField, value: string) => {
  const details = { ...(props.modelValue.details || {}) };
  details[field] = value;
  commitTriggerDetails(details);
};

const loadWebhookSamples = async () => {
  if (!canLoadWebhookSamples.value) {
    webhookSamplesError.value = 'Fill source, kind, and event name to search for events.';
    return;
  }

  chosenFromSample.value = false;
  webhookSamplesLoading.value = true;
  webhookSamplesError.value = null;
  webhookSampleMetadata.value = '';
  webhookSampleSelectedId.value = null;

  try {
    const details = props.modelValue.details || {};
    const response = await eventsService.getAll({
      source: details.source,
      kind: details.kind,
      eventName: details.eventName,
      period: 'last-month',
      page: 0,
    });
    // the endpoint answers with { events, … }, not a bare list
    webhookSamples.value = response?.events || [];
  } catch (error: any) {
    webhookSamplesError.value = error?.message || 'Failed to load webhook events.';
    webhookSamples.value = [];
  } finally {
    webhookSamplesLoading.value = false;
  }
};

const previewWebhookSample = async (sample: IEvent) => {
  webhookSampleSelectedId.value = sample._id;
  webhookSampleLoading.value = true;
  webhookSampleMetadata.value = '';
  webhookSamplesError.value = null;

  try {
    const event = await eventsService.getOne(sample._id);
    webhookSampleMetadata.value = JSON.stringify(event || {}, null, 2);
  } catch (error: any) {
    webhookSamplesError.value = error?.message || 'Failed to load sample payload.';
  } finally {
    webhookSampleLoading.value = false;
  }
};

const applyWebhookSampleDetails = (sample: IEvent) => {
  const details = { ...(props.modelValue.details || {}) };
  details.source = sample.source;
  details.kind = sample.kind;
  details.eventName = sample.eventName;
  commitTriggerDetails(details);
  chosenFromSample.value = true;
};

const formatEventTimestamp = (value?: string | Date) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (error) {
    return typeof value === 'string' ? value : new Date(value).toISOString();
  }
};

// Update function calling / MCP tool details (both share the name/description/parameters JSON-schema shape)
const updateFunctionCallingDetails = () => {
  let parameters: any = {};
  try {
    parameters = JSON.parse(functionParameters.value);
  } catch (e) {
    // Default to empty object if JSON is invalid, but still update name/description
  }

  const newModelValue = { ...props.modelValue };
  newModelValue.details = {
    ...newModelValue.details,
    name: functionName.value,
    description: functionDescription.value,
    parameters,
    // allow/block lists only apply to OpenAI function-calling consumers; MCP tool
    // exposure is controlled via the MCP configuration's exposedTools instead.
    ...(isMcpTool.value ? {} : {
      allowedIntegrationIds: allowedIntegrationIds.value,
      blockedIntegrationIds: blockedIntegrationIds.value
    })
  };
  emit('update:modelValue', newModelValue);
};

// Handle source change
const handleSourceChange = () => {
  const newModelValue = { ...props.modelValue };
  newModelValue.operation = '';
  newModelValue.details = {};
  triggerDetailsText.value = JSON.stringify(newModelValue.details, null, 2);
  emit('update:modelValue', newModelValue);
};

// Handle operation change
const handleOperationChange = () => {
  if (!selectedTriggerSource.value) return;
  
  const operation = triggerOperations[selectedTriggerSource.value?.kind]?.find(o => o.name === props.modelValue.operation);
  selectedTriggerOperation.value = operation;
  
  const newModelValue = { ...props.modelValue };

  // Special handling for OpenAI function calling / Qelos MCP tool (share the same tool-calling shape)
  if (isToolCalling.value) {
    newModelValue.details = {
      name: '',
      description: '',
      parameters: {
        "type": "object",
        "properties": {},
        "required": []
      },
      ...operation?.details
    };
  } else {
    newModelValue.details = JSON.parse(JSON.stringify(operation?.details || {}));
  }
  
  triggerDetailsText.value = JSON.stringify(newModelValue.details || {}, null, 2);
  emit('update:modelValue', newModelValue);
};

// Set trigger details from option
const setTriggerDetails = (optionValue: any) => {
  commitTriggerDetails(optionValue);
};

// Update recordThread setting in the model details
const updateRecordThreadSetting = () => {
  const details = { ...(props.modelValue.details || {}) };
  details.recordThread = recordThread.value;
  commitTriggerDetails(details);
};

// Initialize the UI when the component is mounted
onMounted(() => {
  if (selectedTriggerSource.value && props.modelValue.operation) {
    const operation = triggerOperations[selectedTriggerSource.value?.kind]?.find(o => o.name === props.modelValue.operation);
    selectedTriggerOperation.value = operation;
    
    // Initialize function calling / MCP tool form fields
    if (isToolCalling.value) {
      const details = props.modelValue.details || {};
      functionName.value = details.name || '';
      functionDescription.value = details.description || '';
      functionParameters.value = JSON.stringify(details.parameters || {
        "type": "object",
        "properties": {},
        "required": []
      }, null, 2);
      allowedIntegrationIds.value = details.allowedIntegrationIds || [];
      blockedIntegrationIds.value = details.blockedIntegrationIds || [];
    }
    
    // Initialize recordThread value from model details if available
    if (selectedTriggerSource.value?.kind === IntegrationSourceKind.Qelos && 
        props.modelValue.operation === QelosTriggerOperation.chatCompletion) {
      const details = props.modelValue.details || {};
      recordThread.value = !!details.recordThread;
    }
  }
});

onBeforeUnmount(() => {
  if (webhookSamplesLoadTimeout) {
    clearTimeout(webhookSamplesLoadTimeout);
    webhookSamplesLoadTimeout = null;
  }
});

watch(
  () => props.modelValue.details,
  (details) => {
    triggerDetailsText.value = JSON.stringify(details || {}, null, 2);
  },
  { deep: true }
);

watch(
  () => [
    isQelosWebhook.value,
    props.modelValue.details?.source,
    props.modelValue.details?.kind,
    props.modelValue.details?.eventName
  ],
  () => {
    webhookSamples.value = [];
    webhookSampleMetadata.value = '';
    webhookSampleSelectedId.value = null;
    webhookSamplesError.value = null;
    if (isQelosWebhook.value && canLoadWebhookSamples.value && !chosenFromSample.value) {
      scheduleWebhookSamplesLoad();
    } else if (webhookSamplesLoadTimeout) {
      clearTimeout(webhookSamplesLoadTimeout);
      webhookSamplesLoadTimeout = null;
    }
  }
);
</script>

<template>
  <div class="trigger-step">
    <ConnectionSelector
      v-model="modelValue.source"
      section-title="Connection"
      field-label="Connection that will trigger this workflow"
      description="Choose which connection will start this workflow."
      @change="handleSourceChange"
    />

    <StepSection v-if="selectedTriggerSource" :title="$t('Operation')">
      <el-select v-model="modelValue.operation" :placeholder="$t('Choose what starts the workflow')" class="full" :aria-label="$t('Operation')" @change="handleOperationChange">
        <el-option v-for="operation in operationsOfKind" :key="operation.name" :value="operation.name" :label="operation.label" />
      </el-select>
      <ChipButtons v-if="selectedTriggerOperation?.options" :items="selectedTriggerOperation.options" :label="$t('Presets')" @pick="setTriggerDetails($event.value)" />
    </StepSection>

    <StepSection v-if="modelValue.operation" :title="$t('Configuration')">
      <!-- Qelos chat completion -->
      <template v-if="isChatCompletion">
        <el-form label-position="top" class="form" @submit.prevent>
          <el-form-item :label="$t('Agent name')"><el-input v-model="modelValue.details.name" dir="auto" @input="updateTriggerDetails" /></el-form-item>
          <el-form-item :label="$t('Agent description')"><el-input v-model="modelValue.details.description" dir="auto" @input="updateTriggerDetails" /></el-form-item>
        </el-form>

        <div v-if="props.integrationId" class="url-block">
          <span class="field-label">{{ $t('Chat completion URL') }}</span>
          <el-input :model-value="getCompletionUrl" readonly dir="ltr" class="url">
            <template #append><el-button @click="copyToClipboard(getCompletionUrl)">{{ $t('Copy') }}</el-button></template>
          </el-input>
          <p class="hint">{{ urlHelpText }}</p>
          <el-switch v-model="recordThread" :active-text="$t('Record conversation threads')" @change="updateRecordThreadSetting" />
          <p class="hint">{{ $t('Conversations are stored as threads, and the URL takes a threadId to continue an existing one.') }}</p>
        </div>
        <p v-else class="hint">{{ $t('The chat completion URL will be available after saving the integration') }}</p>
      </template>

      <!-- Qelos webhook -->
      <template v-else-if="isQelosWebhook">
        <el-form label-position="top" class="grid3" @submit.prevent>
          <el-form-item :label="$t('Source')" required>
            <el-autocomplete :model-value="modelValue.details?.source || ''" :fetch-suggestions="fetchSourceSuggestions" highlight-first-item placeholder="auth" dir="ltr" @input="(val) => updateWebhookDetail('source', val as string)" @select="(item) => updateWebhookDetail('source', item.value)" />
          </el-form-item>
          <el-form-item :label="$t('Kind')" required>
            <el-autocomplete :model-value="modelValue.details?.kind || ''" :fetch-suggestions="fetchKindSuggestions" highlight-first-item placeholder="signup" dir="ltr" @input="(val) => updateWebhookDetail('kind', val as string)" @select="(item) => updateWebhookDetail('kind', item.value)" />
          </el-form-item>
          <el-form-item :label="$t('Event name')" required>
            <el-autocomplete :model-value="modelValue.details?.eventName || ''" :fetch-suggestions="fetchEventNameSuggestions" highlight-first-item placeholder="user-registered" dir="ltr" @input="(val) => updateWebhookDetail('eventName', val as string)" @select="(item) => updateWebhookDetail('eventName', item.value)" />
          </el-form-item>
        </el-form>
        <p class="hint">{{ $t('Pick from the platform events, or type your own.') }} <a href="https://docs.qelos.io/plugin-play/events#complete-event-list" target="_blank" rel="noopener noreferrer">{{ $t('See the full list') }}</a></p>

        <div class="test">
          <button type="button" class="test-toggle" :aria-expanded="testOpen" @click="testOpen = !testOpen; if (testOpen && canLoadWebhookSamples && !webhookSamples.length) loadWebhookSamples()">
            <font-awesome-icon :icon="['fas', testOpen ? 'chevron-down' : 'chevron-right']" class="chev" aria-hidden="true" />
            {{ $t('Test this trigger') }}
            <span v-if="webhookSamples.length" class="count">{{ webhookSamples.length }}</span>
          </button>
          <div v-if="testOpen" class="test-body">
            <p class="hint">{{ $t('Events with these identifiers from the last month. Use one to fill the fields, or look at its payload to plan the next steps.') }}</p>
            <el-alert v-if="webhookSamplesError" type="error" show-icon :closable="false" :title="webhookSamplesError" />
            <el-button v-if="!webhookSamplesLoading" :disabled="!canLoadWebhookSamples" @click="loadWebhookSamples">{{ $t('Check again') }}</el-button>
            <el-table v-if="webhookSamples.length || webhookSamplesLoading" v-loading="webhookSamplesLoading" :data="webhookSamples" size="small" class="samples">
              <el-table-column prop="eventName" :label="$t('Event')" min-width="140" />
              <el-table-column :label="$t('Received')" min-width="150"><template #default="{ row }">{{ formatEventTimestamp(row.created) }}</template></el-table-column>
              <el-table-column min-width="190" align="end">
                <template #default="{ row }">
                  <el-button link type="primary" :loading="webhookSampleLoading && webhookSampleSelectedId === row._id" @click="previewWebhookSample(row)">{{ $t('Preview payload') }}</el-button>
                  <el-button link @click="applyWebhookSampleDetails(row)">{{ $t('Use event') }}</el-button>
                </template>
              </el-table-column>
            </el-table>
            <p v-else-if="!webhookSamplesLoading && canLoadWebhookSamples" class="hint">{{ $t('No matching events in the last month.') }}</p>
            <pre v-if="webhookSampleMetadata" class="payload" dir="ltr">{{ webhookSampleMetadata }}</pre>
          </div>
        </div>
      </template>

      <!-- OpenAI function calling / Qelos MCP tool -->
      <template v-else-if="isToolCalling">
        <p class="hint">{{ isMcpTool ? $t('The tool that will be exposed on the MCP server. Its parameters are a JSON schema.') : $t('The function OpenAI can call. Its parameters are a JSON schema.') }}</p>
        <el-form label-position="top" class="form" @submit.prevent>
          <el-form-item :label="$t('Function name')" required>
            <el-input v-model="functionName" dir="ltr" placeholder="get_weather" @input="updateFunctionCallingDetails" />
            <p class="hint">{{ $t('A unique name the model will call it by.') }}</p>
          </el-form-item>
          <el-form-item :label="$t('Description')" required>
            <el-input v-model="functionDescription" type="textarea" :rows="2" dir="auto" :placeholder="$t('What it does and when to use it')" @input="updateFunctionCallingDetails" />
          </el-form-item>
          <FunctionParametersSchemaEditor v-model="functionParameters" @update:modelValue="updateFunctionCallingDetails" />

          <div v-if="!isMcpTool" class="access">
            <button type="button" class="test-toggle" :aria-expanded="!integrationAccessCollapsed" @click="integrationAccessCollapsed = !integrationAccessCollapsed">
              <font-awesome-icon :icon="['fas', integrationAccessCollapsed ? 'chevron-right' : 'chevron-down']" class="chev" aria-hidden="true" />
              {{ $t('Which agents may call it') }}
              <span class="count">{{ allowedIntegrationsSummary }}</span>
            </button>
            <div v-if="!integrationAccessCollapsed" class="test-body">
              <el-form-item :label="$t('Allowed agents')">
                <el-select v-model="allowedIntegrationIds" multiple filterable collapse-tags-tooltip :placeholder="$t('All agents')" class="full" @change="updateFunctionCallingDetails">
                  <el-option v-for="integration in qelosChatIntegrations" :key="integration._id" :label="integration.trigger.details?.name || $t('No name')" :value="integration._id" />
                </el-select>
                <p class="hint">{{ $t('Leave empty to allow every agent.') }}</p>
              </el-form-item>
              <el-form-item :label="$t('Blocked agents')">
                <el-select v-model="blockedIntegrationIds" multiple filterable collapse-tags-tooltip :placeholder="$t('None')" class="full" @change="updateFunctionCallingDetails">
                  <el-option v-for="integration in qelosChatIntegrations" :key="integration._id" :label="integration.trigger.details?.name || $t('No name')" :value="integration._id" />
                </el-select>
              </el-form-item>
            </div>
          </div>
        </el-form>
      </template>

      <!-- API webhook -->
      <el-form v-else-if="isApiWebhook" label-position="top" class="form" @submit.prevent>
        <p class="hint">{{ $t('API Webhook triggers are configured in the Integrations tab.') }}</p>
        <el-form-item :label="$t('Webhook name')">
          <el-input v-model="modelValue.details.name" dir="auto" :placeholder="$t('Enter a nickname for this webhook')" @input="updateTriggerDetails" />
        </el-form-item>
      </el-form>

      <!-- everything else is the JSON of the step -->
      <Monaco v-else :modelValue="triggerDetailsText" @update:modelValue="updateTriggerDetails" height="300px" language="json" />

      <JsonDetails v-if="hasCustomForm" :model-value="triggerDetailsText" @update:model-value="updateTriggerDetails" />
    </StepSection>
  </div>
</template>

<style scoped lang="scss">
.trigger-step {
  padding-block: 4px;
}

.full {
  inline-size: 100%;
}

.form,
.grid3 {
  max-inline-size: 640px;
}

.grid3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 14px;
  max-inline-size: none;

  :deep(.el-autocomplete) {
    inline-size: 100%;
  }
}

.hint {
  margin: 4px 0 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
  text-align: start;

  a {
    color: var(--el-color-primary);
  }
}

.field-label {
  font-size: 0.9rem;
  font-weight: 600;
}

.url-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  max-inline-size: 640px;

  .url {
    font-family: var(--el-font-family-mono, ui-monospace, monospace);
  }
}

.test,
.access {
  max-inline-size: 760px;
}

.test-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .chev {
    inline-size: 10px;
  }

  .count {
    padding: 0 8px;
    border-radius: 999px;
    background: var(--el-fill-color);
    color: var(--el-text-color-secondary);
    font-size: 0.78rem;
    font-weight: 400;
  }
}

.test-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding-block: 8px 4px;

  .samples,
  :deep(.el-alert) {
    inline-size: 100%;
  }
}

.payload {
  inline-size: 100%;
  max-block-size: 260px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  font-size: 0.82rem;
  text-align: start;
}

@media (max-width: 820px) {
  .grid3 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
