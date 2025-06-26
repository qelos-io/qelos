<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { Delete, Plus } from '@element-plus/icons-vue';
import BlueprintDropdown from '@/modules/integrations/components/BlueprintDropdown.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useIntegrationKindsTargetOperations } from '@/modules/integrations/compositions/integration-kinds-operations';
import { IntegrationSourceKind, OpenAITargetOperation, QelosTargetOperation, HttpTargetOperation } from '@qelos/global-types';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits(['update:modelValue']);

const store = useIntegrationSourcesStore();
const kinds = useIntegrationKinds();
const targetOperations = useIntegrationKindsTargetOperations();

// Target tab UI state
const httpHeaderKeys = ref<Record<string, string>>({});
const httpQueryKeys = ref<Record<string, string>>({});
const httpDetails = ref({
  method: 'GET',
  url: '',
  headers: {},
  query: {},
  body: {}
});
const httpBodyJson = ref('{}');

const openAiDetails = ref({
  model: 'gpt-4o',
  temperature: 0.7,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  max_tokens: 1000,
  stop: undefined,
  response_format: undefined,
  pre_messages: []
});

// OpenAI model options
const openAiModelOptions = [
  { label: 'GPT-4o', identifier: 'gpt-4o' },
  { label: 'GPT-4 Turbo', identifier: 'gpt-4-turbo' },
  { label: 'GPT-4', identifier: 'gpt-4' },
  { label: 'GPT-3.5', identifier: 'gpt-3.5' },
  { label: 'GPT-3.5 Turbo', identifier: 'gpt-3.5-turbo' },
  { label: 'GPT-3.5 Turbo 16k', identifier: 'gpt-3.5-turbo-16k' },
  { label: 'GPT-4 Vision', identifier: 'gpt-4-vision-preview' },
  { label: 'GPT-4 32k', identifier: 'gpt-4-32k' }
];

// Import icons
import {
  Service as CustomerSupportIcon,
  Document as DocumentIcon,
  Cpu as SaasIcon,
  DataAnalysis as DataAnalystIcon,
  Operation as ConsultantIcon,
  ChatDotRound as DefaultChatIcon
} from '@element-plus/icons-vue';

// Pre-defined chat personalities with complete configurations
const chatPersonalities = [
  {
    name: 'Customer Support Agent',
    icon: CustomerSupportIcon,
    description: 'Friendly and helpful support agent that provides clear solutions',
    systemMessage: 'You are a helpful customer support agent. Your goal is to assist users with their questions and concerns in a friendly, professional manner. Provide clear explanations and solutions to their problems. If you don\'t know the answer, acknowledge that and suggest where they might find more information.',
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  },
  {
    name: 'Technical Documentation Writer',
    icon: DocumentIcon,
    description: 'Clear, precise technical explanations with structured responses',
    systemMessage: 'You are a technical documentation writer. Your goal is to explain complex technical concepts in clear, concise language. Use examples where appropriate and structure your responses in a logical manner. Focus on accuracy and clarity above all else.',
    temperature: 0.3,
    max_tokens: 1500,
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0
  },
  {
    name: 'SaaS Product Expert',
    icon: SaasIcon,
    description: 'Specialized in multi-tenant applications and SaaS best practices',
    systemMessage: 'You are a SaaS product expert specializing in multi-tenant applications. Your goal is to help users understand best practices for SaaS architecture, pricing models, user onboarding, and feature development. Provide practical advice based on industry standards and successful case studies.',
    temperature: 0.6,
    max_tokens: 1200,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0.1
  },
  {
    name: 'Data Analyst',
    icon: DataAnalystIcon,
    description: 'Helps interpret data patterns and suggest visualization techniques',
    systemMessage: 'You are a data analyst with expertise in interpreting and visualizing data. Your goal is to help users understand their data, identify patterns and insights, and make data-driven decisions. Suggest appropriate visualization techniques and analytical approaches based on the type of data and questions being asked.',
    temperature: 0.4,
    max_tokens: 1000,
    top_p: 0.9,
    frequency_penalty: 0.2,
    presence_penalty: 0
  },
  {
    name: 'Business Process Consultant',
    icon: ConsultantIcon,
    description: 'Identifies inefficiencies and suggests process improvements',
    systemMessage: 'You are a business process consultant specializing in workflow optimization. Your goal is to help users identify inefficiencies in their current processes and suggest improvements. Focus on automation opportunities, integration points between systems, and ways to measure and track process performance.',
    temperature: 0.5,
    max_tokens: 1200,
    top_p: 0.95,
    frequency_penalty: 0.1,
    presence_penalty: 0.1
  }
];

