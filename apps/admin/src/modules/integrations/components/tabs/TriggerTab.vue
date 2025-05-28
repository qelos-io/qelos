<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { TriggerOperation, useIntegrationKindsTriggerOperations } from '@/modules/integrations/compositions/integration-kinds-operations';
import { OpenAITargetOperation, IntegrationSourceKind } from '@qelos/global-types';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits(['update:modelValue']);

const store = useIntegrationSourcesStore();
const kinds = useIntegrationKinds();
const triggerOperations = useIntegrationKindsTriggerOperations();

const selectedTriggerOperation = ref<TriggerOperation>();

// Computed property for the selected source
const selectedTriggerSource = computed(() => store.result?.find(s => s._id === props.modelValue.source));

// Use a ref for the trigger details JSON instead of a computed property
const triggerDetailsText = ref(JSON.stringify(props.modelValue.details || {}, null, 2));

// UI state variables for OpenAI chat completion form
const showAdvancedOptions = ref(false);
const showRawJson = ref(false);
const systemMessage = ref('');

// OpenAI model options
const openAiModelOptions = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'GPT-3.5 Turbo 16k', value: 'gpt-3.5-turbo-16k' },
  { label: 'GPT-4 Vision', value: 'gpt-4-vision-preview' },
  { label: 'GPT-4 32k', value: 'gpt-4-32k' }
];

// Initialize system message from pre_messages when component mounts or details change
const initializeSystemMessage = () => {
  if (selectedTriggerSource.value?.kind === IntegrationSourceKind.OpenAI && 
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

// Watch for changes in the model details
watch(() => props.modelValue.details, (newDetails) => {
  if (newDetails) {
    triggerDetailsText.value = JSON.stringify(newDetails, null, 2);
  }
}, { deep: true });

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
  newModelValue.details = JSON.parse(JSON.stringify(operation?.details || {}));
  emit('update:modelValue', newModelValue);
};

// Set trigger details from option
const setTriggerDetails = (optionValue: any) => {
  const newModelValue = { ...props.modelValue };
  newModelValue.details = optionValue;
  emit('update:modelValue', newModelValue);
};

// Watch for changes in trigger source or operation
watch([() => props.modelValue.operation, () => props.modelValue.source], () => {
  if (!selectedTriggerSource.value) return;
  
  const operation = triggerOperations[selectedTriggerSource.value?.kind]?.find(o => o.name === props.modelValue.operation);
  selectedTriggerOperation.value = operation;
  initializeSystemMessage();
});

// Watch for changes in trigger details
watch(() => props.modelValue.details, (newDetails) => {
  triggerDetailsText.value = JSON.stringify(newDetails || {}, null, 2);
  initializeSystemMessage();
}, { deep: true });

// Initialize the UI when the component is mounted
onMounted(() => {
  if (selectedTriggerSource.value && props.modelValue.operation) {
    const operation = triggerOperations[selectedTriggerSource.value?.kind]?.find(o => o.name === props.modelValue.operation);
    selectedTriggerOperation.value = operation;
    initializeSystemMessage();
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
      
      <!-- OpenAI Chat Completion Form -->
      <div v-if="selectedTriggerSource?.kind === 'openai' && modelValue.operation === 'chatCompletion'" class="chat-completion-form">
        <!-- Model Selection -->
        <FormInput
          v-model="modelValue.details.model"
          type="select"
          :options="openAiModelOptions"
          label="Model"
          help-text="Select the OpenAI model to use for chat completion"
        />
        
        <!-- Max Tokens -->
        <FormInput
          v-model="modelValue.details.max_tokens"
          type="number"
          label="Max Tokens"
          help-text="Maximum number of tokens to generate (1-4000)"
          :min="1"
          :max="4000"
        />
        
        <!-- Temperature Slider -->
        <div class="slider-container">
          <label>Temperature: {{ modelValue.details.temperature }}</label>
          <el-slider
            v-model="modelValue.details.temperature"
            :min="0"
            :max="1"
            :step="0.1"
            show-stops
          />
          <div class="slider-description">
            <span>More precise</span>
            <span>More creative</span>
          </div>
        </div>
        
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
              <label>Top P: {{ modelValue.details.top_p }}</label>
              <el-slider
                v-model="modelValue.details.top_p"
                :min="0"
                :max="1"
                :step="0.1"
                show-stops
              />
            </div>
            
            <!-- Frequency Penalty Slider -->
            <div class="slider-container">
              <label>Frequency Penalty: {{ modelValue.details.frequency_penalty }}</label>
              <el-slider
                v-model="modelValue.details.frequency_penalty"
                :min="0"
                :max="2"
                :step="0.1"
                show-stops
              />
            </div>
            
            <!-- Presence Penalty Slider -->
            <div class="slider-container">
              <label>Presence Penalty: {{ modelValue.details.presence_penalty }}</label>
              <el-slider
                v-model="modelValue.details.presence_penalty"
                :min="0"
                :max="2"
                :step="0.1"
                show-stops
              />
            </div>
            
            <!-- Raw JSON Editor Toggle -->
            <el-button type="primary" plain @click="showRawJson = !showRawJson" class="mt-3">
              {{ showRawJson ? 'Hide' : 'Show' }} Raw JSON
            </el-button>
            
            <!-- Raw JSON Editor -->
            <div v-if="showRawJson" class="mt-3">
              <Monaco :modelValue="triggerDetailsText" @update:modelValue="updateTriggerDetails" height="300px" language="json" />
            </div>
          </div>
        </div>
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
</style>
