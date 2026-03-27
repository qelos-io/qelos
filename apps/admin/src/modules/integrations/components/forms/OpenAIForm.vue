<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { IOpenAISource } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import ConnectionFormSection from '@/modules/integrations/components/forms/ConnectionFormSection.vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled, Warning } from '@element-plus/icons-vue';
import { AVAILABLE_MODELS } from '@/modules/integrations/constants/ai-models';

const props = defineProps({
  modelValue: {
    type: Object as () => IOpenAISource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formRef = ref();

const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

const TOKEN_UNCHANGED_MASK = '*****';

function openAiMetadataHostname(apiUrl: string | undefined | null): string | null {
  const raw = apiUrl == null ? '' : String(apiUrl).trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    try {
      return new URL(`https://${raw}`).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
}

/** Empty apiUrl → official OpenAI default. Matches apps/ai OpenAI provider host check. */
function isOfficialOpenAiApiUrl(apiUrl: string | undefined | null): boolean {
  const host = openAiMetadataHostname(apiUrl);
  if (host == null) {
    return true;
  }
  return host === 'openai.com' || host.endsWith('.openai.com');
}

const normalizeDefaultModel = (value: unknown): string => {
  if (typeof value !== 'string' || value === '[object InputEvent]') {
    return DEFAULT_OPENAI_MODEL;
  }
  return value;
};

const formModel = ref({ 
  ...props.modelValue,
  metadata: {
    ...props.modelValue?.metadata,
    defaultModel: normalizeDefaultModel(props.modelValue?.metadata?.defaultModel) || DEFAULT_OPENAI_MODEL
  }
});
const availableLabels = ['Chatbot', 'NLP', 'AI Assistant', 'Text Generation'];
const tokenInput = ref('');
const isSubmitting = ref(false);
const showTokenHelp = ref(false);
const referencePanel = ref<string[]>([]);

// OpenAI model options with descriptions
const openAIModelOptions = AVAILABLE_MODELS;

// Determine if this is a new integration or an edit
const isNewIntegration = computed(() => !props.modelValue?._id);

const isOfficialOpenAiEndpoint = computed(() =>
  isOfficialOpenAiApiUrl(formModel.value.metadata?.apiUrl),
);

const usesCustomCompatibleApi = computed(() => !isOfficialOpenAiEndpoint.value);

const tokenLeavesSecretUnchanged = computed(
  () => tokenInput.value.trim() === TOKEN_UNCHANGED_MASK,
);

const tokenInputRequired = computed(
  () => isNewIntegration.value && isOfficialOpenAiEndpoint.value,
);

const rules = {
  name: [
    { required: true, message: 'Name is required', trigger: 'blur' },
    { min: 3, max: 50, message: 'Name must be between 3 and 50 characters', trigger: 'blur' }
  ]
};

const toggleTokenHelp = () => {
  showTokenHelp.value = !showTokenHelp.value;
};

const openOpenAIConsole = () => {
  window.open('https://platform.openai.com/settings/organization/api-keys', '_blank');
};

const validateForm = async () => {
  if (!formRef.value) return false;
  
  try {
    await formRef.value.validate();

    const rawToken = tokenInput.value.trim();

    if (tokenLeavesSecretUnchanged.value) {
      if (isNewIntegration.value && isOfficialOpenAiEndpoint.value) {
        ElMessage.error('API token is required for new integrations');
        return false;
      }
      return true;
    }

    if (isNewIntegration.value && isOfficialOpenAiEndpoint.value && !rawToken) {
      ElMessage.error('API token is required for new integrations');
      return false;
    }

    if (rawToken && isOfficialOpenAiEndpoint.value && rawToken.length < 20) {
      ElMessage.error('Please enter a valid OpenAI API token');
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  try {
    isSubmitting.value = true;
    const isValid = await validateForm();
    
    if (!isValid) {
      isSubmitting.value = false;
      return;
    }
    
    const modelToSubmit = { ...formModel.value };

    const rawToken = tokenInput.value.trim();

    if (rawToken === TOKEN_UNCHANGED_MASK) {
      if (isNewIntegration.value && usesCustomCompatibleApi.value) {
        modelToSubmit.authentication = { token: 'none' };
      }
      // Existing connection: omit authentication so the backend keeps the current token.
    } else if (!rawToken && usesCustomCompatibleApi.value) {
      modelToSubmit.authentication = { token: 'none' };
    } else if (rawToken) {
      modelToSubmit.authentication = { token: tokenInput.value };
    }

    emit('submit', modelToSubmit);
  } catch (error) {
    ElMessage.error('Please fix the form errors before submitting');
  } finally {
    isSubmitting.value = false;
  }
};

// Watch for modelValue changes to update formModel
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    formModel.value = { 
      ...newValue,
      metadata: {
        ...newValue?.metadata,
        defaultModel: normalizeDefaultModel(newValue?.metadata?.defaultModel) || DEFAULT_OPENAI_MODEL
      }
    };
    // Initialize token for existing integrations
    if (!isNewIntegration.value && newValue.authentication?.token) {
      tokenInput.value = ''; // Keep empty for security, user can update if needed
    }
  }
}, { immediate: true });

defineExpose({ submitForm });
</script>

<template>
  <el-form
    :model="formModel"
    :rules="rules"
    ref="formRef"
    class="connection-provider-form"
    label-position="top"
    @submit.prevent="submitForm"
  >
    <ConnectionFormSection
      :title="$t('Connection section identity')"
      :description="$t('Connection section identity hint')"
    >
      <FormInput 
        v-model="formModel.name" 
        title="Connection Name" 
        required
        placeholder="Enter a descriptive name for this OpenAI Connection"
      />
      <LabelsInput 
        v-model="formModel.labels" 
        :availableLabels="availableLabels" 
        title="Labels"
        placeholder="Select applicable labels"
      >
        <el-option v-for="label in availableLabels" :key="label" :label="label" :value="label" />
      </LabelsInput>
    </ConnectionFormSection>

    <ConnectionFormSection
      :title="$t('Connection section modelEndpoint')"
      :description="$t('Connection section modelEndpoint hint')"
    >
      <FormInput
        v-model="formModel.metadata.defaultModel"
        title="Default Model"
        type="select"
        :options="openAIModelOptions"
        required
        placeholder="gpt-5.2"
        description="OpenAI model to use when a specific model isn't provided by workflows."
        :select-options="{ filterable: true, allowCreate: true }"
      />
      <FormInput
        v-model="formModel.metadata.apiUrl"
        title="API base URL"
        type="url"
        placeholder="https://api.openai.com/v1"
        description="Optional. Leave empty to use OpenAI's default API. Use an https (or http) URL for OpenAI-compatible gateways or proxies."
      />
    </ConnectionFormSection>

    <ConnectionFormSection
      :title="$t('Connection section authentication')"
      :description="$t('Connection section authentication hint')"
    >
      <el-form-item 
        label="API Token" 
        :required="tokenInputRequired"
        class="token-form-item token-form-item--flush"
      >
        <el-input 
          v-model="tokenInput" 
          placeholder="Enter your OpenAI API token" 
          type="password" 
          show-password
          size="large"
          :required="tokenInputRequired"
          :disabled="isSubmitting"
        >
          <template #append>
            <el-button @click="toggleTokenHelp" type="info" plain>
              <el-icon><QuestionFilled /></el-icon>
            </el-button>
          </template>
        </el-input>
        
        <div v-if="!isNewIntegration" class="token-hint">
          Leave empty to keep the existing token, or enter {{ TOKEN_UNCHANGED_MASK }} to leave it unchanged on save.
          <template v-if="usesCustomCompatibleApi"> For a non-OpenAI base URL, an empty token is stored as a placeholder so you can use gateways that do not require a key.</template>
        </div>
        
        <div v-if="showTokenHelp" class="token-help-section">
          <h4>How to get your OpenAI API token:</h4>
          <ol>
            <li>Go to the <el-link type="primary" @click="openOpenAIConsole" :underline="false">OpenAI API Keys page</el-link></li>
            <li>Sign in to your OpenAI account if needed</li>
            <li>Click "Create new secret key"</li>
            <li>Give your key a name (e.g., "Qelos Integration")</li>
            <li>Copy the generated token immediately (it will only be shown once)</li>
            <li>Paste it here</li>
          </ol>
          <div class="token-warning">
            <el-icon><Warning /></el-icon> Your API token gives access to OpenAI services and will be charged according to your OpenAI account usage. Keep it secure.
          </div>
        </div>
      </el-form-item>
    </ConnectionFormSection>

    <el-collapse v-model="referencePanel" class="connection-reference-collapse">
      <el-collapse-item name="ref" :title="$t('Connection API reference')">
        <p class="connection-reference-intro">{{ $t('Connection API reference hint') }}</p>
        <ul class="connection-endpoints-list">
          <li><code>/api/ai/sources/{{ modelValue?._id || 'sourceId' }}/chat-completion</code></li>
          <li><code>/api/ai/sources/{{ modelValue?._id || 'sourceId' }}/chat-completion/pages</code></li>
          <li><code>/api/ai/sources/{{ modelValue?._id || 'sourceId' }}/blueprints</code></li>
        </ul>
      </el-collapse-item>
    </el-collapse>
  </el-form>
</template>

<style scoped>
.token-field-wrapper {
  margin-bottom: 8px;
  width: 100%;
}

.token-field-wrapper :deep(.el-input) {
  width: 100%;
}

.token-field-wrapper :deep(.el-input__wrapper) {
  height: 32px;
}

.token-field-wrapper :deep(.el-input__inner) {
  height: 32px;
  line-height: 32px;
}

/* Match the large size from FormInput component */
.token-field-wrapper :deep(.el-input--large .el-input__wrapper) {
  height: 40px;
}

.token-field-wrapper :deep(.el-input--large .el-input__inner) {
  height: 40px;
  line-height: 40px;
}

.token-hint {
  font-size: 12px;
  color: #909399;
  margin-block-start: 4px;
}

.token-help-section {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 12px 16px;
  margin-block-start: 12px;
  border-inline-start: 4px solid #409eff;
}

.token-help-section h4 {
  margin-block-start: 0;
  margin-block-end: 8px;
  font-weight: 500;
}

.token-help-section ol {
  margin: 0;
  padding-inline-start: 20px;
}

.token-help-section li {
  margin-block-end: 6px;
}

.token-warning {
  margin-block-start: 12px;
  color: #e6a23c;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.token-form-item--flush {
  margin-block-start: 0;
}

.connection-reference-collapse {
  margin-block-start: 8px;
  border: none;
  --el-collapse-border-color: transparent;
}

.connection-reference-collapse :deep(.el-collapse-item__header) {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.connection-reference-intro {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.45;
}

.connection-endpoints-list {
  margin: 0;
  padding-inline-start: 18px;
}

.connection-endpoints-list li {
  margin-block-end: 8px;
}

.connection-endpoints-list code {
  font-size: 12px;
  word-break: break-all;
}

</style>