// UI state variables for OpenAI chat completion form
const showAdvancedOptions = ref(false);
const showRawJson = ref(false);
const systemMessage = ref('');
const selectedPersonality = ref('');

const qelosDetails = ref({
  eventName: '',
  description: '',
  password: '',
  roles: '',
  userId: '',
  blueprint: '',
});

// Roles tags input handling
const roleInputRef = ref();
const roleInputVisible = ref(false);
const roleInputValue = ref('');

// Convert roles string to array for tag display
const rolesArray = computed(() => {
  if (!qelosDetails.value.roles) return [];
  
  try {
    // If it's already a JSON array string, parse it
    if (qelosDetails.value.roles.startsWith('[') && qelosDetails.value.roles.endsWith(']')) {
      return JSON.parse(qelosDetails.value.roles);
    }
    // If it's a dot notation path, return it as a single item
    if (qelosDetails.value.roles.startsWith('.')) {
      return [qelosDetails.value.roles];
    }
    // Otherwise split by comma
    return qelosDetails.value.roles.split(',').map(role => role.trim()).filter(Boolean);
  } catch (e) {
    // If parsing fails, return as a single item
    return [qelosDetails.value.roles];
  }
});

// Show the input for adding a new role
const showRoleInput = () => {
  roleInputVisible.value = true;
  nextTick(() => {
    roleInputRef.value?.input?.focus();
  });
};

// Handle removing a role tag
const handleRoleRemove = (tag) => {
  const roles = rolesArray.value.filter(role => role !== tag);
  qelosDetails.value.roles = JSON.stringify(roles);
  syncQelosDetailsToTargetDetails();
};

// Handle confirming a new role tag
const handleRoleConfirm = () => {
  if (roleInputValue.value) {
    const roles = [...rolesArray.value, roleInputValue.value];
    qelosDetails.value.roles = JSON.stringify(roles);
  }
  roleInputVisible.value = false;
  roleInputValue.value = '';
  syncQelosDetailsToTargetDetails();
};

// Computed property for the selected source
const selectedTargetSource = computed(() => store.result?.find(s => s._id === props.modelValue.source));

// Use a ref for the target details JSON instead of a computed property
const targetDetailsText = ref(JSON.stringify(props.modelValue.details || {}, null, 2));

// Update target details from JSON text
const updateTargetDetails = (value: string) => {
  try {
    const newModelValue = { ...props.modelValue };
    newModelValue.details = JSON.parse(value);
    emit('update:modelValue', newModelValue);
  } catch (e) {
    // Invalid JSON, ignore
  }
};

// HTTP Target Methods
const addHttpHeader = () => {
  const newKey = `header${Object.keys(httpDetails.value.headers).length + 1}`;
  httpDetails.value.headers[newKey] = '';
  httpHeaderKeys.value[newKey] = newKey;
  syncHttpDetailsToTargetDetails();
};

const removeHttpHeader = (key: string) => {
  if (httpDetails.value.headers[key] !== undefined) {
    const { [key]: _, ...rest } = httpDetails.value.headers;
    httpDetails.value.headers = rest;
    
    const { [key]: __, ...restKeys } = httpHeaderKeys.value;
    httpHeaderKeys.value = restKeys;
    
    syncHttpDetailsToTargetDetails();
  }
};

