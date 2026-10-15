<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { Delete, Plus, ArrowUp, ArrowDown, MagicStick, Document } from '@element-plus/icons-vue';
import BlueprintDropdown from '@/modules/integrations/components/BlueprintDropdown.vue';
import { storeToRefs } from 'pinia';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { capitalize } from 'vue';
import { getPlural } from '@/modules/core/utils/texts';
import { QelosTriggerOperation, PopulateSource, IntegrationSourceKind } from '@qelos/global-types';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { executeDataManipulationTest } from '@/services/apis/data-manipulation-service';
import eventsService, { IEvent } from '@/services/apis/events-service';
import { authStore } from '@/modules/core/store/auth';


const { t } = useI18n();

// Define props and emits
const props = defineProps<{
  modelValue: any[];
  trigger?: {
    operation?: string;
    details?: Record<string, any>;
  };
}>();

const emit = defineEmits(['update:modelValue']);

// Get blueprints for template suggestions
const { blueprints } = storeToRefs(useBlueprintsStore());

// Get integrations for API webhook selection
const integrationsStore = useIntegrationsStore();
const { integrations } = storeToRefs(integrationsStore);

// Filter integrations for API webhook
const apiWebhookIntegrations = computed(() => {
  return integrations.value?.filter(integration => 
    integration.kind?.[0] === IntegrationSourceKind.Qelos && 
    integration.trigger?.operation === QelosTriggerOperation.apiWebhook
  ) || [];
});

// Template system
const showTemplateDialog = ref(false);
const selectedTemplate = ref('');
const selectedBlueprintForTemplate = ref('');

// Pre-defined templates for common chat completion scenarios
const templates = ref([
  {
    id: 'workspace-blueprint-context',
    name: 'Workspace Blueprint Context',
    description: 'Add workspace blueprint data as context for AI chat completion',
    icon: 'Document',
    requiresBlueprint: true,
    generate: (blueprintId?: string) => {
      const blueprint = blueprints.value?.find(b => b.identifier === blueprintId);
      const blueprintName = blueprint ? capitalize(blueprint.name) : capitalize(blueprintId);
      const blueprintNamePlural = getPlural(blueprintName.toLowerCase());
      
      return [
        {
          "map": {
            [`${blueprintNamePlural}Data`]: `{ workspace: .user.workspace._id }`,
            "systemPrompt": `"Here is the user's ${blueprintNamePlural} data for context: "`
          },
          "populate": {}
        },
        {
          "map": {},
          "populate": {
            [`${blueprintNamePlural}Data`]: {
              "source": "blueprintEntities",
              "blueprint": blueprintId
            }
          }
        },
        {
          "map": {
            "messages": `([{role: "system", content: (.systemPrompt + (.${blueprintNamePlural}Data | tostring))}] + .messages)`
          },
          "populate": {}
        }
      ];
    }
  },
  {
    id: 'user-profile-context',
    name: 'User Profile Context',
    description: 'Add user profile information to chat context',
    icon: 'User',
    requiresBlueprint: false,
    generate: () => [
      {
        "map": {
          "systemPrompt": `"User context: "`,
          "messages": `([{ role: "system", content: (.systemPrompt + (.user | tostring)) }] + .messages)`
        },
        "populate": {}
      }
    ]
  },
  {
    id: 'blueprint-user-context',
    name: 'Blueprint + User Context',
    description: 'Combine blueprint data with user information for comprehensive context',
    icon: 'Collection',
    requiresBlueprint: true,
    generate: (blueprintId?: string) => {
      const blueprint = blueprints.value?.find(b => b.identifier === blueprintId);
      const blueprintName = blueprint ? capitalize(blueprint.name) : capitalize(blueprintId);
      const blueprintNamePlural = getPlural(blueprintName.toLowerCase());
      
      return [
        {
          "map": {
            [`${blueprintNamePlural}Data`]: `{ workspace: .user.workspace._id }`,
            "systemPrompt": `"Here is your ${blueprintNamePlural} data and user context: "`
          },
          "populate": {}
        },
        {
          "map": {},
          "populate": {
            [`${blueprintNamePlural}Data`]: {
              "source": "blueprintEntities",
              "blueprint": blueprintId
            }
          }
        },
        {
          "map": {
            "contextData": `{ ${blueprintNamePlural}: .${blueprintNamePlural}Data, user: .user }`,
            "messages": `([{ role: "system", content: (.systemPrompt + (.contextData | tostring)) }] + .messages)`
          },
          "populate": {}
        }
      ];
    }
  },
  {
    id: 'conditional-context-loading',
    name: 'Conditional Context Loading',
    description: 'Load blueprint context only when certain conditions are met',
    icon: 'Switch',
    requiresBlueprint: true,
    generate: (blueprintId?: string) => {
      const blueprint = blueprints.value?.find(b => b.identifier === blueprintId);
      const blueprintName = blueprint ? capitalize(blueprint.name) : capitalize(blueprintId);
      const blueprintNamePlural = getPlural(blueprintName.toLowerCase());
      
      return [
        {
          "map": {
            "shouldLoadContext": "(.messages | length) > 3",
            [`${blueprintNamePlural}Data`]: `if .shouldLoadContext then { workspace: .user.workspace._id } else {} end`
          },
          "populate": {}
        },
        {
          "map": {},
          "populate": {
            [`${blueprintNamePlural}Data`]: {
              "source": "blueprintEntities",
              "blueprint": blueprintId
            }
          },
          "abort": ".shouldLoadContext | not"
        },
        {
          "map": {
            "systemPrompt": `"Context: Your ${blueprintNamePlural} data is available. "`,
            "messages": `([{ role: "system", content: (.systemPrompt + (.${blueprintNamePlural}Data | tostring)) }] + .messages)`
          },
          "populate": {}
        }
      ];
    }
  }
]);

// Store steps as arrays of entries for stable references
const steps = ref<any[]>([]);
// one step is open at a time; the whole manipulation can also be edited as JSON
const openStep = ref<number | null>(0);
const viewMode = ref<'steps' | 'json'>('steps');
const mapEntries = ref<Record<number, Array<{key: string, value: unknown}>>>({});
const populateEntries = ref<Record<number, Array<{key: string, source: string, blueprint?: string, scope?: string, subjectId?: string, integration?: string}>>>({});
const clearFlags = ref<Record<number, boolean>>({});
const abortValues = ref<Record<number, string>>({});
const abortTypes = ref<Record<number, 'none' | 'boolean' | 'expression'>>({});
const stepErrors = ref<Record<number, { field?: string; phase?: string; message: string }>>({});

