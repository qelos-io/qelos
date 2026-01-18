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
    const events = await eventsService.getAll({
      source: details.source,
      kind: details.kind,
      eventName: details.eventName,
      period: 'last-month',
      page: 0,
    });
    webhookSamples.value = events;
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

// Update function calling details
const updateFunctionCallingDetails = () => {
  try {
    const parameters = JSON.parse(functionParameters.value);
    const newModelValue = { ...props.modelValue };
    newModelValue.details = {
      ...newModelValue.details,
      name: functionName.value,
      description: functionDescription.value,
      parameters: parameters,
      allowedIntegrationIds: allowedIntegrationIds.value,
      blockedIntegrationIds: blockedIntegrationIds.value
    };
    emit('update:modelValue', newModelValue);
  } catch (e) {
    // Still update name and description even if parameters are invalid
    const newModelValue = { ...props.modelValue };
    newModelValue.details = {
      ...newModelValue.details,
      name: functionName.value,
      description: functionDescription.value,
      parameters: {}, // Default to empty object if JSON is invalid
      allowedIntegrationIds: allowedIntegrationIds.value,
      blockedIntegrationIds: blockedIntegrationIds.value
    };
    emit('update:modelValue', newModelValue);
  }
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
  
  // Special handling for OpenAI function calling
  if (selectedTriggerSource.value?.kind === IntegrationSourceKind.OpenAI && 
      props.modelValue.operation === OpenAITriggerOperation.functionCalling) {
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
    
    // Initialize function calling form fields if we're in functionCalling mode
    if (selectedTriggerSource.value?.kind === IntegrationSourceKind.OpenAI && 
        props.modelValue.operation === OpenAITriggerOperation.functionCalling) {
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

<style>
.webhook-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.webhook-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-block-start: 8px;
}

.webhook-alert {
  margin-block-start: 12px;
}

.webhook-samples {
  margin-block-start: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.webhook-samples-table {
  width: 100%;
}

.webhook-sample-metadata {
  margin-block-start: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.webhook-sample-textarea :deep(textarea) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
</style>

<template>
  <div class="trigger-container">
    <el-alert type="info" :closable="false" class="mb-3">
      {{ $t('Configure the trigger that will start this workflow.') }}
    </el-alert>
    
    <ConnectionSelector
      v-model="modelValue.source"
      section-title="Connection"
      field-label="Connection that will trigger this workflow"
      description="Choose which connection will start this workflow."
      @change="handleSourceChange"
    />
    
    <!-- Operation Selection -->
    <div v-if="selectedTriggerSource" class="section-container">
      <h4>{{ $t('Operation') }}</h4>
      <FormInput v-model="modelValue.operation"
               type="select"
               :options="triggerOperations[selectedTriggerSource?.kind] || []"
               option-value="name"
               option-label="label"
               @change="handleOperationChange"
               label="Operation that will trigger this workflow"/>
    </div>
    
    <!-- Operation Options -->
    <div v-if="selectedTriggerOperation?.options" class="section-container">
      <h4>{{ $t('Presets') }}</h4>
      <div class="operation-options">
        <el-tag v-for="option in selectedTriggerOperation?.options"
         :key="option.value" class="tag"
         @click="setTriggerDetails(option.value)">{{ option.label }}</el-tag>
      </div>
    </div>
    
    <!-- Trigger Details Configuration -->
    <div v-if="modelValue.operation" class="section-container">
      <h4>{{ $t('Configuration') }}</h4>
      
      <!-- Qelos Chat Completion Form -->
      <div v-if="selectedTriggerSource?.kind === IntegrationSourceKind.Qelos && modelValue.operation === QelosTriggerOperation.chatCompletion" class="chat-completion-form">
        <el-form label-position="top"> 
          <el-form-item>
            <h4>{{ $t('Agent Name') }}</h4>
            <el-input v-model="modelValue.details.name" @input="updateTriggerDetails" />
          </el-form-item>
          <el-form-item>
            <h4>{{ $t('Agent Description') }}</h4>
            <el-input v-model="modelValue.details.description" @input="updateTriggerDetails" />
          </el-form-item>
        </el-form>
        

        <div v-if="props.integrationId" class="chat-completion-url">
          <h4>{{ $t('Chat Completion URL') }}</h4>
          <el-input
            :value="getCompletionUrl"
            readonly
            class="url-display"
          >
            <template #append>
              <el-button @click="copyToClipboard(getCompletionUrl)">
                <i class="el-icon-copy-document"></i> Copy
              </el-button>
            </template>
          </el-input>
          <p class="help-text">{{ urlHelpText }}</p>
          
          <div class="thread-options mt-3">
            <el-checkbox 
              v-model="recordThread" 
              @change="updateRecordThreadSetting"
            >
              Record conversation thread
            </el-checkbox>
            <p class="help-text">
              When enabled, conversations will be stored as threads. 
              <span v-if="recordThread">The URL includes a threadId path parameter which can be used to continue existing conversations.</span>
            </p>
          </div>
        </div>
        <div v-else class="chat-completion-info">
          <p class="help-text">The chat completion URL will be available after saving the integration</p>
        </div>
      </div>

      <!-- Qelos Webhook Form -->
      <div v-else-if="selectedTriggerSource?.kind === IntegrationSourceKind.Qelos && modelValue.operation === QelosTriggerOperation.webhook" class="webhook-config">
        <el-form label-position="top" class="webhook-form">
          <el-form-item label="Source" required>
            <el-autocomplete
              :model-value="modelValue.details?.source || ''"
              :fetch-suggestions="fetchSourceSuggestions"
              highlight-first-item
              placeholder="e.g., auth"
              dir="ltr"
              @input="(val) => updateWebhookDetail('source', val as string)"
              @select="(item) => updateWebhookDetail('source', item.value)"
            />
            <small class="help-text">Available sources are documented in the <a href="https://docs.qelos.io/plugin-play/events#complete-event-list" target="_blank" rel="noopener noreferrer">platform events catalog</a>.</small>
          </el-form-item>
          <el-form-item label="Kind" required>
            <el-autocomplete
              :model-value="modelValue.details?.kind || ''"
              :fetch-suggestions="fetchKindSuggestions"
              highlight-first-item
              placeholder="e.g., signup"
              dir="ltr"
              @input="(val) => updateWebhookDetail('kind', val as string)"
              @select="(item) => updateWebhookDetail('kind', item.value)"
            />
            <small class="help-text">Usually matches the domain of the event, such as signup, workspaces, or blueprints.</small>
          </el-form-item>
          <el-form-item label="Event name" required>
            <el-autocomplete
              :model-value="modelValue.details?.eventName || ''"
              :fetch-suggestions="fetchEventNameSuggestions"
              highlight-first-item
              placeholder="e.g., user-registered"
              dir="ltr"
              @input="(val) => updateWebhookDetail('eventName', val as string)"
              @select="(item) => updateWebhookDetail('eventName', item.value)"
            />
            <small class="help-text">Use the kebab-case event identifier.</small>
          </el-form-item>
        </el-form>

        <div class="webhook-actions">
          <el-button
            type="primary"
            :disabled="!canLoadWebhookSamples"
            :loading="webhookSamplesLoading"
            @click="loadWebhookSamples"
          >
            Check existing webhooks
          </el-button>
          <small class="help-text">We retrieve matching events from the last month.</small>
        </div>

        <el-alert
          v-if="webhookSamplesError"
          type="error"
          :closable="false"
          class="webhook-alert"
        >
          {{ webhookSamplesError }}
        </el-alert>

        <div v-if="!chosenFromSample || webhookSamples.length" class="webhook-samples">
          <h5>Recent matching events</h5>
          <el-table :data="webhookSamples" size="small" border class="webhook-samples-table">
            <el-table-column prop="source" label="Source" width="120" />
            <el-table-column prop="kind" label="Kind" width="140" />
            <el-table-column prop="eventName" label="Event" />
            <el-table-column label="Received" width="200">
              <template #default="{ row }">
                {{ formatEventTimestamp(row.created) }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="200">
              <template #default="{ row }">
                <el-button link type="primary" :loading="webhookSampleLoading && webhookSampleSelectedId === row._id" @click="previewWebhookSample(row)">
                  Preview payload
                </el-button>
                <el-button link type="success" @click="applyWebhookSampleDetails(row)">
                  Use event
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <p v-else-if="!webhookSamplesLoading" class="help-text">
          No matching events were found for the selected identifiers in the last month.
        </p>

        <div v-if="webhookSampleMetadata" class="webhook-sample-metadata">
          <h5>Sample payload</h5>
          <el-input
            type="textarea"
            :model-value="webhookSampleMetadata"
            readonly
            dir="ltr"
            :autosize="{ minRows: 8 }"
            class="webhook-sample-textarea"
          />
          <small class="help-text">Review the payload shape before wiring downstream steps.</small>
        </div>
      </div>
      
      <!-- OpenAI Function Calling Form -->
      <div v-else-if="selectedTriggerSource?.kind === IntegrationSourceKind.OpenAI && modelValue.operation === OpenAITriggerOperation.functionCalling" class="function-calling-form">
        <div class="function-calling-info">
          <p class="help-text">Configure the function that OpenAI can call. The parameters should be a valid JSON schema.</p>
        </div>
        <el-form label-position="top">
          <el-form-item label="Function Name" required>
            <el-input 
              v-model="functionName" 
              @input="updateFunctionCallingDetails" 
              placeholder="e.g., get_weather, send_email"
            />
            <small class="help-text">A unique name for the function that OpenAI will call</small>
          </el-form-item>
          <el-form-item label="Description" required>
            <el-input 
              v-model="functionDescription" 
              @input="updateFunctionCallingDetails" 
              type="textarea"
              :rows="2"
              placeholder="Describe what this function does..."
            />
            <small class="help-text">Clear description of what the function does and when to use it</small>
          </el-form-item>
          <FunctionParametersSchemaEditor
            v-model="functionParameters"
            @update:modelValue="updateFunctionCallingDetails"
          />

          <div class="integration-access">
            <button class="collapse-header" type="button" @click="integrationAccessCollapsed = !integrationAccessCollapsed">
              <div class="header-content">
                <strong>Integration Access Control</strong>
                <span class="help-text">
                  Define which Qelos chat agents may call this function.
                </span>
              </div>
              <el-icon :class="['collapse-icon', { collapsed: integrationAccessCollapsed }]">
                <ArrowDown />
              </el-icon>
            </button>
            <el-collapse-transition>
              <div v-show="!integrationAccessCollapsed" class="integration-access-body">
                <div class="integration-summary-cards">
                  <div class="summary-card">
                    <span class="summary-label">Allowed</span>
                    <strong>{{ allowedIntegrationsSummary }}</strong>
                    <small class="help-text">Empty = all integrations allowed</small>
                  </div>
                  <div class="summary-card">
                    <span class="summary-label">Blocked</span>
                    <strong>{{ blockedIntegrationsSummary }}</strong>
                    <small class="help-text">Empty = no restrictions</small>
                  </div>
                </div>
                <el-form-item label="Allowed Integrations">
                  <small class="help-text">Select integrations that are allowed to use this function</small>
                  <el-select
                    v-model="allowedIntegrationIds"
                    multiple
                    filterable
                    collapse-tags-tooltip
                    placeholder="Select allowed integrations"
                    @change="updateFunctionCallingDetails"
                    class="integration-select"
                  >
                    <el-option
                      v-for="integration in qelosChatIntegrations"
                      :key="integration._id"
                      :label="integration.trigger.details?.name || 'No name'"
                      :tooltip="integration.trigger.details?.description || 'No description'"
                      :value="integration._id"
                    />
                  </el-select>
                  <small class="help-text">If none selected, all integrations are allowed</small>
                </el-form-item>

                <el-form-item label="Blocked Integrations">
                  <small class="help-text">Select integrations that are blocked from using this function</small>
                  <el-select
                    v-model="blockedIntegrationIds"
                    multiple
                    filterable
                    collapse-tags-tooltip
                    placeholder="Select blocked integrations"
                    @change="updateFunctionCallingDetails"
                    class="integration-select"
                  >
                    <el-option
                      v-for="integration in qelosChatIntegrations"
                      :key="integration._id"
                      :label="integration.trigger.details?.name || 'No name'"
                      :tooltip="integration.trigger.details?.description || 'No description'"
                      :value="integration._id"
                    />
                  </el-select>
                </el-form-item>
              </div>
            </el-collapse-transition>
          </div>
        </el-form>
      </div>
      
      <!-- Default JSON Editor for other operations -->
      <Monaco 
        v-else 
        :modelValue="triggerDetailsText" 
        @update:modelValue="updateTriggerDetails" 
        height="300px" 
        language="json" 
      />
    </div>
  </div>
</template>

<style scoped>
.trigger-container {
  padding: 10px 0;
}

.section-container {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-bg-color-page);
}

.section-container h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-weight: 600;
}

.operation-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  margin: 5px;
  cursor: pointer;
}

.mb-3 {
  margin-bottom: 15px;
}

.mt-3 {
  margin-top: 15px;
}

/* Chat Completion Form Styles */
.chat-completion-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.slider-container {
  margin-bottom: 15px;
}

.slider-container label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.slider-description {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
}

.system-message-container {
  margin-bottom: 15px;
}

.system-message-container label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.help-text {
  margin: 0 0 8px 0;
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
}

.advanced-options {
  margin-top: 10px;
}

.advanced-options-content {
  padding: 15px;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  margin-top: 10px;
}

.chat-completion-url {
  margin-bottom: 20px;
}

.chat-completion-url h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-weight: 600;
}

.url-display {
  font-family: monospace;
  background-color: var(--el-bg-color-page);
}

.chat-completion-info {
  padding: 15px;
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
  margin-bottom: 20px;
}

.function-calling-form {
  padding: 15px;
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
  margin-bottom: 20px;
}

.function-calling-info {
  padding: 15px;
  background-color: var(--el-color-info-light-9);
  border-left: 4px solid var(--el-color-info);
  border-radius: 4px;
  margin-bottom: 20px;
}

.function-calling-info .help-text {
  margin: 0;
  color: var(--el-color-info-dark-2);
}

.function-calling-form .el-form-item {
  margin-bottom: 20px;
}

.function-calling-form .el-form-item__label {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.function-calling-form .help-text {
  display: block;
  margin-top: 5px;
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
}

.integration-select {
  width: 100%;
}

.integration-access {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  margin-block-end: 20px;
}

.integration-access .collapse-header {
  inline-size: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.integration-access .header-content {
  display: flex;
  flex-direction: column;
  inline-size: calc(100% - 40px);
  text-align: start;
}

.integration-access .integration-access-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.integration-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background-color: var(--el-bg-color-page);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
}
</style>
