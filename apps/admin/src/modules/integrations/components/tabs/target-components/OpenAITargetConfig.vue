<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { OpenAITargetOperation } from '@qelos/global-types';
import {
  Service as CustomerSupportIcon,
  Document as DocumentIcon,
  Cpu as SaasIcon,
  DataAnalysis as DataAnalystIcon,
  Operation as ConsultantIcon,
  ChatDotRound as DefaultChatIcon
} from '@element-plus/icons-vue';

const props = defineProps<{
  modelValue: any;
  operation: string;
}>();

const emit = defineEmits(['update:modelValue']);

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
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1
  },
  {
    name: 'Data Analyst',
    icon: DataAnalystIcon,
    description: 'Analytical approach with data-driven insights and visualizations',
    systemMessage: 'You are a data analyst. Your goal is to help users understand and interpret data. Provide analytical insights, suggest appropriate visualizations, and explain statistical concepts in an accessible way. Focus on accuracy and objectivity in your analysis.',
    temperature: 0.2,
    max_tokens: 1500,
    top_p: 0.8,
    frequency_penalty: 0,
    presence_penalty: 0
  },
  {
    name: 'Business Consultant',
    icon: ConsultantIcon,
    description: 'Strategic business advice with practical implementation steps',
    systemMessage: 'You are a business consultant. Your goal is to provide strategic advice to help users solve business problems and identify opportunities for growth. Offer practical, actionable recommendations based on business best practices and case studies. Consider factors such as market trends, competitive landscape, and resource constraints in your advice.',
    temperature: 0.5,
    max_tokens: 1200,
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1
  }
];

// OpenAI target UI state
const openAiDetails = ref({
  model: 'gpt-4o',
  temperature: 0.7,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  max_tokens: 1000,
  stop: undefined,
  response_format: undefined,
  pre_messages: [],
  embeddingType: 'local',
  maxTools: 15,
});

const systemMessage = ref('');
const selectedPersonality = ref('');
const showAdvancedOptions = ref(false);
const showRawJson = ref(false);

// Use a ref for the target details JSON instead of a computed property
const targetDetailsText = computed(() => {
  return JSON.stringify(props.modelValue.details || {}, null, 2);
});

// Initialize component with existing data if available
const initOpenAiDetails = () => {
  if (props.modelValue?.details) {
    openAiDetails.value = {
      model: props.modelValue.details.model || 'gpt-4o',
      temperature: props.modelValue.details.temperature ?? 0.7,
      top_p: props.modelValue.details.top_p ?? 1,
      frequency_penalty: props.modelValue.details.frequency_penalty ?? 0,
      presence_penalty: props.modelValue.details.presence_penalty ?? 0,
      max_tokens: props.modelValue.details.max_tokens ?? 1000,
      stop: props.modelValue.details.stop,
      response_format: props.modelValue.details.response_format,
      pre_messages: props.modelValue.details.pre_messages || [],
      embeddingType: props.modelValue.details.embeddingType || 'local',
      maxTools: props.modelValue.details.maxTools ?? 15,
    };
    initializeSystemMessage();
  }
};

// Initialize system message from pre_messages when component mounts or details change
const initializeSystemMessage = () => {
  const systemMsg = openAiDetails.value.pre_messages?.find(msg => msg.role === 'system');
  systemMessage.value = systemMsg?.content || '';
};

// Update system message in pre_messages array
const updateSystemMessage = () => {
  if (!openAiDetails.value.pre_messages) {
    openAiDetails.value.pre_messages = [];
  }
  
  const systemMsgIndex = openAiDetails.value.pre_messages.findIndex(msg => msg.role === 'system');
  
  if (systemMessage.value) {
    if (systemMsgIndex >= 0) {
      openAiDetails.value.pre_messages[systemMsgIndex].content = systemMessage.value;
    } else {
      openAiDetails.value.pre_messages.push({
        role: 'system',
        content: systemMessage.value
      });
    }
  } else if (systemMsgIndex >= 0) {
    openAiDetails.value.pre_messages.splice(systemMsgIndex, 1);
  }
  
  syncOpenAiDetailsToTargetDetails();
};

// Apply selected personality template with all its properties
const applyPersonality = () => {
  const personality = chatPersonalities.find(p => p.name === selectedPersonality.value);
  
  if (personality) {
    openAiDetails.value.temperature = personality.temperature;
    openAiDetails.value.max_tokens = personality.max_tokens;
    openAiDetails.value.top_p = personality.top_p;
    openAiDetails.value.frequency_penalty = personality.frequency_penalty;
    openAiDetails.value.presence_penalty = personality.presence_penalty;
    
    systemMessage.value = personality.systemMessage;
    updateSystemMessage();
  }
};

// Update target details from JSON text
const updateTargetDetails = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    const newModelValue = { ...props.modelValue };
    newModelValue.details = parsed;
    emit('update:modelValue', newModelValue);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
  }
};

