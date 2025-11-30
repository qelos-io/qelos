<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { Delete, Plus, ArrowUp, ArrowDown, MagicStick, Document } from '@element-plus/icons-vue';
import BlueprintDropdown from '@/modules/integrations/components/BlueprintDropdown.vue';
import { storeToRefs } from 'pinia';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { capitalize } from 'vue';
import { getPlural } from '@/modules/core/utils/texts';
import { QelosTriggerOperation } from '@qelos/global-types';
import { ElMessage } from 'element-plus';
import { executeDataManipulationTest } from '@/services/apis/data-manipulation-service';
import eventsService, { IEvent } from '@/services/apis/events-service';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import { authStore } from '@/modules/core/store/auth';


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
const mapEntries = ref<Record<number, Array<{key: string, value: string}>>>({});
const populateEntries = ref<Record<number, Array<{key: string, source: string, blueprint?: string}>>>({});
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
    if (step.map) {
      mapEntries.value[stepIndex] = Object.entries(step.map).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)
      }));
    } else {
      mapEntries.value[stepIndex] = [];
    }
    
    // Convert populate object to array
    if (step.populate) {
      populateEntries.value[stepIndex] = Object.entries(step.populate).map(([key, config]) => {
        const populateConfig = config as { source?: string; blueprint?: string };
        return {
          key,
          source: populateConfig.source || 'user',
          blueprint: populateConfig.blueprint
        };
      });
    } else {
      populateEntries.value[stepIndex] = [];
    }
    
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
          newStep.populate[entry.key] = {
            source: entry.source || 'user'
          };
          if ((entry.source === 'blueprintEntities' || entry.source === 'blueprintEntity') && entry.blueprint) {
            newStep.populate[entry.key].blueprint = entry.blueprint;
          }
        }
      });
    }
    
    // Add clear flag if true
    if (clearFlags.value[stepIndex]) {
      newStep.clear = true;
    } else {
      delete newStep.clear;
    }
    
    // Add abort property based on type
    if (abortTypes.value[stepIndex] === 'boolean' && abortValues.value[stepIndex] === true) {
      newStep.abort = true;
    } else if (abortTypes.value[stepIndex] === 'expression' && abortValues.value[stepIndex]) {
      newStep.abort = abortValues.value[stepIndex] as string;
    } else {
      delete newStep.abort;
    }
    
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
    source: 'user'
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
        const populateConfig = config as { source?: string; blueprint?: string };
        return {
          key,
          source: populateConfig.source || 'user',
          blueprint: populateConfig.blueprint
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
          const populateConfig = config;
          return { key, source: populateConfig.source || 'user', blueprint: populateConfig.blueprint };
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
        return { key, source: populateConfig.source || 'user', blueprint: populateConfig.blueprint };
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
});

</script>