// JSON representation for each step
const stepJsons = ref<Record<number, string>>({});
const completeJsonText = ref('');
const testPayloadText = ref('');
const lastAutofillPayload = ref('');
const isTestingDataManipulation = ref(false);
const testResultText = ref('');
const testError = ref('');

// Helper functions to safely access entries
const getMapEntries = (stepIndex: number) => {
  return mapEntries.value[stepIndex] || [];
};

const triggerDetails = computed(() => props.trigger?.details || {});
const triggerOperation = computed(() => props.trigger?.operation);
const isChatCompletionTrigger = computed(() => triggerOperation.value === QelosTriggerOperation.chatCompletion);
const isWebhookTrigger = computed(() => triggerOperation.value === QelosTriggerOperation.webhook);
const canLoadWebhookSamples = computed(() => {
  if (!isWebhookTrigger.value) return false;
  return Boolean(triggerDetails.value.source && triggerDetails.value.kind && triggerDetails.value.eventName);
});

const webhookSamples = ref<IEvent[]>([]);
const webhookSamplesLoading = ref(false);
const webhookSamplesError = ref<string | null>(null);
const webhookSamplesLoaded = ref(false);
const webhookSampleSelectedId = ref<string | null>(null);
const webhookSampleLoading = ref(false);

const defaultTestPayload = computed(() => {
  if (isChatCompletionTrigger.value) {
    return {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello! Can you help me summarize this note?' }
      ],
      context: {
        threadId: 'thread_123',
        workspaceId: 'workspace_456',
        paidCustomer: true
      },
      user: authStore.user
    };
  }

  const triggerDetails = props.trigger?.details || {};
  return {
    tenant: triggerDetails.tenant || 'tenant_id',
    source: triggerDetails.source || 'auth',
    kind: triggerDetails.kind || 'signup',
    eventName: triggerDetails.eventName || 'user-registered',
    description: 'Sample webhook event payload',
    metadata: {
      user: {
        _id: 'user_123',
        email: 'user@example.com'
      },
      workspace: {
        _id: 'workspace_456',
        name: 'Acme Inc'
      }
    },
    user: 'user_123',
    created: '2024-01-01T00:00:00.000Z'
  };
});

const applyDefaultTestPayload = (force = false) => {
  const nextPayload = JSON.stringify(defaultTestPayload.value, null, 2);
  if (!force && testPayloadText.value && testPayloadText.value.trim() && testPayloadText.value !== lastAutofillPayload.value) {
    return;
  }
  testPayloadText.value = nextPayload;
  lastAutofillPayload.value = nextPayload;
};

watch(
  () => JSON.stringify({ operation: props.trigger?.operation, details: props.trigger?.details }),
  () => {
    applyDefaultTestPayload(false);
  },
  { immediate: true }
);

let webhookSamplesLoadTimeout: ReturnType<typeof setTimeout> | null = null;

watch(
  () => JSON.stringify({
    source: triggerDetails.value.source,
    kind: triggerDetails.value.kind,
    eventName: triggerDetails.value.eventName,
    operation: triggerOperation.value
  }),
  () => {
    webhookSamples.value = [];
    webhookSamplesLoaded.value = false;
    webhookSamplesError.value = null;
    webhookSampleSelectedId.value = null;
    if (webhookSamplesLoadTimeout) {
      clearTimeout(webhookSamplesLoadTimeout);
    }
    if (canLoadWebhookSamples.value) {
      webhookSamplesLoadTimeout = setTimeout(() => {
        loadWebhookSamples(true);
      }, 600);
    }
  },
  { immediate: true }
);

const updateTestPayload = (value: string) => {
  testPayloadText.value = value;
};

const resetTestPayload = () => {
  applyDefaultTestPayload(true);
};

const clearStepErrors = () => {
  stepErrors.value = {};
};

const setStepError = (stepIndex: number, data: { field?: string; phase?: string; message: string }) => {
  stepErrors.value = { [stepIndex]: data };
};

const getStepError = (stepIndex: number) => stepErrors.value[stepIndex];

const isMapFieldError = (stepIndex: number, fieldKey: string) => {
  const error = stepErrors.value[stepIndex];
  if (!error || !fieldKey) return false;
  return error.field === fieldKey && error.phase === 'map';
};

const isPopulateFieldError = (stepIndex: number, fieldKey: string) => {
  const error = stepErrors.value[stepIndex];
  if (!error || !fieldKey) return false;
  return error.field === fieldKey && error.phase === 'populate';
};

const isAbortError = (stepIndex: number) => stepErrors.value[stepIndex]?.phase === 'abort';

const loadWebhookSamples = async (silent = false) => {
  if (!canLoadWebhookSamples.value) {
    if (!silent) {
      webhookSamplesError.value = 'Fill source, kind, and event name to load events.';
    }
    return;
  }

  webhookSamplesLoading.value = true;
  webhookSamplesError.value = null;

  try {
    const events = await eventsService.getAll({
      source: triggerDetails.value.source,
      kind: triggerDetails.value.kind,
      eventName: triggerDetails.value.eventName,
      period: 'last-month',
      page: 0
    });
    webhookSamples.value = events;
  } catch (error: any) {
    webhookSamplesError.value = error?.message || 'Failed to load webhook events.';
    webhookSamples.value = [];
  } finally {
    webhookSamplesLoaded.value = true;
    webhookSamplesLoading.value = false;
  }
};