const updateHttpHeader = (oldKey: string, newKey: string) => {
  if (oldKey === newKey || !httpDetails.value.headers) return;
  
  const value = httpDetails.value.headers[oldKey];
  const { [oldKey]: _, ...rest } = httpDetails.value.headers;
  httpDetails.value.headers = { ...rest, [newKey]: value };
  
  const { [oldKey]: __, ...restKeys } = httpHeaderKeys.value;
  httpHeaderKeys.value = { ...restKeys, [newKey]: newKey };
  
  syncHttpDetailsToTargetDetails();
};

const addHttpQuery = () => {
  const newKey = `param${Object.keys(httpDetails.value.query).length + 1}`;
  httpDetails.value.query[newKey] = '';
  httpQueryKeys.value[newKey] = newKey;
  syncHttpDetailsToTargetDetails();
};

const removeHttpQuery = (key: string) => {
  if (httpDetails.value.query[key] !== undefined) {
    const { [key]: _, ...rest } = httpDetails.value.query;
    httpDetails.value.query = rest;
    
    const { [key]: __, ...restKeys } = httpQueryKeys.value;
    httpQueryKeys.value = restKeys;
    
    syncHttpDetailsToTargetDetails();
  }
};

const updateHttpQuery = (oldKey: string, newKey: string) => {
  if (oldKey === newKey || !httpDetails.value.query) return;
  
  const value = httpDetails.value.query[oldKey];
  const { [oldKey]: _, ...rest } = httpDetails.value.query;
  httpDetails.value.query = { ...rest, [newKey]: value };
  
  const { [oldKey]: __, ...restKeys } = httpQueryKeys.value;
  httpQueryKeys.value = { ...restKeys, [newKey]: newKey };
  
  syncHttpDetailsToTargetDetails();
};

// Sync UI state to form.target.details
const syncHttpDetailsToTargetDetails = () => {
  try {
    httpDetails.value.body = JSON.parse(httpBodyJson.value);
  } catch (e) {
    // Invalid JSON, use empty object
    httpDetails.value.body = {};
  }
  const newModelValue = { ...props.modelValue };
  newModelValue.details = { ...httpDetails.value };
  emit('update:modelValue', newModelValue);
};

const syncOpenAiDetailsToTargetDetails = () => {
  const newModelValue = { ...props.modelValue };
  newModelValue.details = { ...openAiDetails.value };
  
  // Ensure pre_messages array exists and contains system message
  if (!newModelValue.details.pre_messages) {
    newModelValue.details.pre_messages = [];
  }
  
  // Update or add system message if it exists
  if (systemMessage.value) {
    const systemMsgIndex = newModelValue.details.pre_messages.findIndex(msg => msg.role === 'system');
    if (systemMsgIndex >= 0) {
      newModelValue.details.pre_messages[systemMsgIndex].content = systemMessage.value;
    } else {
      newModelValue.details.pre_messages.push({
        role: 'system',
        content: systemMessage.value
      });
    }
  }
  
  emit('update:modelValue', newModelValue);
};

const syncQelosDetailsToTargetDetails = () => {
  const newModelValue = { ...props.modelValue };
  newModelValue.details = { ...qelosDetails.value };
  emit('update:modelValue', newModelValue);
};

// Initialize system message from pre_messages when component mounts or details change
const initializeSystemMessage = () => {
  if (selectedTargetSource.value?.kind === IntegrationSourceKind.OpenAI && 
      props.modelValue.operation === OpenAITargetOperation.chatCompletion && 
      props.modelValue.details?.pre_messages?.length) {
    const systemMsg = props.modelValue.details.pre_messages.find(msg => msg.role === 'system');
    systemMessage.value = systemMsg?.content || '';
  } else {
    systemMessage.value = '';
  }
};