// Sync UI state to form.target.details
const syncOpenAiDetailsToTargetDetails = () => {
  const newModelValue = { ...props.modelValue };
  newModelValue.details = { ...openAiDetails.value };
  if (!newModelValue.details.pre_messages) {
    newModelValue.details.pre_messages = [];
  }
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

// Initialize on mount and when modelValue changes
watch(() => props.modelValue, initOpenAiDetails, { immediate: true });
</script>

<template>
  <div v-if="operation === OpenAITargetOperation.chatCompletion" class="chat-completion-form">
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
        <!-- Advanced Options Intro -->
        <div class="advanced-options-intro">
          <i class="el-icon-setting" style="font-size: 20px; margin-right: 8px;"></i>
          <div>
            <h4>Advanced Model Settings</h4>
            <p>Fine-tune your AI model's behavior with these advanced parameters</p>
          </div>
        </div>

        <!-- Organized into cards for better visual grouping -->
        <div class="advanced-options-grid">
          <!-- Generation Controls Card -->
          <div class="advanced-options-card">
            <h5>
              <i class="el-icon-magic-stick"></i>
              Generation Controls
            </h5>
            
            <!-- Top P Slider with tooltip -->
            <div class="slider-container">
              <div class="slider-header">
                <label>Top P: <span class="value-badge">{{ openAiDetails.top_p }}</span></label>
                <el-tooltip content="Controls diversity by limiting tokens to the top P% of probability mass. Lower values = more focused, higher values = more diverse." placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </div>
              <el-slider
                v-model="openAiDetails.top_p"
                :min="0"
                :max="1"
                :step="0.1"
                show-stops
                @change="syncOpenAiDetailsToTargetDetails"
              />
              <div class="slider-description">
                <span>Focused</span>
                <span>Diverse</span>
              </div>
            </div>
            
            <!-- Frequency Penalty Slider with tooltip -->
            <div class="slider-container">
              <div class="slider-header">
                <label>Frequency Penalty: <span class="value-badge">{{ openAiDetails.frequency_penalty }}</span></label>
                <el-tooltip content="Reduces repetition by penalizing tokens that have already appeared in the text. Higher values produce less repetitive text." placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </div>
              <el-slider
                v-model="openAiDetails.frequency_penalty"
                :min="0"
                :max="2"
                :step="0.1"
                show-stops
                @change="syncOpenAiDetailsToTargetDetails"
              />
              <div class="slider-description">
                <span>Allow repetition</span>
                <span>Avoid repetition</span>
              </div>
            </div>
            
            <!-- Presence Penalty Slider with tooltip -->
            <div class="slider-container">
              <div class="slider-header">
                <label>Presence Penalty: <span class="value-badge">{{ openAiDetails.presence_penalty }}</span></label>
                <el-tooltip content="Encourages the model to talk about new topics by penalizing tokens that have appeared at all. Higher values encourage more topic diversity." placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </div>
              <el-slider
                v-model="openAiDetails.presence_penalty"
                :min="0"
                :max="2"
                :step="0.1"
                show-stops
                @change="syncOpenAiDetailsToTargetDetails"
              />
              <div class="slider-description">
                <span>Stay on topic</span>
                <span>Explore new topics</span>
              </div>
            </div>
          </div>
          
          <!-- Output Controls Card -->
          <div class="advanced-options-card">
            <h5>
              <i class="el-icon-document"></i>
              Output Controls
            </h5>
            
            <!-- Stop Sequences with better help -->
            <div class="form-group">
              <div class="form-header">
                <label>Stop Sequences</label>
                <el-tooltip content="The model will stop generating text when it encounters any of these sequences. Separate multiple sequences with commas." placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </div>
              <el-input
                v-model="openAiDetails.stop"
                placeholder="E.g., ###, END, STOP"
                @change="syncOpenAiDetailsToTargetDetails"
              />
              <p class="help-text">Optional sequences where the API will stop generating further tokens</p>
            </div>
            
            <!-- Response Format with better description -->
            <div class="form-group">
              <div class="form-header">
                <label>Response Format</label>
                <el-tooltip content="Constrains the model output to a specific format. JSON mode ensures valid JSON output." placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </div>
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
              <div class="info-box" v-if="openAiDetails.response_format?.type === 'json_object'">
                <i class="el-icon-warning"></i>
                <span>When using JSON mode, you must instruct the model to produce JSON in your system message or user prompt.</span>
              </div>
            </div>
          </div>
          
          <!-- Tool Controls Card -->
          <div class="advanced-options-card">
            <h5>
              <i class="el-icon-connection"></i>
              Tool Controls
            </h5>
            
            <!-- Embedding Type with better UI -->
            <div class="form-group">
              <div class="form-header">
                <label>Embedding Type</label>
                <el-tooltip content="The embedding system used to filter function calls and tools. Local uses in-memory embeddings, OpenAI uses their embedding API." placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </div>
              <el-select
                v-model="openAiDetails.embeddingType"
                placeholder="Select embedding type"
                clearable
                @change="syncOpenAiDetailsToTargetDetails"
                style="width: 100%"
              >
                <el-option label="Local" value="local">
                  <div class="option-with-description">
                    <span>Local</span>
                    <small>Faster, uses in-memory embeddings</small>
                  </div>
                </el-option>
                <el-option label="OpenAI" value="openai">
                  <div class="option-with-description">
                    <span>OpenAI</span>
                    <small>More accurate, uses OpenAI's embedding API</small>
                  </div>
                </el-option>
              </el-select>
              <p class="help-text">Determines how function calls and tools are filtered</p>
            </div>

            <!-- Max Tools with better visualization -->
            <div class="form-group">
              <div class="form-header">
                <label>Max Tools: <span class="value-badge">{{ openAiDetails.maxTools }}</span></label>
                <el-tooltip content="Maximum number of tools to include in the API request. Higher values allow more tools but may slow down the request." placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </div>
              <el-slider
                v-model="openAiDetails.maxTools"
                :min="0"
                :max="50"
                :step="1"
                show-stops
                @change="syncOpenAiDetailsToTargetDetails"
              >
                <template #button>
                  <div class="custom-slider-button">{{ openAiDetails.maxTools }}</div>
                </template>
              </el-slider>
              <div class="slider-description">
                <span>Fewer tools</span>
                <span>More tools</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Raw JSON Editor Section -->
        <div class="raw-json-section">
          <el-divider>
            <el-tooltip content="Edit the raw JSON configuration directly. For advanced users." placement="top">
              <span>Advanced JSON Configuration</span>
            </el-tooltip>
          </el-divider>
          
          <el-button 
            type="primary" 
            plain 
            @click="showRawJson = !showRawJson" 
            class="json-toggle-button"
          >
            <i :class="showRawJson ? 'el-icon-view' : 'el-icon-edit'"></i>
            {{ showRawJson ? 'Hide Raw JSON' : 'Edit Raw JSON' }}
          </el-button>
          
          <div v-if="showRawJson" class="json-editor-container">
            <p class="json-editor-help">Edit the raw configuration JSON directly. Changes will be applied immediately.</p>
            <Monaco :modelValue="targetDetailsText" @update:modelValue="updateTargetDetails" height="300px" language="json" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-completion-form {
  width: 100%;
}

.personality-cards-section {
  margin-bottom: 20px;
}

.personality-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 10px;
}