const applyWebhookSample = async (sample: IEvent) => {
  webhookSampleSelectedId.value = sample._id;
  webhookSampleLoading.value = true;
  webhookSamplesError.value = null;

  try {
    const event = await eventsService.getOne(sample._id);
    const payload = JSON.stringify(event, null, 2);
    testPayloadText.value = payload;
    lastAutofillPayload.value = payload;
    testResultText.value = '';
    ElMessage.success('Loaded event payload into the tester');
  } catch (error: any) {
    webhookSamplesError.value = error?.message || 'Failed to load event payload.';
  } finally {
    webhookSampleLoading.value = false;
  }
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

const runDataManipulationTest = async () => {
  testError.value = '';
  testResultText.value = '';
  clearStepErrors();

  if (!testPayloadText.value?.trim()) {
    testError.value = 'Please provide a sample payload before running the test.';
    return;
  }

  let parsedPayload: Record<string, any>;
  try {
    parsedPayload = JSON.parse(testPayloadText.value);
  } catch (err) {
    testError.value = 'Sample payload must be a valid JSON object.';
    return;
  }

  if (!steps.value.length) {
    testError.value = 'Add at least one data manipulation step before testing.';
    return;
  }

  syncToModel();

  try {
    isTestingDataManipulation.value = true;
    const workflowPayload = JSON.parse(JSON.stringify(steps.value));
    const response = await executeDataManipulationTest({
      payload: parsedPayload,
      workflow: workflowPayload
    });
    testResultText.value = JSON.stringify(response, null, 2);
    ElMessage.success('Data manipulation executed successfully');
  } catch (error: any) {
    const apiError = error?.response?.data;
    if (typeof apiError?.stepIndex === 'number') {
      const humanStep = apiError.stepIndex + 1;
      const fieldPart = apiError.field ? `Field "${apiError.field}"` : null;
      const phasePart = apiError.phase ? `(${apiError.phase})` : null;
      const detail = apiError.details || apiError.message || 'Unknown error.';
      const friendly = [`Step ${humanStep}`, phasePart, fieldPart].filter(Boolean).join(' ');
      testError.value = `${friendly}: ${detail}`;
      setStepError(apiError.stepIndex, {
        field: apiError.field,
        phase: apiError.phase,
        message: detail
      });
    } else {
      testError.value = apiError?.message || error?.message || 'Failed to execute data manipulation test.';
    }
  } finally {
    isTestingDataManipulation.value = false;
  }
};

// Initialize the component with data from props
const initialize = () => {
  // Create a deep copy of the modelValue
  const modelCopy = JSON.parse(JSON.stringify(props.modelValue || []));
  steps.value = modelCopy;
  
  // Convert map and populate objects to arrays of entries
  modelCopy.forEach((step, stepIndex) => {
    // Convert map object to array
    mapEntries.value[stepIndex] = step.map 
      ? Object.entries(step.map).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)
        }))
      : [];
    
    // Convert populate object to array
    populateEntries.value[stepIndex] = step.populate
      ? Object.entries(step.populate).map(([key, config]) => {
          const populateConfig = config as { source?: string; blueprint?: string; integration?: string; scope?: string; subjectId?: string };
          return {
            key,
            source: populateConfig.source || PopulateSource.user,
            blueprint: populateConfig.blueprint,
            integration: populateConfig.integration,
            scope: populateConfig.scope,
            subjectId: populateConfig.subjectId
          };
        })
      : [];
    
    // Initialize clear flag
    clearFlags.value[stepIndex] = step.clear === true;
    
    // Initialize abort value and type
    if (step.abort === undefined) {
      abortValues.value[stepIndex] = '';
      abortTypes.value[stepIndex] = 'none';
    } else if (typeof step.abort === 'boolean') {
      abortValues.value[stepIndex] = '';
      abortTypes.value[stepIndex] = 'boolean';
    } else {
      abortValues.value[stepIndex] = String(step.abort);
      abortTypes.value[stepIndex] = 'expression';
    }
    
    // Initialize JSON representations
    stepJsons.value[stepIndex] = JSON.stringify(step, null, 2);
  });
  
  completeJsonText.value = JSON.stringify(steps.value, null, 2);
};

// Sync entries back to the model
const syncToModel = () => {
  const newModelValue = steps.value.map((step, stepIndex) => {
    const newStep = { ...step };
    
    // Convert map entries array back to object
    newStep.map = {};
    if (mapEntries.value[stepIndex]) {
      mapEntries.value[stepIndex].forEach(entry => {
        if (entry.key.trim()) {
          newStep.map[entry.key] = entry.value;
        }
      });
    }
    
    // Convert populate entries array back to object
    newStep.populate = {};
    if (populateEntries.value[stepIndex]) {
      populateEntries.value[stepIndex].forEach(entry => {
        if (entry.key.trim()) {
          const populateConfig: any = {
            source: entry.source || PopulateSource.user
          };
          
          // Add blueprint for blueprint sources
          if ((entry.source === PopulateSource.blueprintEntities || entry.source === PopulateSource.blueprintEntity) && entry.blueprint) {
            populateConfig.blueprint = entry.blueprint;
          }
          
          // Add vector store specific properties
          if (entry.source === PopulateSource.vectorStores) {
            if (entry.scope && entry.scope !== 'tenant') {
              populateConfig.scope = entry.scope;
            }
            if (entry.subjectId) {
              populateConfig.subjectId = entry.subjectId;
            }
          }
          
          // Add API webhook specific properties
          if (entry.source === PopulateSource.apiWebhook && entry.integration) {
            populateConfig.integration = entry.integration;
          }
          
          newStep.populate[entry.key] = populateConfig;
        }
      });
    }
    
    // Add clear flag if true
    if (clearFlags.value[stepIndex]) {
      newStep.clear = true;
    }
    if (!clearFlags.value[stepIndex]) {
      delete newStep.clear;
    }
    
    // Add abort property based on type
    if (abortTypes.value[stepIndex] === 'boolean' && abortValues.value[stepIndex] === 'true') {
      newStep.abort = true;
      return newStep;
    }

    if (abortTypes.value[stepIndex] === 'expression' && abortValues.value[stepIndex]) {
      newStep.abort = abortValues.value[stepIndex] as string;
      return newStep;
    }

    delete newStep.abort;
    
    return newStep;
  });
  // Keep local steps array in sync with reconstructed data
  steps.value = JSON.parse(JSON.stringify(newModelValue));
  
  // Update JSON representations
  newModelValue.forEach((step, index) => {
    stepJsons.value[index] = JSON.stringify(step, null, 2);
  });
  completeJsonText.value = JSON.stringify(newModelValue, null, 2);
  
  // Emit the updated value
  emit('update:modelValue', newModelValue);
};

// Add a new step to the data manipulation
const addStep = () => {
  // Add a new step to the steps array
  steps.value.push({
    map: {},
    populate: {}
  });
  
  // Initialize empty entry arrays for the new step
  const newIndex = steps.value.length - 1;
  mapEntries.value[newIndex] = [];
  populateEntries.value[newIndex] = [];
  clearFlags.value[newIndex] = false;
  abortValues.value[newIndex] = '';
  abortTypes.value[newIndex] = 'none';
  
  // Update JSON and emit changes
  syncToModel();
};