// Update system message in pre_messages array
const updateSystemMessage = () => {
  if (!props.modelValue.details.pre_messages) {
    props.modelValue.details.pre_messages = [];
  }
  
  const newModelValue = { ...props.modelValue };
  const systemMsgIndex = newModelValue.details.pre_messages.findIndex(msg => msg.role === 'system');
  
  if (systemMsgIndex >= 0) {
    newModelValue.details.pre_messages[systemMsgIndex].content = systemMessage.value;
  } else {
    newModelValue.details.pre_messages.push({
      role: 'system',
      content: systemMessage.value
    });
  }
  
  emit('update:modelValue', newModelValue);
};

// Apply selected personality template with all its properties
const applyPersonality = () => {
  if (!selectedPersonality.value) {
    return;
  }
  
  const personality = chatPersonalities.find(p => p.name === selectedPersonality.value);
  if (personality) {
    // Apply all personality properties
    systemMessage.value = personality.systemMessage;
    openAiDetails.value.temperature = personality.temperature;
    openAiDetails.value.max_tokens = personality.max_tokens;
    openAiDetails.value.top_p = personality.top_p;
    openAiDetails.value.frequency_penalty = personality.frequency_penalty;
    openAiDetails.value.presence_penalty = personality.presence_penalty;
    
    // Update the form
    updateSystemMessage();
    syncOpenAiDetailsToTargetDetails();
  }
};

// Initialize target details based on selected kind and operation
const initTargetDetails = () => {
  if (!selectedTargetSource.value || !props.modelValue.operation) return;
  
  const details = props.modelValue.details || {};
  
  if (selectedTargetSource.value.kind === 'http') {
    httpDetails.value = {
      method: details.method || 'GET',
      url: details.url || '',
      headers: details.headers || {},
      query: details.query || {},
      body: details.body || {}
    };
    httpBodyJson.value = JSON.stringify(httpDetails.value.body || {}, null, 2);
    
    // Initialize header keys
    httpHeaderKeys.value = {};
    Object.keys(httpDetails.value.headers || {}).forEach(key => {
      httpHeaderKeys.value[key] = key;
    });
    
    // Initialize query keys
    httpQueryKeys.value = {};
    Object.keys(httpDetails.value.query || {}).forEach(key => {
      httpQueryKeys.value[key] = key;
    });
  } else if (selectedTargetSource.value.kind === IntegrationSourceKind.OpenAI) {
    openAiDetails.value = {
      model: details.model || 'gpt-4o',
      temperature: details.temperature ?? 0.7,
      top_p: details.top_p ?? 1,
      frequency_penalty: details.frequency_penalty ?? 0,
      presence_penalty: details.presence_penalty ?? 0,
      max_tokens: details.max_tokens ?? 1000,
      stop: details.stop,
      response_format: details.response_format,
      pre_messages: []
    };
    if (details.pre_messages?.length) {
      openAiDetails.value.pre_messages = [...details.pre_messages];
      initializeSystemMessage();
    }
  } else if (selectedTargetSource.value.kind === IntegrationSourceKind.Qelos) {
    qelosDetails.value = {
      eventName: details.eventName || '',
      description: details.description || '',
      password: details.password || '',
      roles: details.roles || '',
      userId: details.userId || '',
      blueprint: details.blueprint || '',
    };
  }
};

// Handle source change
const handleSourceChange = () => {
  const newModelValue = { ...props.modelValue };
  newModelValue.operation = '';
  newModelValue.details = {};
  emit('update:modelValue', newModelValue);
};

// Watch for changes in target source or operation to initialize UI
watch([() => props.modelValue.source, () => props.modelValue.operation], () => {
  initTargetDetails();
});

// Watch for changes in target details
watch(() => props.modelValue.details, (newDetails) => {
  targetDetailsText.value = JSON.stringify(newDetails || {}, null, 2);
}, { deep: true });

// Initialize the UI when the component is mounted
onMounted(() => {
  initTargetDetails();
});
</script>

