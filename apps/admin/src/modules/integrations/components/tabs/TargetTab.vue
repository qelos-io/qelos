<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useIntegrationKindsTargetOperations } from '@/modules/integrations/compositions/integration-kinds-operations';
import { IntegrationSourceKind, OpenAITargetOperation, HttpTargetOperation, EmailTargetOperation } from '@qelos/global-types';

// Import target configuration components
import HttpTargetConfig from './target-components/HttpTargetConfig.vue';
import OpenAITargetConfig from './target-components/OpenAITargetConfig.vue';
import QelosTargetConfig from './target-components/QelosTargetConfig.vue';
import EmailTargetConfig from './target-components/EmailTargetConfig.vue';

const props = defineProps<{
  modelValue: any;
  integrationId?: string;
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
  headers: {} as Record<string, string>,
  query: {} as Record<string, string>,
  body: {} as Record<string, any>
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
  pre_messages: [],
  embeddingType: 'local',
  maxTools: 15,
});

const systemMessage = ref('');

const qelosDetails = ref({
  eventName: '',
  kind: '',
  description: '',
  password: '',
  roles: '',
  userId: '',
  blueprint: '',
});

const emailDetails = ref({
  to: '',
  subject: '',
  body: '',
  cc: '',
  bcc: ''
});

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

// Initialize target details based on selected kind and operation
const initTargetDetails = () => {
  if (!props.modelValue || !props.modelValue.source || !props.modelValue.operation) {
    return;
  }

  const source = store.result?.find(s => s._id === props.modelValue.source);
  if (!source) {
    return;
  }

  // Initialize UI state based on target kind and operation
  if (source.kind === IntegrationSourceKind.Http && props.modelValue.operation === HttpTargetOperation.makeRequest) {
    // Initialize HTTP details
    httpDetails.value = {
      method: props.modelValue.details?.method || 'GET',
      url: props.modelValue.details?.url || '',
      headers: props.modelValue.details?.headers || {},
      query: props.modelValue.details?.query || {},
      body: props.modelValue.details?.body || {}
    };
    
    // Initialize header keys
    httpHeaderKeys.value = {};
    Object.keys(httpDetails.value.headers).forEach(key => {
      httpHeaderKeys.value[key] = key;
    });
    
    // Initialize query keys
    httpQueryKeys.value = {};
    Object.keys(httpDetails.value.query).forEach(key => {
      httpQueryKeys.value[key] = key;
    });
    
    // Initialize body JSON
    httpBodyJson.value = JSON.stringify(httpDetails.value.body || {}, null, 2);
  } else if (source.kind === IntegrationSourceKind.OpenAI && props.modelValue.operation === OpenAITargetOperation.chatCompletion) {
    // Initialize OpenAI details
    openAiDetails.value = {
      model: props.modelValue.details?.model || 'gpt-4o',
      temperature: props.modelValue.details?.temperature ?? 0.7,
      top_p: props.modelValue.details?.top_p ?? 1,
      frequency_penalty: props.modelValue.details?.frequency_penalty ?? 0,
      presence_penalty: props.modelValue.details?.presence_penalty ?? 0,
      max_tokens: props.modelValue.details?.max_tokens ?? 1000,
      stop: props.modelValue.details?.stop,
      response_format: props.modelValue.details?.response_format,
      pre_messages: props.modelValue.details?.pre_messages || [],
      embeddingType: props.modelValue.details?.embeddingType || 'local',
      maxTools: props.modelValue.details?.maxTools ?? 15,
    };
    
    // Initialize system message from pre_messages
    initializeSystemMessage();
  } else if (source.kind === IntegrationSourceKind.Qelos) {
    // Initialize Qelos details
    qelosDetails.value = {
      eventName: props.modelValue.details?.eventName || '',
      kind: props.modelValue.details?.kind || '',
      description: props.modelValue.details?.description || '',
      password: props.modelValue.details?.password || '',
      roles: props.modelValue.details?.roles || '',
      userId: props.modelValue.details?.userId || '',
      blueprint: props.modelValue.details?.blueprint || '',
    };
  } else if (source.kind === IntegrationSourceKind.Email && props.modelValue.operation === EmailTargetOperation.sendEmail) {
    // Initialize Email details
    emailDetails.value = {
      to: props.modelValue.details?.to || '',
      subject: props.modelValue.details?.subject || '',
      body: props.modelValue.details?.body || '',
      cc: props.modelValue.details?.cc || '',
      bcc: props.modelValue.details?.bcc || ''
    };
  }
  
  // Update the target details text
  targetDetailsText.value = JSON.stringify(props.modelValue.details || {}, null, 2);
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
      <HttpTargetConfig
        v-if="selectedTargetSource.kind === IntegrationSourceKind.Http && modelValue.operation === HttpTargetOperation.makeRequest"
        :modelValue="modelValue"
        :operation="modelValue.operation"
        @update:modelValue="emit('update:modelValue', $event)"
      />
      
      <!-- Qelos Target Operations -->
      <QelosTargetConfig
        v-if="selectedTargetSource?.kind === IntegrationSourceKind.Qelos"
        :modelValue="modelValue"
        :operation="modelValue.operation"
        @update:modelValue="emit('update:modelValue', $event)"
      />
      
      <!-- OpenAI Chat Completion Form (Consolidated) -->
      <OpenAITargetConfig
        v-if="selectedTargetSource?.kind === IntegrationSourceKind.OpenAI && modelValue.operation === OpenAITargetOperation.chatCompletion"
        :modelValue="modelValue"
        :integrationId="props.integrationId"
        :operation="modelValue.operation"
        @update:modelValue="emit('update:modelValue', $event)"
      />

      <!-- Email Target - Send Email -->
      <EmailTargetConfig
        v-if="selectedTargetSource?.kind === IntegrationSourceKind.Email && modelValue.operation === EmailTargetOperation.sendEmail"
        :modelValue="modelValue"
        :operation="modelValue.operation"
        @update:modelValue="emit('update:modelValue', $event)"
      />
      
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
</style>