// Remove a step from the data manipulation
const removeStep = (index: number) => {
  // Remove the step
  steps.value.splice(index, 1);
  
  // Rebuild the entries with updated indices
  const newMapEntries = {};
  const newPopulateEntries = {};
  const newStepJsons = {};
  
  steps.value.forEach((_, i) => {
    if (i < index) {
      newMapEntries[i] = mapEntries.value[i];
      newPopulateEntries[i] = populateEntries.value[i];
    } else {
      newMapEntries[i] = mapEntries.value[i + 1] || [];
      newPopulateEntries[i] = populateEntries.value[i + 1] || [];
    }
  });
  
  mapEntries.value = newMapEntries;
  populateEntries.value = newPopulateEntries;
  
  // Update JSON and emit changes
  syncToModel();
};

// Move a step up or down in the sequence
const moveStep = (fromIndex: number, toIndex: number) => {
  // Validate indices
  if (toIndex < 0 || toIndex >= steps.value.length) return;
  
  // Move the step
  const step = steps.value.splice(fromIndex, 1)[0];
  steps.value.splice(toIndex, 0, step);
  
  // Move the entries
  const mapEntriesToMove = mapEntries.value[fromIndex];
  const populateEntriesToMove = populateEntries.value[fromIndex];
  
  // Rebuild the entries with updated indices
  const newMapEntries = {};
  const newPopulateEntries = {};
  
  // Handle the case where we're moving up (fromIndex > toIndex)
  if (fromIndex > toIndex) {
    for (let i = 0; i < steps.value.length; i++) {
      if (i < toIndex) {
        newMapEntries[i] = mapEntries.value[i];
        newPopulateEntries[i] = populateEntries.value[i];
      } else if (i === toIndex) {
        newMapEntries[i] = mapEntriesToMove;
        newPopulateEntries[i] = populateEntriesToMove;
      } else if (i <= fromIndex) {
        newMapEntries[i] = mapEntries.value[i - 1];
        newPopulateEntries[i] = populateEntries.value[i - 1];
      } else {
        newMapEntries[i] = mapEntries.value[i];
        newPopulateEntries[i] = populateEntries.value[i];
      }
    }
  } 
  // Handle the case where we're moving down (fromIndex < toIndex)
  else {
    for (let i = 0; i < steps.value.length; i++) {
      if (i < fromIndex) {
        newMapEntries[i] = mapEntries.value[i];
        newPopulateEntries[i] = populateEntries.value[i];
      } else if (i > fromIndex && i <= toIndex) {
        newMapEntries[i - 1] = mapEntries.value[i];
        newPopulateEntries[i - 1] = populateEntries.value[i];
      } else if (i === toIndex + 1) {
        newMapEntries[i - 1] = mapEntriesToMove;
        newPopulateEntries[i - 1] = populateEntriesToMove;
      } else {
        newMapEntries[i] = mapEntries.value[i];
        newPopulateEntries[i] = populateEntries.value[i];
      }
    }
  }
  
  mapEntries.value = newMapEntries;
  populateEntries.value = newPopulateEntries;
  
  // Update JSON and emit changes
  syncToModel();
};

// Map entry methods
const addMapEntry = (stepIndex: number) => {
  if (!mapEntries.value[stepIndex]) {
    mapEntries.value[stepIndex] = [];
  }
  
  // Add a new entry with empty key and value
  mapEntries.value[stepIndex].push({
    key: '',
    value: ''
  });
  
  // Sync to model
  syncToModel();
};

const removeMapEntry = (stepIndex: number, entryIndex: number) => {
  if (!mapEntries.value[stepIndex]) return;
  
  // Remove the entry at the specified index
  mapEntries.value[stepIndex].splice(entryIndex, 1);
  
  // Sync to model
  syncToModel();
};

// Populate entry methods
const addPopulateEntry = (stepIndex: number) => {
  if (!populateEntries.value[stepIndex]) {
    populateEntries.value[stepIndex] = [];
  }
  
  // Add a new entry with default values
  populateEntries.value[stepIndex].push({
    key: '',
    source: PopulateSource.user,
    scope: undefined,
    subjectId: undefined,
    integration: undefined,
    blueprint: undefined,
  });
  
  // Sync to model
  syncToModel();
};

const removePopulateEntry = (stepIndex: number, entryIndex: number) => {
  if (!populateEntries.value[stepIndex]) return;
  
  // Remove the entry at the specified index
  populateEntries.value[stepIndex].splice(entryIndex, 1);
  
  // Sync to model
  syncToModel();
};

// Update methods for JSON views
const updateStepJson = (stepIndex: number, json: string) => {
  try {
    // Parse the JSON to ensure it's valid
    const parsedJson = JSON.parse(json);
    
    // Update the step
    steps.value[stepIndex] = parsedJson;
    
    // Convert the updated step back to arrays of entries
    if (parsedJson.map) {
      mapEntries.value[stepIndex] = Object.entries(parsedJson.map).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)
      }));
    } else {
      mapEntries.value[stepIndex] = [];
    }
    
    if (parsedJson.populate) {
      populateEntries.value[stepIndex] = Object.entries(parsedJson.populate).map(([key, config]) => {
        const populateConfig = config as { source?: string; blueprint?: string; integration?: string; scope?: string; subjectId?: string };
        return {
          key,
          source: populateConfig.source || 'user',
          blueprint: populateConfig.blueprint,
          integration: populateConfig.integration,
          scope: populateConfig.scope,
          subjectId: populateConfig.subjectId
        };
      });
    } else {
      populateEntries.value[stepIndex] = [];
    }
    
    // Update clear flag
    clearFlags.value[stepIndex] = parsedJson.clear === true;
    
    // Update abort value and type
    if (parsedJson.abort === undefined) {
      abortValues.value[stepIndex] = '';
      abortTypes.value[stepIndex] = 'none';
    } else if (typeof parsedJson.abort === 'boolean') {
      abortValues.value[stepIndex] = '';
      abortTypes.value[stepIndex] = 'boolean';
    } else {
      abortValues.value[stepIndex] = String(parsedJson.abort);
      abortTypes.value[stepIndex] = 'expression';
    }
    
    // Update JSON representations
    stepJsons.value[stepIndex] = json;
    completeJsonText.value = JSON.stringify(steps.value, null, 2);
    
    // Emit the updated value
    syncToModel();
  } catch (e) {
    // If JSON is invalid, don't update anything
    console.error('Invalid JSON:', e);
  }
};