<template>
  <div class="target-container">
    <el-alert type="info" :closable="false" class="mb-3">
      {{ $t('Configure the target that will be triggered by this workflow.') }}
    </el-alert>
    
    <!-- Connection Selection -->
    <div class="section-container">
      <h4>{{ $t('Connection') }}</h4>
      <FormInput type="select" v-model="modelValue.source"
               label="Connection that will be triggered by this workflow"
               @change="handleSourceChange">
        <template #options>
          <el-option v-for="source in store.result"
                    :key="source._id"
                    :value="source._id"
                    :label="source.name" class="qelos-connection-option">
            <img v-if="kinds[source.kind].logo" class="qelos-connection-icon" :src="kinds[source.kind].logo"
                :alt="kinds[source.kind].name"/>
            <small v-else class="qelos-connection-text">{{ kinds[source.kind].name }}</small>
            <span>{{ source.name }}</span>
          </el-option>
        </template>
      </FormInput>
    </div>
    
    <!-- Operation Selection -->
    <div v-if="selectedTargetSource" class="section-container">
      <h4>{{ $t('Operation') }}</h4>
      <FormInput v-model="modelValue.operation"
               type="select"
               :options="targetOperations[selectedTargetSource?.kind]"
               option-value="name"
               option-label="label"
               label="Operation that will be triggered by this workflow"/>
    </div>
    
    <!-- Operation-specific configuration -->
    <div v-if="modelValue.operation && selectedTargetSource" class="section-container">
      <h4>{{ $t('Configuration') }}</h4>
      
      <!-- HTTP Target - Make Request -->
      <div v-if="selectedTargetSource.kind === IntegrationSourceKind.Http && modelValue.operation === HttpTargetOperation.makeRequest" class="http-target-config">
        <el-tabs>
          <el-tab-pane :label="$t('Request')">
            <el-form-item :label="$t('Method')">
              <el-select v-model="httpDetails.method" @change="syncHttpDetailsToTargetDetails">
                <el-option value="GET" label="GET" />
                <el-option value="POST" label="POST" />
                <el-option value="PUT" label="PUT" />
                <el-option value="DELETE" label="DELETE" />
                <el-option value="PATCH" label="PATCH" />
              </el-select>
            </el-form-item>
            
            <el-form-item :label="$t('URL Path')">
              <el-input v-model="httpDetails.url" placeholder="/api/endpoint" @input="syncHttpDetailsToTargetDetails" />
            </el-form-item>
          </el-tab-pane>
          
          <el-tab-pane :label="$t('Headers')">
            <div v-for="(value, key) in httpDetails.headers" :key="key" class="key-value-row">
              <el-input v-model="httpHeaderKeys[key]" placeholder="Header Name" @change="updateHttpHeader(key, $event)" />
              <el-input v-model="httpDetails.headers[key]" placeholder="Header Value" @input="syncHttpDetailsToTargetDetails" />
              <el-button type="danger" :icon="Delete" @click="removeHttpHeader(key)" circle />
            </div>
            <el-button type="primary" @click="addHttpHeader" :icon="Plus">{{ $t('Add Header') }}</el-button>
          </el-tab-pane>
          
          <el-tab-pane :label="$t('Query Parameters')">
            <div v-for="(value, key) in httpDetails.query" :key="key" class="key-value-row">
              <el-input v-model="httpQueryKeys[key]" placeholder="Parameter Name" @change="updateHttpQuery(key, $event)" />
              <el-input v-model="httpDetails.query[key]" placeholder="Parameter Value" @input="syncHttpDetailsToTargetDetails" />
              <el-button type="danger" :icon="Delete" @click="removeHttpQuery(key)" circle />
            </div>
            <el-button type="primary" @click="addHttpQuery" :icon="Plus">{{ $t('Add Parameter') }}</el-button>
          </el-tab-pane>
          
          <el-tab-pane :label="$t('Body')">
            <Monaco v-model="httpBodyJson" height="200px" language="json" @update:modelValue="syncHttpDetailsToTargetDetails" />
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <!-- OpenAI Target - Chat Completion - This section intentionally left empty as we're using the consolidated form below -->
      <div v-else-if="selectedTargetSource.kind === IntegrationSourceKind.OpenAI && modelValue.operation === OpenAITargetOperation.chatCompletion" class="openai-target-config">
        <!-- Empty - Using consolidated form below -->
      </div>
      
      <!-- Qelos Target Operations -->
      <div v-else-if="selectedTargetSource.kind === IntegrationSourceKind.Qelos" class="qelos-target-config">
        <!-- Webhook -->
        <div v-if="modelValue.operation === QelosTargetOperation.webhook" class="webhook-config">
          <el-form-item :label="$t('Event Name')">
            <el-input v-model="qelosDetails.eventName" placeholder="e.g., user.created" @input="syncQelosDetailsToTargetDetails" />
          </el-form-item>
          
          <el-form-item :label="$t('Description')">
            <el-input v-model="qelosDetails.description" placeholder="Event description" @input="syncQelosDetailsToTargetDetails" />
          </el-form-item>
        </div>
        
        <!-- Create User -->
        <div v-else-if="modelValue.operation === QelosTargetOperation.createUser" class="user-config">
          <p class="config-description">{{ $t('Map these fields from your data manipulation steps:') }}</p>
          
          <el-form-item :label="$t('Password')">
            <el-input v-model="qelosDetails.password" placeholder="e.g., .data.password" @input="syncQelosDetailsToTargetDetails" />
          </el-form-item>
          
          <el-form-item :label="$t('Roles')">
            <el-input v-model="qelosDetails.roles" placeholder="e.g., .data.roles or ['user']" @input="syncQelosDetailsToTargetDetails" />
          </el-form-item>
          
          <el-form-item :label="$t('User ID')">
            <el-input v-model="qelosDetails.userId" placeholder="e.g., .data.userId" @input="syncQelosDetailsToTargetDetails" />
          </el-form-item>
          
          <el-form-item :label="$t('Roles')">
            <el-tag
              :key="tag"
              v-for="tag in rolesArray"
              closable
              :disable-transitions="false"
              @close="handleRoleRemove(tag)"
              class="mr-1 mb-1"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="roleInputVisible"
              ref="roleInputRef"
              v-model="roleInputValue"
              class="ml-1 w-auto"
              size="small"
              @keyup.enter="handleRoleConfirm"
              @blur="handleRoleConfirm"
            />
            <el-button v-else class="button-new-tag ml-1" size="small" @click="showRoleInput">
              + {{ $t('Add role') }}
            </el-button>
          </el-form-item>
        </div>
        
        <!-- Update User -->
        <div v-else-if="modelValue.operation === QelosTargetOperation.updateUser" class="user-config">
          <p class="config-description">{{ $t('Map these fields from your data manipulation steps:') }}</p>
          
          <el-form-item :label="$t('User ID')">
            <el-input v-model="qelosDetails.userId" placeholder="e.g., .data.userId" @input="syncQelosDetailsToTargetDetails" />
          </el-form-item>
          
          <el-form-item :label="$t('Password (Optional)')">
            <el-input v-model="qelosDetails.password" placeholder="e.g., .data.password" @input="syncQelosDetailsToTargetDetails" />
          </el-form-item>
          
          <el-form-item :label="$t('Roles (Optional)')">
            <el-input v-model="qelosDetails.roles" placeholder="e.g., .data.roles or ['user']" @input="syncQelosDetailsToTargetDetails" />
          </el-form-item>
        </div>
        
        <!-- Set User Roles -->
        <div v-else-if="modelValue.operation === QelosTargetOperation.setUserRoles" class="user-config">
          <p class="config-description">{{ $t('Map these fields from your data manipulation steps:') }}</p>
          
          <el-form-item :label="$t('User ID')">
            <el-input v-model="qelosDetails.userId" placeholder="e.g., .data.userId" @input="syncQelosDetailsToTargetDetails" />
          </el-form-item>
          
          <el-form-item :label="$t('Roles')">
            <el-tag
              :key="tag"
              v-for="tag in rolesArray"
              closable
              :disable-transitions="false"
              @close="handleRoleRemove(tag)"
              class="mr-1 mb-1"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="roleInputVisible"
              ref="roleInputRef"
              v-model="roleInputValue"
              class="ml-1 w-auto"
              size="small"
              @keyup.enter="handleRoleConfirm"
              @blur="handleRoleConfirm"
            />
            <el-button v-else class="button-new-tag ml-1" size="small" @click="showRoleInput">
              + {{ $t('Add role') }}
            </el-button>
          </el-form-item>
        </div>
        
        <!-- Set Workspace Labels -->
        <div v-else-if="modelValue.operation === QelosTargetOperation.setWorkspaceLabels" class="workspace-config">
          <p class="config-description">{{ $t('This operation is not fully supported yet.') }}</p>
        </div>
        
        <!-- Create Blueprint Entity -->
        <div v-else-if="modelValue.operation === QelosTargetOperation.createBlueprintEntity" class="blueprint-config">
          <el-form-item :label="$t('Blueprint')">
            <BlueprintDropdown v-model="qelosDetails.blueprint" @change="syncQelosDetailsToTargetDetails" />
          </el-form-item>
        </div>
      </div>

      <!-- Update Blueprint Entity -->
      <div v-else-if="modelValue.operation === QelosTargetOperation.updateBlueprintEntity" class="blueprint-config">
        <el-form-item :label="$t('Blueprint')">
          <BlueprintDropdown v-model="qelosDetails.blueprint" @change="syncQelosDetailsToTargetDetails" />
        </el-form-item>
      </div>
      
      <!-- OpenAI Chat Completion Form (Consolidated) -->
      <div v-if="selectedTargetSource?.kind === IntegrationSourceKind.OpenAI && modelValue.operation === OpenAITargetOperation.chatCompletion" class="chat-completion-form">
        <!-- Personality Selection Cards -->
        <div class="personality-cards-section">
          <label>Choose a Personality Template</label>
          <p class="help-text">Select a pre-defined personality or customize your own</p>
          
          <div class="personality-cards">
            <div 
              v-for="personality in chatPersonalities" 
              :key="personality.name"
              class="personality-card" 
              :class="{ 'selected': selectedPersonality === personality.name }"
              @click="selectedPersonality = personality.name; applyPersonality()"
            >
              <el-icon class="personality-icon">
                <component :is="personality.icon" />
              </el-icon>
              <h4>{{ personality.name }}</h4>
              <p>{{ personality.description }}</p>
            </div>
          </div>
        </div>
        
        <!-- Model Selection -->
        <FormInput
          v-model="openAiDetails.model"
          type="select"
          :options="openAiModelOptions"
          label="Model"
          help-text="Select the OpenAI model to use for chat completion"
          @change="syncOpenAiDetailsToTargetDetails"
        />
        
        <!-- Temperature Slider -->
        <div class="slider-container">
          <label>Temperature: {{ openAiDetails.temperature }}</label>
          <el-slider
            v-model="openAiDetails.temperature"
            :min="0"
            :max="1"
            :step="0.1"
            show-stops
            @change="syncOpenAiDetailsToTargetDetails"
          />
          <div class="slider-description">
            <span>More precise</span>
            <span>More creative</span>
          </div>
        </div>
        
        <!-- Max Tokens -->
        <FormInput
          v-model="openAiDetails.max_tokens"
          type="number"
          label="Max Tokens"
          help-text="Maximum number of tokens to generate (1-4000)"
          :min="1"
          :max="4000"
          @change="syncOpenAiDetailsToTargetDetails"
        />
        
        <!-- System Message -->
        <div class="system-message-container">
          <label>System Message</label>
          <p class="help-text">Define the AI assistant's behavior and role</p>
          <el-input
            v-model="systemMessage"
            type="textarea"
            :rows="4"
            placeholder="You are a helpful assistant..."
            @input="updateSystemMessage"
          />
        </div>
        
        <!-- Advanced Options Toggle -->
        <div class="advanced-options">
          <el-divider content-position="center">
            <el-button type="text" @click="showAdvancedOptions = !showAdvancedOptions">
              {{ showAdvancedOptions ? 'Hide' : 'Show' }} Advanced Options
              <i :class="showAdvancedOptions ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
            </el-button>
          </el-divider>
          
          <!-- Advanced Options Content -->
          <div v-if="showAdvancedOptions" class="advanced-options-content">
            <!-- Top P Slider -->
            <div class="slider-container">
              <label>Top P: {{ openAiDetails.top_p }}</label>
              <el-slider
                v-model="openAiDetails.top_p"
                :min="0"
                :max="1"
                :step="0.1"
                show-stops
                @change="syncOpenAiDetailsToTargetDetails"
              />
            </div>
            
            <!-- Frequency Penalty Slider -->
            <div class="slider-container">
              <label>Frequency Penalty: {{ openAiDetails.frequency_penalty }}</label>
              <el-slider
                v-model="openAiDetails.frequency_penalty"
                :min="0"
                :max="2"
                :step="0.1"
                show-stops
                @change="syncOpenAiDetailsToTargetDetails"
              />
            </div>
            
            <!-- Presence Penalty Slider -->
            <div class="slider-container">
              <label>Presence Penalty: {{ openAiDetails.presence_penalty }}</label>
              <el-slider
                v-model="openAiDetails.presence_penalty"
                :min="0"
                :max="2"
                :step="0.1"
                show-stops
                @change="syncOpenAiDetailsToTargetDetails"
              />
            </div>
            
            <!-- Stop Sequences -->
            <div class="form-group">
              <label>Stop Sequences</label>
              <p class="help-text">Optional sequences where the API will stop generating further tokens</p>
              <el-input
                v-model="openAiDetails.stop"
                placeholder="Enter stop sequences"
                @change="syncOpenAiDetailsToTargetDetails"
              />
            </div>
            
            <!-- Response Format -->
            <div class="form-group">
              <label>Response Format</label>
              <p class="help-text">Optional format for the API response</p>
              <el-select
                v-model="openAiDetails.response_format"
                placeholder="Select response format"
                clearable
                @change="syncOpenAiDetailsToTargetDetails"
                style="width: 100%"
              >
                <el-option
                  label="Default (no format constraint)"
                  :value="undefined"
                />
                <el-option
                  label="JSON Object"
                  :value="{ type: 'json_object' }"
                />
              </el-select>
              <p class="help-text mt-2" v-if="openAiDetails.response_format?.type === 'json_object'">
                <i class="el-icon-warning" style="color: #e6a23c;"></i>
                When using JSON mode, you must instruct the model to produce JSON in your system message or user prompt.
              </p>
            </div>
            
            <!-- Raw JSON Editor Toggle -->
            <el-button type="primary" plain @click="showRawJson = !showRawJson" class="mt-3">
              {{ showRawJson ? 'Hide' : 'Show' }} Raw JSON
            </el-button>
            
            <!-- Raw JSON Editor -->
            <div v-if="showRawJson" class="mt-3">
              <Monaco :modelValue="targetDetailsText" @update:modelValue="updateTargetDetails" height="300px" language="json" />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Generic JSON Editor for other kinds or when no specific UI is available -->
      <div v-else class="generic-config">
        <Monaco v-model="targetDetailsText" height="300px" language="json" @input="updateTargetDetails" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.target-container {
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

.key-value-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.config-description {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
  margin-bottom: 15px;
}

.mb-3 {
  margin-bottom: 15px;
}

.personality-cards-section {
  margin-bottom: 20px;
}

.personality-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.personality-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.personality-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.personality-card.selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.personality-icon {
  font-size: 28px;
  margin-bottom: 10px;
  color: var(--el-color-primary);
}

.personality-card h4 {
  margin: 5px 0;
  font-size: 16px;
}

.personality-card p {
  margin: 5px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

/* Local styles only */
.mr-1 {
  margin-right: 0.25rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.ml-1 {
  margin-left: 0.25rem;
}

.w-auto {
  width: auto;
}

.button-new-tag {
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