<template>
  <div class="data-manipulation-container">
    <el-alert type="info" :closable="false" class="mb-3">
      {{ $t('Each step processes data from the previous step. Use map to transform data and populate to fetch related data.') }}
    </el-alert>
    
    <!-- Steps List -->
    <div v-for="(step, i) in steps" :key="i" class="data-step">
      <div class="step-header">
        <h4>{{ $t('Step') }} {{ i + 1 }}</h4>
        <el-tag v-if="getStepError(i)" type="danger" size="small">
          {{ $t('Needs attention') }}
        </el-tag>
        <div class="step-actions">
          <el-button size="small" type="danger" @click="removeStep(i)" :icon="Delete" circle />
          <el-button size="small" @click="moveStep(i, i - 1)" :disabled="i === 0" :icon="ArrowUp" circle />
          <el-button size="small" @click="moveStep(i, i + 1)" :disabled="i === steps.length - 1" :icon="ArrowDown" circle />
        </div>
      </div>
      <el-alert
        v-if="getStepError(i)"
        type="error"
        show-icon
        :closable="false"
        class="step-error-alert"
        :title="$t('This step failed during the last test.')"
        :description="getStepError(i)?.message"
      />
      
      <el-tabs class="step-tabs">
        <!-- Map Tab -->
        <el-tab-pane :label="$t('Map')">
          <p class="step-description">{{ $t('Map transforms data using JQ-like expressions') }}</p>
          <div class="map-entries">
            <div v-for="(entry, index) in getMapEntries(i)" :key="index" class="map-entry" :class="{ 'has-error': isMapFieldError(i, entry.key) }">
              <el-input 
                dir="ltr"
                v-model="entry.key" 
                placeholder="Key" 
                @update:model-value="syncToModel" 
                :class="{ 'input-error': isMapFieldError(i, entry.key) }"
              />  
              <el-input 
                dir="ltr"
                v-model="entry.value" 
                placeholder="JQ Expression" 
                @update:model-value="syncToModel" 
                :class="{ 'input-error': isMapFieldError(i, entry.key) }"
              />
              <el-button type="danger" :icon="Delete" @click="removeMapEntry(i, index)" circle />
            </div>
            <el-button type="primary" @click="addMapEntry(i)" :icon="Plus">{{ $t('Add Field') }}</el-button>
          </div>
        </el-tab-pane>
        
        <!-- Populate Tab -->
        <el-tab-pane :label="$t('Populate')">
          <p class="step-description">{{ $t('Populate fetches related data from databases') }}</p>
          <div class="populate-entries">
            <div v-for="(entry, index) in populateEntries[i]" :key="index" class="populate-entry" :class="{ 'has-error': isPopulateFieldError(i, entry.key) }">
              <el-input 
                dir="ltr"
                v-model="entry.key" 
                placeholder="Key" 
                @update:model-value="syncToModel" 
                :class="{ 'input-error': isPopulateFieldError(i, entry.key) }"
              />
              <el-select 
                v-model="entry.source" 
                placeholder="Source"
                @update:model-value="syncToModel" 
                :class="{ 'input-error': isPopulateFieldError(i, entry.key) }"
              >
                <el-option value="user" label="User" />
                <el-option value="workspace" label="Workspace" />
                <el-option value="blueprint" label="Blueprint" />
                <el-option value="blueprintEntities" label="Blueprint Entities" />
                <el-option value="blueprintEntity" label="Blueprint Entity" />
              </el-select>
              <BlueprintDropdown 
                v-if="entry.source === 'blueprintEntities' || entry.source === 'blueprintEntity'" 
                v-model="entry.blueprint" 
                @update:model-value="syncToModel" 
              />
              <el-button type="danger" :icon="Delete" @click="removePopulateEntry(i, index)" circle />
            </div>
            <el-button type="primary" @click="addPopulateEntry(i)" :icon="Plus">{{ $t('Add Field') }}</el-button>
          </div>
        </el-tab-pane>
        
        <!-- JSON View Tab -->
        <el-tab-pane :label="$t('JSON View')">
          <Monaco 
            :modelValue="stepJsons[i]" 
            height="200px" 
            language="json"
            @update:modelValue="(value) => updateStepJson(i, value)" 
          />
        </el-tab-pane>
        <!-- Options Tab -->
        <el-tab-pane :label="$t('Options')">
          <p class="step-description">{{ $t('Configure additional options for this step') }}</p>
          <div class="step-options">
            <div class="option-item">
              <el-switch
                v-model="clearFlags[i]"
                :active-text="$t('Clear previous data')"
                @update:model-value="syncToModel"
              />
              <div class="option-description">
                {{ $t('When enabled, only data from this step will pass to the next step') }}
              </div>
            </div>
            
            <div class="option-item">
              <div class="abort-option">
                <el-select
                  v-model="abortTypes[i]"
                  @update:model-value="handleAbortTypeChange(i)"
                  :class="{ 'input-error': isAbortError(i) }"
                >
                  <el-option value="none" :label="$t('No abort')" />
                  <el-option value="boolean" :label="$t('Abort operation')" />
                  <el-option value="expression" :label="$t('Abort with condition')" />
                </el-select>
                
                <el-input
                  v-if="abortTypes[i] === 'expression'"
                  dir="ltr"
                  v-model="abortValues[i]"
                  placeholder="JQ Expression"
                  @update:model-value="syncToModel"
                  :class="{ 'input-error': isAbortError(i) }"
                />
              </div>
              <div class="option-description">
                {{ $t('Abort will prevent the target from being called') }}
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <!-- Add Step Button -->
    <div class="add-step-container">
      <el-button type="primary" @click="addStep" :icon="Plus">{{ $t('Add Step') }}</el-button>
      <el-button type="primary" @click="openTemplateDialog" :icon="MagicStick">{{ $t('Apply Template') }}</el-button>
    </div>
    
    <el-divider />
    
    <!-- Complete JSON Preview -->
    <div class="json-preview">
      <Accordion>
        <AccordionTab :header="$t('Complete Data Manipulation JSON')">
          <Monaco 
            :modelValue="completeJsonText" 
            height="200px" 
            language="json"
            @update:modelValue="updateCompleteJson" 
          />
        </AccordionTab>
      </Accordion>
    </div>

    <el-divider />

    <div class="data-manipulation-test">
      <div class="test-header">
        <div>
          <h4>{{ $t('Test Data Manipulation') }}</h4>
          <p>{{ $t('Send a sample payload to preview the transformed result without leaving this form.') }}</p>
        </div>
        <div class="test-actions">
          <el-button @click="resetTestPayload">{{ $t('Reset Sample Payload') }}</el-button>
          <el-button type="primary" :loading="isTestingDataManipulation" @click="runDataManipulationTest">
            {{ $t('Run Test') }}
          </el-button>
        </div>
      </div>

      <div class="test-editor">
        <Accordion>
          <AccordionTab :header="$t('Sample Payload (JSON)')">
            <Monaco 
              :modelValue="testPayloadText" 
              height="200px" 
              language="json"
              @update:modelValue="updateTestPayload" 
            />
          </AccordionTab>
        </Accordion>
      </div>

      <div v-if="isWebhookTrigger" class="webhook-samples">
        <div class="webhook-samples-header">
          <div>
            <label class="section-label">{{ $t('Recent Webhook Events') }}</label>
            <p>{{ $t('Load real events captured in the last month to test your workflow.') }}</p>
          </div>
          <el-button
            size="small"
            :loading="webhookSamplesLoading"
            type="primary"
            plain
            @click="loadWebhookSamples()"
          >
            {{ webhookSamplesLoaded ? $t('Refresh Events') : $t('Load Events') }}
          </el-button>
        </div>

        <el-alert
          v-if="!canLoadWebhookSamples"
          :title="$t('Fill Source, Kind, and Event Name to fetch events.')"
          type="info"
          show-icon
          class="mb-2"
        />
        <el-alert
          v-else-if="webhookSamplesError"
          :title="webhookSamplesError"
          type="error"
          show-icon
          class="mb-2"
        />
        <el-skeleton v-else-if="webhookSamplesLoading" :rows="3" animated />
        <el-empty
          v-else-if="webhookSamplesLoaded && !webhookSamples.length"
          :description="$t('No events found for the selected filters.')"
        />
        <el-table
          v-else
          :data="webhookSamples"
          size="small"
          border
          class="webhook-samples-table"
        >
          <el-table-column :label="$t('Event')">
            <template #default="{ row }">
              <div class="event-name">{{ row.eventName }}</div>
              <small class="event-source">{{ row.source }} · {{ row.kind }}</small>
            </template>
          </el-table-column>
          <el-table-column :label="$t('Captured')" width="160">
            <template #default="{ row }">
              {{ formatEventTimestamp(row.created) }}
            </template>
          </el-table-column>
          <el-table-column width="140">
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                plain
                :loading="webhookSampleLoading && webhookSampleSelectedId === row._id"
                @click="applyWebhookSample(row)"
              >
                {{ $t('Use Sample') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-alert
        v-if="testError"
        :title="testError"
        type="error"
        show-icon
        class="mb-3"
      />

      <div v-if="testResultText" class="test-result">
        <label class="section-label">{{ $t('Result') }}</label>
        <Monaco 
          :modelValue="testResultText" 
          height="200px" 
          language="json"
          @update:modelValue="(value) => testResultText = value"
        />
      </div>
    </div>
    
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

<style scoped>
.data-manipulation-container {
  padding: 10px 0;
}

.data-step {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.step-header h4 {
  margin: 0;
}

.step-actions {
  display: flex;
  gap: 5px;
}

.step-tabs {
  margin-top: 10px;
}

.step-description {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
  margin-bottom: 15px;
}

.map-entries, .populate-entries {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.map-entry, .populate-entry {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.add-step-container {
  margin: 20px 0;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.json-preview {
  margin-top: 20px;
}

.mb-3 {
  margin-bottom: 15px;
}

/* Connection selector icon styling */
:deep(.flex-row) {
  display: flex;
  align-items: center;
}

:deep(.flex-middle) {
  align-items: center;
}

:deep(.flex-row img) {
  width: 20px;
  height: 20px;
  margin-inline-end: 8px;
  object-fit: contain;
}

:deep(.flex-row small) {
  font-size: 0.8em;
  margin-inline-end: 8px;
  color: var(--el-text-color-secondary);
}

/* Options tab styling */
.step-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.option-description {
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.abort-option {
  display: flex;
  gap: 10px;
  align-items: center;
}

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

.blueprint-selector {
  margin-top: 20px;
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

.blueprint-required {
  font-size: 11px;
  color: var(--el-color-warning);
  font-weight: 500;
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

.template-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color-page);
}

.data-manipulation-test {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  margin-block: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.test-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.test-header h4 {
  margin: 0;
}

.test-header p {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
}

.test-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.test-editor,
.test-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.step-error-alert {
  margin-bottom: 12px;
}

.map-entry.has-error,
.populate-entry.has-error {
  border-inline-start: 3px solid var(--el-color-danger);
  padding-inline-start: 8px;
  border-radius: 4px;
}

.webhook-samples {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.webhook-samples-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.webhook-samples-header p {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
}

.webhook-samples-table {
  border-radius: 6px;
  overflow: hidden;
}

.event-name {
  font-weight: 600;
}

.event-source {
  color: var(--el-text-color-secondary);
}
</style>