const updateCompleteJson = (json: string) => {
  try {
    // Parse the JSON to ensure it's valid
    const parsedJson = JSON.parse(json);
    
    // Update the steps
    steps.value = parsedJson;
    
    // Convert all steps to arrays of entries
    parsedJson.forEach((step, stepIndex) => {
      if (step.map) {
        mapEntries.value[stepIndex] = Object.entries(step.map).map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2) }));
      } else {
        mapEntries.value[stepIndex] = [];
      }
      
      if (step.populate) {
        populateEntries.value[stepIndex] = Object.entries(step.populate).map(([key, config]) => {
          const populateConfig = config as any;
          return { 
            key, 
            source: populateConfig.source || PopulateSource.user, 
            blueprint: populateConfig.blueprint,
            integration: populateConfig.integration,
            scope: populateConfig.scope,
            subjectId: populateConfig.subjectId,
          };
        });
      } else {
        populateEntries.value[stepIndex] = [];
      }
      
      // Update clear flag
      clearFlags.value[stepIndex] = step.clear === true;
      
      // Update abort value and type
      if (step.abort === undefined) {
        abortValues.value[stepIndex] = '';
        abortTypes.value[stepIndex] = 'none';
      } else if (typeof step.abort === 'boolean') {
        abortValues.value[stepIndex] = '';
        abortTypes.value[stepIndex] = 'boolean';
      } else {
        abortValues.value[stepIndex] = String(step.abort);
        abortTypes.value[stepIndex] = 'expression';
      }
    });
    
    // Update JSON representations
    parsedJson.forEach((step, index) => {
      stepJsons.value[index] = JSON.stringify(step, null, 2);
    });
    completeJsonText.value = json;
    
    // Emit the updated value
    syncToModel();
  } catch (e) {
    // If JSON is invalid, don't update anything
    console.error('Invalid JSON:', e);
  }
};

// Handle abort type change
const handleAbortTypeChange = (stepIndex: number) => {
  if (abortTypes.value[stepIndex] === 'boolean') {
    abortValues.value[stepIndex] = '';
  } else if (abortTypes.value[stepIndex] === 'expression') {
    abortValues.value[stepIndex] = '';
  } else {
    abortValues.value[stepIndex] = '';
  }
  syncToModel();
};

// Template methods
const openTemplateDialog = () => {
  showTemplateDialog.value = true;
  selectedTemplate.value = '';
  selectedBlueprintForTemplate.value = '';
};

const applyTemplate = () => {
  const template = templates.value.find(t => t.id === selectedTemplate.value);
  if (!template) return;

  let generatedSteps;
  if (template.requiresBlueprint && selectedBlueprintForTemplate.value) {
    generatedSteps = template.generate(selectedBlueprintForTemplate.value);
  } else if (!template.requiresBlueprint) {
    generatedSteps = template.generate();
  } else {
    return; // Blueprint required but not selected
  }

  // Replace current steps with template
  steps.value = JSON.parse(JSON.stringify(generatedSteps));
  
  // Clear and reinitialize reactive arrays for the new steps
  mapEntries.value = {};
  populateEntries.value = {};
  clearFlags.value = {};
  abortValues.value = {};
  abortTypes.value = {};
  stepJsons.value = {};
  
  // Set up reactive arrays for each new step
  steps.value.forEach((step, stepIndex) => {
    if (step.map) {
      mapEntries.value[stepIndex] = Object.entries(step.map).map(([key, value]) => ({ key, value }));
    } else {
      mapEntries.value[stepIndex] = [];
    }
    
    if (step.populate) {
      populateEntries.value[stepIndex] = Object.entries(step.populate).map(([key, config]) => {
        const populateConfig = config as { source?: string; blueprint?: string };
        return { key, source: populateConfig.source || PopulateSource.user, blueprint: populateConfig.blueprint };
      });
    } else {
      populateEntries.value[stepIndex] = [];
    }
    
    clearFlags.value[stepIndex] = step.clear === true;
    
    if (step.abort === undefined) {
      abortValues.value[stepIndex] = '';
      abortTypes.value[stepIndex] = 'none';
    } else if (typeof step.abort === 'boolean') {
      abortValues.value[stepIndex] = step.abort;
      abortTypes.value[stepIndex] = 'boolean';
    } else {
      abortValues.value[stepIndex] = step.abort;
      abortTypes.value[stepIndex] = 'expression';
    }
    
    stepJsons.value[stepIndex] = JSON.stringify(step, null, 2);
  });
  
  completeJsonText.value = JSON.stringify(steps.value, null, 2);
  
  // Sync to model to emit the changes
  syncToModel();
  
  showTemplateDialog.value = false;
};

const getTemplateIcon = (iconName: string) => {
  const icons = {
    'Document': Document,
    'User': 'el-icon-user',
    'Collection': 'el-icon-collection',
    'Switch': 'el-icon-switch'
  };
  return icons[iconName] || Document;
};

const canApplyTemplate = computed(() => {
  if (!selectedTemplate.value) return false;
  const template = templates.value.find(t => t.id === selectedTemplate.value);
  if (!template) return false;
  if (template.requiresBlueprint) {
    return !!selectedBlueprintForTemplate.value;
  }
  return true;
});

// Initialize on mount
onMounted(() => {
  initialize();
  // Load integrations for API webhook selection
  if (!integrationsStore.loaded) {
    integrationsStore.retry();
  }
});


const summaryOf = (stepIndex: number) => {
  const parts: string[] = [];
  const fields = getMapEntries(stepIndex).filter((entry) => entry.key).length;
  const populates = (populateEntries.value[stepIndex] || []).filter((entry) => entry.key).length;
  if (fields) parts.push(`${fields} ${fields === 1 ? t('field') : t('fields')}`);
  if (populates) parts.push(`${populates} ${t('populate')}`);
  if (clearFlags.value[stepIndex]) parts.push(t('clears previous data'));
  if (abortTypes.value[stepIndex] && abortTypes.value[stepIndex] !== 'none') parts.push(t('can abort'));
  return parts.join(' · ') || t('Empty step');
};

// the open step follows its content when steps are reordered or removed
const moveAndFollow = (from: number, to: number) => {
  const wasOpen = openStep.value === from;
  moveStep(from, to);
  if (wasOpen) openStep.value = to;
  else if (openStep.value === to) openStep.value = from;
};

const removeAndAdjust = (index: number) => {
  removeStep(index);
  if (openStep.value === null) return;
  if (openStep.value === index) openStep.value = null;
  else if (openStep.value > index) openStep.value -= 1;
};

const addStepAndOpen = () => {
  addStep();
  openStep.value = steps.value.length - 1;
};

// jump to the step that failed the last test
watch(stepErrors, (errors) => {
  const failed = Object.keys(errors)[0];
  if (failed !== undefined) openStep.value = Number(failed);
});
</script>

