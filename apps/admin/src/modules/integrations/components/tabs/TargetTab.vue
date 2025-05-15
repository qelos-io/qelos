<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { Delete, Plus } from '@element-plus/icons-vue';
import BlueprintDropdown from '@/modules/integrations/components/BlueprintDropdown.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useIntegrationKindsTargetOperations } from '@/modules/integrations/compositions/integration-kinds-operations';
import { IntegrationSourceKind, OpenAITargetOperation, QelosTargetOperation } from '@qelos/global-types';

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
  system: '',
  temperature: 0.7,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  max_tokens: 1000,
  response_format: { type: 'text' }
});

const qelosDetails = ref({
  eventName: '',
  description: '',
  password: '',
  roles: '',
  userId: '',
  blueprint: '',
  entityData: ''
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
};

// Handle confirming a new role tag
const handleRoleConfirm = () => {
  if (roleInputValue.value) {
    const roles = [...rolesArray.value, roleInputValue.value];
    qelosDetails.value.roles = JSON.stringify(roles);
  }
  roleInputVisible.value = false;
  roleInputValue.value = '';
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
  emit('update:modelValue', newModelValue);
};

const syncQelosDetailsToTargetDetails = () => {
  const newModelValue = { ...props.modelValue };
  newModelValue.details = { ...qelosDetails.value };
  emit('update:modelValue', newModelValue);
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
      system: details.system || '',
      temperature: details.temperature ?? 0.7,
      top_p: details.top_p ?? 1,
      frequency_penalty: details.frequency_penalty ?? 0,
      presence_penalty: details.presence_penalty ?? 0,
      max_tokens: details.max_tokens ?? 1000,
      response_format: details.response_format || { type: 'text' }
    };
  } else if (selectedTargetSource.value.kind === IntegrationSourceKind.Qelos) {
    qelosDetails.value = {
      eventName: details.eventName || '',
      description: details.description || '',
      password: details.password || '',
      roles: details.roles || '',
      userId: details.userId || '',
      blueprint: details.blueprint || '',
      entityData: details.entityData || ''
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

// Watch for changes in the UI components and sync to form.target.details
watch(httpBodyJson, () => {
  syncHttpDetailsToTargetDetails();
});

watch(httpDetails, () => {
  syncHttpDetailsToTargetDetails();
}, { deep: true });

watch(openAiDetails, () => {
  syncOpenAiDetailsToTargetDetails();
}, { deep: true });

watch(qelosDetails, () => {
  syncQelosDetailsToTargetDetails();
}, { deep: true });

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
      <div v-if="selectedTargetSource.kind === IntegrationSourceKind.Http" class="http-target-config">
        <el-tabs>
          <el-tab-pane :label="$t('Request')">
            <el-form-item :label="$t('Method')">
              <el-select v-model="httpDetails.method">
                <el-option value="GET" label="GET" />
                <el-option value="POST" label="POST" />
                <el-option value="PUT" label="PUT" />
                <el-option value="DELETE" label="DELETE" />
                <el-option value="PATCH" label="PATCH" />
              </el-select>
            </el-form-item>
            
            <el-form-item :label="$t('URL Path')">
              <el-input v-model="httpDetails.url" placeholder="/api/endpoint" />
            </el-form-item>
          </el-tab-pane>
          
          <el-tab-pane :label="$t('Headers')">
            <div v-for="(value, key) in httpDetails.headers" :key="key" class="key-value-row">
              <el-input v-model="httpHeaderKeys[key]" placeholder="Header Name" @change="updateHttpHeader(key, $event)" />
              <el-input v-model="httpDetails.headers[key]" placeholder="Header Value" />
              <el-button type="danger" :icon="Delete" @click="removeHttpHeader(key)" circle />
            </div>
            <el-button type="primary" @click="addHttpHeader" :icon="Plus">{{ $t('Add Header') }}</el-button>
          </el-tab-pane>
          
          <el-tab-pane :label="$t('Query Parameters')">
            <div v-for="(value, key) in httpDetails.query" :key="key" class="key-value-row">
              <el-input v-model="httpQueryKeys[key]" placeholder="Parameter Name" @change="updateHttpQuery(key, $event)" />
              <el-input v-model="httpDetails.query[key]" placeholder="Parameter Value" />
              <el-button type="danger" :icon="Delete" @click="removeHttpQuery(key)" circle />
            </div>
            <el-button type="primary" @click="addHttpQuery" :icon="Plus">{{ $t('Add Parameter') }}</el-button>
          </el-tab-pane>
          
          <el-tab-pane :label="$t('Body')">
            <Monaco v-model="httpBodyJson" height="200px" language="json" />
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <!-- OpenAI Target - Chat Completion -->
      <div v-else-if="selectedTargetSource.kind === IntegrationSourceKind.OpenAI && modelValue.operation === OpenAITargetOperation.chatCompletion" class="openai-target-config">
        <el-form-item :label="$t('Model')">
          <el-select v-model="openAiDetails.model">
            <el-option value="gpt-4o" label="GPT-4o" />
            <el-option value="gpt-4-turbo" label="GPT-4 Turbo" />
            <el-option value="gpt-3.5-turbo" label="GPT-3.5 Turbo" />
          </el-select>
        </el-form-item>
        
        <el-form-item :label="$t('System Message')">
          <el-input v-model="openAiDetails.system" type="textarea" :rows="3" placeholder="System instructions for the AI" />
        </el-form-item>
        
        <el-form-item :label="$t('Temperature')">
          <el-slider v-model="openAiDetails.temperature" :min="0" :max="2" :step="0.1" />
        </el-form-item>
        
        <el-collapse>
          <el-collapse-item :title="$t('Advanced Settings')" name="1">
            <el-form-item :label="$t('Max Tokens')">
              <el-input-number v-model="openAiDetails.max_tokens" :min="1" :max="4000" />
            </el-form-item>
            
            <el-form-item :label="$t('Top P')">
              <el-slider v-model="openAiDetails.top_p" :min="0" :max="1" :step="0.05" />
            </el-form-item>
            
            <el-form-item :label="$t('Frequency Penalty')">
              <el-slider v-model="openAiDetails.frequency_penalty" :min="0" :max="2" :step="0.1" />
            </el-form-item>
            
            <el-form-item :label="$t('Presence Penalty')">
              <el-slider v-model="openAiDetails.presence_penalty" :min="0" :max="2" :step="0.1" />
            </el-form-item>
            
            <el-form-item :label="$t('Response Format')">
              <el-select v-model="openAiDetails.response_format.type">
                <el-option value="text" label="Text" />
                <el-option value="json_object" label="JSON Object" />
              </el-select>
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </div>
      
      <!-- Qelos Target Operations -->
      <div v-else-if="selectedTargetSource.kind === IntegrationSourceKind.Qelos" class="qelos-target-config">
        <!-- Webhook -->
        <div v-if="modelValue.operation === QelosTargetOperation.webhook" class="webhook-config">
          <el-form-item :label="$t('Event Name')">
            <el-input v-model="qelosDetails.eventName" placeholder="e.g., user.created" />
          </el-form-item>
          
          <el-form-item :label="$t('Description')">
            <el-input v-model="qelosDetails.description" placeholder="Event description" />
          </el-form-item>
        </div>
        
        <!-- Create User -->
        <div v-else-if="modelValue.operation === QelosTargetOperation.createUser" class="user-config">
          <p class="config-description">{{ $t('Map these fields from your data manipulation steps:') }}</p>
          
          <el-form-item :label="$t('Password')">
            <el-input v-model="qelosDetails.password" placeholder="e.g., .data.password" />
          </el-form-item>
          
          <el-form-item :label="$t('Roles')">
            <el-input v-model="qelosDetails.roles" placeholder="e.g., .data.roles or ['user']" />
          </el-form-item>
          
          <el-form-item :label="$t('User ID')">
            <el-input v-model="qelosDetails.userId" placeholder="e.g., .data.userId" />
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
            <el-input v-model="qelosDetails.userId" placeholder="e.g., .data.userId" />
          </el-form-item>
          
          <el-form-item :label="$t('Password (Optional)')">
            <el-input v-model="qelosDetails.password" placeholder="e.g., .data.password" />
          </el-form-item>
          
          <el-form-item :label="$t('Roles (Optional)')">
            <el-input v-model="qelosDetails.roles" placeholder="e.g., .data.roles or ['user']" />
          </el-form-item>
        </div>
        
        <!-- Set User Roles -->
        <div v-else-if="modelValue.operation === QelosTargetOperation.setUserRoles" class="user-config">
          <p class="config-description">{{ $t('Map these fields from your data manipulation steps:') }}</p>
          
          <el-form-item :label="$t('User ID')">
            <el-input v-model="qelosDetails.userId" placeholder="e.g., .data.userId" />
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
            <BlueprintDropdown v-model="qelosDetails.blueprint" />
          </el-form-item>
          
          <el-form-item :label="$t('Entity Data')">
            <el-input v-model="qelosDetails.entityData" placeholder="e.g., .data" />
          </el-form-item>
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