.personality-card {
  flex: 1;
  min-width: 200px;
  max-width: 250px;
  padding: 15px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--el-bg-color);
}

.personality-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--el-color-primary-light-5);
}

.personality-card.selected {
  border: 2px solid var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.personality-icon {
  font-size: 24px;
  color: var(--el-color-primary);
  margin-bottom: 10px;
}

.personality-card h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.personality-card p {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.slider-container {
  margin-bottom: 20px;
}

.slider-description {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 5px;
}

.system-message-container {
  margin-bottom: 20px;
}

.help-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 0;
  margin-bottom: 8px;
}

.advanced-options-content {
  margin-top: 20px;
}

.advanced-options-intro {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.advanced-options-intro h4 {
  margin: 0 0 5px 0;
}

.advanced-options-intro p {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.advanced-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.advanced-options-card {
  padding: 15px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color);
}

.advanced-options-card h5 {
  display: flex;
  align-items: center;
  margin-top: 0;
  margin-bottom: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.advanced-options-card h5 i {
  margin-right: 8px;
  color: var(--el-color-primary);
}

.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.slider-header i {
  color: var(--el-text-color-secondary);
  cursor: help;
}

.value-badge {
  display: inline-block;
  background-color: var(--el-color-primary-light-8);
  color: var(--el-color-primary-dark-2);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  margin-left: 5px;
}

.form-group {
  margin-bottom: 20px;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.info-box {
  display: flex;
  align-items: flex-start;
  background-color: var(--el-color-warning-light-9);
  border-left: 4px solid var(--el-color-warning);
  padding: 10px;
  margin-top: 10px;
  border-radius: 4px;
}

.info-box i {
  color: var(--el-color-warning);
  margin-right: 8px;
  margin-top: 2px;
}

.option-with-description {
  display: flex;
  flex-direction: column;
}

.option-with-description small {
  color: var(--el-text-color-secondary);
}

.json-toggle-button {
  margin-bottom: 15px;
}

.json-editor-container {
  margin-top: 10px;
}

.json-editor-help {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.custom-slider-button {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
  background-color: var(--el-color-primary);
  border-radius: 50%;
}
</style>