<template>
  <div class="mapping">
    <p class="intro">{{ $t('Each step processes data from the previous step. Use map to transform data and populate to fetch related data.') }}</p>

    <div class="mode-bar">
      <el-segmented v-model="viewMode" size="small" :options="[{ label: $t('Steps'), value: 'steps' }, { label: $t('JSON'), value: 'json' }]" :aria-label="$t('View')" />
      <div class="grow" />
      <el-button v-if="viewMode === 'steps'" @click="openTemplateDialog"><el-icon><MagicStick /></el-icon>{{ $t('Apply Template') }}</el-button>
      <el-button v-if="viewMode === 'steps'" type="primary" @click="addStepAndOpen"><el-icon><Plus /></el-icon>{{ $t('Add Step') }}</el-button>
    </div>

    <!-- the whole manipulation as JSON -->
    <div v-if="viewMode === 'json'" class="json-editor">
      <Monaco :modelValue="completeJsonText" height="320px" language="json" @update:modelValue="updateCompleteJson" />
    </div>

    <template v-else>
      <div v-if="!steps.length" class="empty">
        <strong>{{ $t('No steps yet') }}</strong>
        <span>{{ $t('Without steps the payload goes to the next stage unchanged. Add a step to reshape it, or start from a template.') }}</span>
      </div>

      <ol v-else class="steps">
        <li v-for="(step, i) in steps" :key="i" class="step" :class="{ open: openStep === i, failed: !!getStepError(i) }">
          <div class="step-bar">
            <button type="button" class="step-toggle" :aria-expanded="openStep === i" @click="openStep = openStep === i ? null : i">
              <font-awesome-icon :icon="['fas', openStep === i ? 'chevron-down' : 'chevron-right']" class="chev" aria-hidden="true" />
              <span class="num" aria-hidden="true">{{ i + 1 }}</span>
              <span class="step-text">
                <strong>{{ $t('Step') }} {{ i + 1 }}</strong>
                <span class="step-sum" dir="auto">{{ summaryOf(i) }}</span>
              </span>
              <el-tag v-if="getStepError(i)" type="danger" size="small" effect="light">{{ $t('Needs attention') }}</el-tag>
            </button>
            <div class="step-tools">
              <el-button text circle size="small" :disabled="i === 0" :aria-label="`${$t('Move up')}: ${$t('Step')} ${i + 1}`" @click="moveAndFollow(i, i - 1)"><el-icon><ArrowUp /></el-icon></el-button>
              <el-button text circle size="small" :disabled="i === steps.length - 1" :aria-label="`${$t('Move down')}: ${$t('Step')} ${i + 1}`" @click="moveAndFollow(i, i + 1)"><el-icon><ArrowDown /></el-icon></el-button>
              <el-button text circle size="small" type="danger" :aria-label="`${$t('Remove')}: ${$t('Step')} ${i + 1}`" @click="removeAndAdjust(i)"><el-icon><Delete /></el-icon></el-button>
            </div>
          </div>

          <div v-show="openStep === i" class="step-body">
            <el-alert v-if="getStepError(i)" type="error" show-icon :closable="false" :title="$t('This step failed during the last test.')" :description="getStepError(i)?.message" />

            <section class="block" :aria-label="$t('Map')">
              <header>
                <h4>{{ $t('Map') }}</h4>
                <p>{{ $t('Map transforms data using JQ-like expressions') }}</p>
              </header>
              <div v-for="(entry, index) in getMapEntries(i)" :key="index" class="entry" :class="{ 'has-error': isMapFieldError(i, entry.key) }">
                <el-input dir="ltr" v-model="entry.key" :placeholder="$t('Field name')" :aria-label="$t('Field name')" :class="{ 'input-error': isMapFieldError(i, entry.key) }" @update:model-value="syncToModel" />
                <span class="equals" aria-hidden="true">=</span>
                <el-input
                  dir="ltr"
                  :model-value="typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value ?? '')"
                  :placeholder="$t('JQ Expression or Value')"
                  :aria-label="$t('JQ Expression or Value')"
                  :class="{ 'input-error': isMapFieldError(i, entry.key) }"
                  @input="(val) => { entry.value = val; syncToModel(); }"
                />
                <el-button text circle type="danger" :aria-label="`${$t('Remove')}: ${entry.key || $t('Field name')}`" @click="removeMapEntry(i, index)"><el-icon><Delete /></el-icon></el-button>
              </div>
              <el-button class="add" text @click="addMapEntry(i)"><el-icon><Plus /></el-icon>{{ $t('Add Field') }}</el-button>
            </section>

            <section class="block" :aria-label="$t('Populate')">
              <header>
                <h4>{{ $t('Populate') }}</h4>
                <p>{{ $t('Populate fetches related data from databases') }}</p>
              </header>
              <div v-for="(entry, index) in populateEntries[i]" :key="index" class="entry populate" :class="{ 'has-error': isPopulateFieldError(i, entry.key) }">
                <el-input dir="ltr" v-model="entry.key" :placeholder="$t('Key')" :aria-label="$t('Key')" :class="{ 'input-error': isPopulateFieldError(i, entry.key) }" @update:model-value="syncToModel" />
                <el-select v-model="entry.source" :placeholder="$t('Source')" :aria-label="$t('Source')" :class="{ 'input-error': isPopulateFieldError(i, entry.key) }" @update:model-value="syncToModel">
                  <el-option :value="PopulateSource.user" :label="$t('User')" />
                  <el-option :value="PopulateSource.workspace" :label="$t('Workspace')" />
                  <el-option :value="PopulateSource.blueprintEntities" :label="$t('Blueprint Entities')" />
                  <el-option :value="PopulateSource.blueprintEntity" :label="$t('Blueprint Entity')" />
                  <el-option :value="PopulateSource.vectorStores" :label="$t('Vector Stores')" />
                  <el-option :value="PopulateSource.apiWebhook" :label="$t('API Webhook')" />
                </el-select>
                <BlueprintDropdown v-if="entry.source === PopulateSource.blueprintEntities || entry.source === PopulateSource.blueprintEntity" v-model="entry.blueprint" @update:model-value="syncToModel" />
                <template v-if="entry.source === PopulateSource.vectorStores">
                  <el-select v-model="entry.scope" :placeholder="$t('Scope')" :aria-label="$t('Scope')" @update:model-value="syncToModel">
                    <el-option value="tenant" :label="$t('Tenant')" />
                    <el-option value="user" :label="$t('User')" />
                    <el-option value="workspace" :label="$t('Workspace')" />
                    <el-option value="thread" :label="$t('Thread')" />
                  </el-select>
                  <el-input v-model="entry.subjectId" :placeholder="$t('Subject ID (optional)')" :aria-label="$t('Subject ID (optional)')" @update:model-value="syncToModel" />
                </template>
                <el-select v-if="entry.source === PopulateSource.apiWebhook" v-model="entry.integration" :placeholder="$t('Select Integration')" :aria-label="$t('Select Integration')" filterable @update:model-value="syncToModel">
                  <el-option v-for="integration in apiWebhookIntegrations" :key="integration._id" :value="integration._id" :label="integration.trigger.details?.name || integration._id" />
                </el-select>
                <el-button text circle type="danger" :aria-label="`${$t('Remove')}: ${entry.key || $t('Key')}`" @click="removePopulateEntry(i, index)"><el-icon><Delete /></el-icon></el-button>
              </div>
              <el-button class="add" text @click="addPopulateEntry(i)"><el-icon><Plus /></el-icon>{{ $t('Add Field') }}</el-button>
            </section>

            <section class="block" :aria-label="$t('Options')">
              <header>
                <h4>{{ $t('Options') }}</h4>
                <p>{{ $t('Configure additional options for this step') }}</p>
              </header>
              <div class="option">
                <div>
                  <strong>{{ $t('Clear previous data') }}</strong>
                  <span>{{ $t('When enabled, only data from this step will pass to the next step') }}</span>
                </div>
                <el-switch v-model="clearFlags[i]" :aria-label="$t('Clear previous data')" @update:model-value="syncToModel" />
              </div>
              <div class="option">
                <div>
                  <strong>{{ $t('Abort') }}</strong>
                  <span>{{ $t('Abort will prevent the target from being called') }}</span>
                </div>
                <div class="abort">
                  <el-select v-model="abortTypes[i]" :aria-label="$t('Abort')" :class="{ 'input-error': isAbortError(i) }" @update:model-value="handleAbortTypeChange(i)">
                    <el-option value="none" :label="$t('No abort')" />
                    <el-option value="boolean" :label="$t('Abort operation')" />
                    <el-option value="expression" :label="$t('Abort with condition')" />
                  </el-select>
                  <el-input v-if="abortTypes[i] === 'expression'" dir="ltr" v-model="abortValues[i]" placeholder="JQ Expression" aria-label="JQ Expression" :class="{ 'input-error': isAbortError(i) }" @update:model-value="syncToModel" />
                </div>
              </div>
            </section>

            <details class="raw">
              <summary>{{ $t('Edit this step as JSON') }}</summary>
              <Monaco :modelValue="stepJsons[i]" height="200px" language="json" @update:modelValue="(value) => updateStepJson(i, value)" />
            </details>
          </div>
        </li>
      </ol>
    </template>

    <!-- try it with a sample -->
    <section class="tester" :aria-label="$t('Test Data Manipulation')">
      <header class="tester-head">
        <div>
          <h3>{{ $t('Test Data Manipulation') }}</h3>
          <p>{{ $t('Send a sample payload to preview the transformed result without leaving this form.') }}</p>
        </div>
        <div class="tester-actions">
          <el-button @click="resetTestPayload">{{ $t('Reset Sample Payload') }}</el-button>
          <el-button type="primary" :loading="isTestingDataManipulation" @click="runDataManipulationTest">{{ $t('Run Test') }}</el-button>
        </div>
      </header>

      <div v-if="isWebhookTrigger" class="samples">
        <div class="samples-head">
          <div>
            <strong>{{ $t('Recent Webhook Events') }}</strong>
            <span>{{ $t('Load real events captured in the last month to test your workflow.') }}</span>
          </div>
          <el-button size="small" :loading="webhookSamplesLoading" type="primary" plain @click="loadWebhookSamples()">{{ webhookSamplesLoaded ? $t('Refresh Events') : $t('Load Events') }}</el-button>
        </div>
        <el-alert v-if="!canLoadWebhookSamples" :title="$t('Fill Source, Kind, and Event Name to fetch events.')" type="info" show-icon :closable="false" />
        <el-alert v-else-if="webhookSamplesError" :title="webhookSamplesError" type="error" show-icon :closable="false" />
        <el-skeleton v-else-if="webhookSamplesLoading" :rows="3" animated />
        <p v-else-if="webhookSamplesLoaded && !webhookSamples.length" class="muted">{{ $t('No events found for the selected filters.') }}</p>
        <ul v-else-if="webhookSamples.length" class="sample-list">
          <li v-for="row in webhookSamples" :key="row._id">
            <span class="sample-text"><strong>{{ row.eventName }}</strong><small>{{ row.source }} · {{ row.kind }} · {{ formatEventTimestamp(row.created) }}</small></span>
            <el-button size="small" type="primary" plain :loading="webhookSampleLoading && webhookSampleSelectedId === row._id" @click="applyWebhookSample(row)">{{ $t('Use Sample') }}</el-button>
          </li>
        </ul>
      </div>

      <div class="panes">
        <div class="pane">
          <label class="pane-label">{{ $t('Sample Payload (JSON)') }}</label>
          <Monaco :modelValue="testPayloadText" height="260px" language="json" @update:modelValue="updateTestPayload" />
        </div>
        <div class="pane">
          <label class="pane-label">{{ $t('Result') }}</label>
          <el-alert v-if="testError" :title="testError" type="error" show-icon :closable="false" role="alert" />
          <Monaco v-else-if="testResultText" :modelValue="testResultText" height="260px" language="json" @update:modelValue="(value) => (testResultText = value)" />
          <p v-else class="muted result-empty">{{ $t('Run the test to see the transformed payload here.') }}</p>
        </div>
      </div>
    </section>

    <!-- Template Dialog -->
    <el-dialog 
      v-model="showTemplateDialog" 
      :title="$t('AI Chat Context Templates')" 
      width="800px"
      class="template-dialog"
    >
      <div class="template-dialog-content">
        <el-alert type="info" :closable="false" class="mb-4">
          {{ $t('Choose a pre-built template to quickly set up data manipulation for AI chat completion with workspace context.') }}
        </el-alert>
        
        <div class="template-grid">
          <div 
            v-for="template in templates" 
            :key="template.id" 
            class="template-card"
            :class="{ 'selected': selectedTemplate === template.id }"
            @click="selectedTemplate = template.id"
          >
            <div class="template-card-header">
              <div class="template-icon">
                <component :is="getTemplateIcon(template.icon)" />
              </div>
              <div class="template-title">
                <h4>{{ template.name }}</h4>
                <span v-if="template.requiresBlueprint" class="blueprint-required">
                  {{ $t('Requires Blueprint') }}
                </span>
              </div>
            </div>
            <div class="template-description">
              <p>{{ template.description }}</p>
            </div>
            <div class="template-features">
              <el-tag v-if="template.requiresBlueprint" size="small" type="warning">
                {{ $t('Blueprint Data') }}
              </el-tag>
              <el-tag size="small" type="info">
                {{ $t('Workspace Context') }}
              </el-tag>
              <el-tag size="small" type="success">
                {{ $t('AI Ready') }}
              </el-tag>
            </div>
          </div>
        </div>
        
        <!-- Blueprint Selection -->
        <div 
          v-if="selectedTemplate && templates.find(t => t.id === selectedTemplate)?.requiresBlueprint" 
          class="blueprint-selection-section"
        >
          <el-divider />
          <div class="blueprint-selection">
            <div class="blueprint-selection-header">
              <h4>{{ $t('Select Blueprint') }}</h4>
              <p>{{ $t('Choose which blueprint data to include in the chat context') }}</p>
            </div>
            <div class="blueprint-dropdown-container">
              <BlueprintDropdown 
                v-model="selectedBlueprintForTemplate" 
                placeholder="Select a blueprint..."
              />
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="template-dialog-footer">
          <el-button @click="showTemplateDialog = false">
            {{ $t('Cancel') }}
          </el-button>
          <el-button 
            type="primary" 
            @click="applyTemplate"
            :disabled="!canApplyTemplate"
          >
            {{ $t('Apply Template') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.mapping {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-inline-size: 0;
}

.intro {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  text-align: start;
}

.mode-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  .grow {
    flex: 1;
  }
}

.empty {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  color: var(--el-text-color-secondary);
  text-align: start;

  strong {
    color: var(--el-text-color-primary);
  }
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--surface);

  &.open {
    border-color: var(--el-color-primary-light-5);
  }

  &.failed {
    border-color: var(--el-color-danger-light-5);
  }
}

