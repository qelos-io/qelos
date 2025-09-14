<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { TriggerOperation, useIntegrationKindsTriggerOperations } from '@/modules/integrations/compositions/integration-kinds-operations';
import { OpenAITargetOperation, IntegrationSourceKind, QelosTriggerOperation } from '@qelos/global-types';
import { ElMessage } from 'element-plus';

const props = defineProps<{
  modelValue: any;
  integrationId?: string
}>();

const emit = defineEmits(['update:modelValue']);

const store = useIntegrationSourcesStore();
const kinds = useIntegrationKinds();
const triggerOperations = useIntegrationKindsTriggerOperations();

const selectedTriggerOperation = ref<TriggerOperation>();
const recordThread = ref(false);

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

// Use a ref for the trigger details JSON instead of a computed property
const triggerDetailsText = ref(JSON.stringify(props.modelValue.details || {}, null, 2));

// Reactive refs for function calling form
const functionName = ref('');
const functionDescription = ref('');
const functionParameters = ref(JSON.stringify({
  "type": "object",
  "properties": {},
  "required": []
}, null, 2));

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

// Update function calling details
const updateFunctionCallingDetails = () => {
  try {
    const parameters = JSON.parse(functionParameters.value);
    const newModelValue = { ...props.modelValue };
    newModelValue.details = {
      ...newModelValue.details,
      name: functionName.value,
      description: functionDescription.value,
      parameters: parameters
    };
    emit('update:modelValue', newModelValue);
  } catch (e) {
    // Still update name and description even if parameters are invalid
    const newModelValue = { ...props.modelValue };
    newModelValue.details = {
      ...newModelValue.details,
      name: functionName.value,
      description: functionDescription.value,
      parameters: {} // Default to empty object if JSON is invalid
    };
    emit('update:modelValue', newModelValue);
  }
};

// Handle source change
const handleSourceChange = () => {
  const newModelValue = { ...props.modelValue };
  newModelValue.operation = '';
  newModelValue.details = {};
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
      props.modelValue.operation === OpenAITargetOperation.functionCalling) {
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
  
  emit('update:modelValue', newModelValue);
};

// Set trigger details from option
const setTriggerDetails = (optionValue: any) => {
  const newModelValue = { ...props.modelValue };
  newModelValue.details = optionValue;
  triggerDetailsText.value = JSON.stringify(optionValue, null, 2);
  emit('update:modelValue', newModelValue);
};

// Update recordThread setting in the model details
const updateRecordThreadSetting = () => {
  const newModelValue = { ...props.modelValue };
  if (!newModelValue.details) {
    newModelValue.details = {};
  }
  
  // Set recordThread in the details
  newModelValue.details.recordThread = recordThread.value;
  
  emit('update:modelValue', newModelValue);
};

// Initialize the UI when the component is mounted
onMounted(() => {
  if (selectedTriggerSource.value && props.modelValue.operation) {
    const operation = triggerOperations[selectedTriggerSource.value?.kind]?.find(o => o.name === props.modelValue.operation);
    selectedTriggerOperation.value = operation;
    
    // Initialize function calling form fields if we're in functionCalling mode
    if (selectedTriggerSource.value?.kind === IntegrationSourceKind.OpenAI && 
        props.modelValue.operation === OpenAITargetOperation.functionCalling) {
      const details = props.modelValue.details || {};
      functionName.value = details.name || '';
      functionDescription.value = details.description || '';
      functionParameters.value = JSON.stringify(details.parameters || {
        "type": "object",
        "properties": {},
        "required": []
      }, null, 2);
    }
    
    // Initialize recordThread value from model details if available
    if (selectedTriggerSource.value?.kind === IntegrationSourceKind.Qelos && 
        props.modelValue.operation === QelosTriggerOperation.chatCompletion) {
      const details = props.modelValue.details || {};
      recordThread.value = !!details.recordThread;
    }
  }
});
</script>

<style>
/* Global styles for connection selectors */
.qelos-connection-option {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
}

.qelos-connection-icon {
  width: 14px !important;
  height: 14px !important;
  margin-right: 8px !important;
  margin-bottom: 0;
  object-fit: contain !important;
  flex-shrink: 0 !important;
}

.qelos-connection-text {
  font-size: 0.7em !important;
  color: var(--el-text-color-secondary) !important;
  margin-right: 8px !important;
}
</style>

<template>
  <div class="trigger-container">
    <el-alert type="info" :closable="false" class="mb-3">
      {{ $t('Configure the trigger that will start this workflow.') }}
    </el-alert>
    
    <!-- Connection Selection -->
    <div class="section-container">
      <h4>{{ $t('Connection') }}</h4>
      <FormInput type="select" v-model="modelValue.source"
               @change="handleSourceChange"
               label="Connection that will trigger this workflow">
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
      
      <!-- OpenAI Function Calling Form -->
      <div v-else-if="selectedTriggerSource?.kind === IntegrationSourceKind.OpenAI && modelValue.operation === OpenAITargetOperation.functionCalling" class="function-calling-form">
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
          <el-form-item label="Parameters Schema" required>
            <small class="help-text">JSON schema defining the function parameters. Example: {"type": "object", "properties": {"location": {"type": "string"}}, "required": ["location"]}</small>
            <Monaco 
              v-model="functionParameters"
              @update:modelValue="updateFunctionCallingDetails"
              height="250px" 
              language="json" 
            />
          </el-form-item>
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
</style>