.step-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-inline-end: 6px;
}

.step-toggle {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-inline-size: 0;
  padding: 10px 10px 10px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-lighter);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.num {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 26px;
  block-size: 26px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 0.8rem;
  font-weight: 700;
}

.step-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;
}

.step-sum {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 0.84rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chev {
  flex: none;
  color: var(--el-text-color-placeholder);
  font-size: 0.75rem;
}

.step-tools {
  display: flex;
  flex: none;
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 14px 14px;
}

.block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;

  header {
    h4 {
      margin: 0;
      padding: 0;
      font-size: 0.95rem;
    }

    p {
      margin: 2px 0 0;
      color: var(--el-text-color-secondary);
      font-size: 0.84rem;
      text-align: start;
    }
  }
}

.entry {
  display: flex;
  align-items: center;
  gap: 8px;
  inline-size: 100%;

  > :deep(.el-input),
  > :deep(.el-select) {
    flex: 1;
    min-inline-size: 0;
  }

  &.populate > :deep(.el-select) {
    flex: 0 1 190px;
  }
}

.equals {
  flex: none;
  color: var(--el-text-color-placeholder);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.option {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  inline-size: 100%;
  padding-block: 4px;

  > div:first-child {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-inline-size: 0;

    span {
      color: var(--el-text-color-secondary);
      font-size: 0.84rem;
      text-align: start;
    }
  }
}

.abort {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-inline-size: 420px;

  :deep(.el-select),
  :deep(.el-input) {
    min-inline-size: 190px;
  }
}

// quiet "add" links: the theme gives every primary button a solid fill
.add {
  padding-inline: 6px;
  border: 0 !important;
  background: transparent !important;
  color: var(--el-color-primary) !important;
}

[dir='rtl'] .chev {
  transform: scaleX(-1);
}

.raw {
  summary {
    color: var(--el-color-primary);
    font-size: 0.88rem;
    cursor: pointer;
  }

  :deep(.monaco) {
    margin-block-start: 8px;
  }
}

.input-error :deep(.el-input__wrapper),
.input-error :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

// ---- tester ----
.tester {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-block-start: 14px;
  border-block-start: 1px solid var(--el-border-color-lighter);
}

.tester-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;

  h3 {
    margin: 0;
    padding: 0;
    font-size: 1rem;
  }

  p {
    margin: 2px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 0.86rem;
    text-align: start;
  }
}

.tester-actions {
  display: flex;
  gap: 8px;
}

.samples {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}

.samples-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;

  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;

    span {
      color: var(--el-text-color-secondary);
      font-size: 0.84rem;
    }
  }
}

.sample-list {
  display: flex;
  flex-direction: column;
  max-block-size: 220px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 6px 0;
  }

  li + li {
    border-block-start: 1px solid var(--el-border-color-extra-light);
  }
}

.sample-text {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;

  small {
    color: var(--el-text-color-secondary);
  }
}

.panes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pane {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-inline-size: 0;
}

.pane-label {
  font-size: 0.86rem;
  font-weight: 600;
}

.muted {
  margin: 0;
  color: var(--el-text-color-secondary);
  text-align: start;
}

.result-empty {
  padding: 18px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
}

@media (max-width: 1023px) {
  .panes {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 639px) {
  .entry {
    flex-wrap: wrap;

    > :deep(.el-input),
    > :deep(.el-select) {
      flex-basis: 100%;
    }

    .equals {
      display: none;
    }
  }

  .option {
    flex-direction: column;
  }
}

// ---- template dialog (unchanged) ----
.template-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.template-icon {
  font-size: 24px;
}

.template-info {
  flex-grow: 1;
}

.template-actions {
  display: flex;
  gap: 10px;
}

.template-dialog-content {
  max-height: 70vh;
  overflow-y: auto;
  padding: 0;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.template-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.template-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.template-card.selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.template-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.template-icon {
  font-size: 20px;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.template-title {
  flex: 1;
}

.template-title h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.template-description {
  margin-bottom: 12px;
}

.template-description p {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
}

.template-features {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.template-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color-page);
}

.blueprint-selector {
  margin-top: 20px;
}

.blueprint-required {
  font-size: 11px;
  color: var(--el-color-warning);
  font-weight: 500;
}

.blueprint-selection-section {
  margin-top: 20px;
  padding: 0 20px;
}

.blueprint-selection {
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color-page);
}

.blueprint-selection-header {
  margin-bottom: 12px;
}

.blueprint-selection-header h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
}

.blueprint-selection-header p {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.blueprint-dropdown-container {
  margin-bottom: 12px;
}
</style>
