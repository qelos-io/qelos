<script setup lang="ts">
import { ref, computed } from 'vue';
import { DEFAULT_AI_MODEL_BY_PROVIDER, IGeminiSource } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import ConnectionFormSection from '@/modules/integrations/components/forms/ConnectionFormSection.vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled, Warning } from '@element-plus/icons-vue';
import { GEMINI_MODELS } from '@/modules/integrations/constants/ai-models';

const props = defineProps({
  modelValue: {
    type: Object as () => IGeminiSource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formRef = ref();

const DEFAULT_GEMINI_MODEL = DEFAULT_AI_MODEL_BY_PROVIDER.gemini;

const normalizeDefaultModel = (value: unknown): string => {
  if (typeof value !== 'string' || value === '[object InputEvent]') {
    return DEFAULT_GEMINI_MODEL;
  }
  return value;
};

const formModel = ref({
  ...props.modelValue,
  metadata: {
    ...props.modelValue?.metadata,
    defaultModel: normalizeDefaultModel(props.modelValue?.metadata?.defaultModel) || DEFAULT_GEMINI_MODEL,
  },
});
const availableLabels = ['AI Assistant', 'Multimodal', 'Gemini'];
const tokenInput = ref('');
const isSubmitting = ref(false);
const showTokenHelp = ref(false);

const geminiModelOptions = GEMINI_MODELS.map((model) => ({
  label: model.label,
  value: model.value ?? model.identifier,
  description: model.description ?? '',
}));

const isNewIntegration = computed(() => !props.modelValue?._id);

const rules = {
  name: [
    { required: true, message: 'Name is required', trigger: 'blur' },
    { min: 3, max: 50, message: 'Name must be between 3 and 50 characters', trigger: 'blur' }
  ]
};

const toggleTokenHelp = () => {
  showTokenHelp.value = !showTokenHelp.value;
};

const openGoogleAIConsole = () => {
  window.open('https://aistudio.google.com/app/apikey', '_blank');
};

const validateForm = async () => {
  if (!formRef.value) return false;

  try {
    await formRef.value.validate();

    if (isNewIntegration.value && !tokenInput.value) {
      ElMessage.error('API token is required for new integrations');
      return false;
    }

    if (tokenInput.value && tokenInput.value.length < 20) {
      ElMessage.error('Please enter a valid Gemini API token');
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

    if (tokenInput.value) {
      modelToSubmit.authentication = {
        token: tokenInput.value
      };
    }

    emit('submit', modelToSubmit);
  } catch (error) {
    ElMessage.error('Please fix the form errors before submitting');
  } finally {
    isSubmitting.value = false;
  }
};

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
        placeholder="Enter a descriptive name for this Gemini connection"
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
      :description="$t('Connection section modelGemini hint')"
    >
      <FormInput
        v-model="formModel.metadata.defaultModel"
        title="Default Model"
        type="select"
        :options="geminiModelOptions"
        required
        placeholder="gemini-2.5-flash"
        description="Gemini model to use when a specific model isn't provided by workflows."
        :select-options="{ filterable: true, allowCreate: true }"
      />
      <FormInput
        v-model="formModel.metadata.apiUrl"
        title="API base URL"
        type="url"
        placeholder="https://generativelanguage.googleapis.com"
        description="Optional. Leave empty to use Google's default Gemini API. Set this only if you use a compatible proxy or custom endpoint (http or https)."
      />
    </ConnectionFormSection>

    <ConnectionFormSection
      :title="$t('Connection section authentication')"
      :description="$t('Connection section authentication hint')"
    >
      <el-form-item
        label="API Token"
        :required="isNewIntegration"
        class="token-form-item token-form-item--flush"
      >
        <el-input
          v-model="tokenInput"
          placeholder="Enter your Gemini API token"
          type="password"
          show-password
          size="large"
          :required="isNewIntegration"
          :disabled="isSubmitting"
        >
          <template #append>
            <el-button @click="toggleTokenHelp" type="info" plain>
              <el-icon><QuestionFilled /></el-icon>
            </el-button>
          </template>
        </el-input>

        <div v-if="!isNewIntegration" class="token-hint">
          Leave empty to keep the existing token
        </div>

        <div v-if="showTokenHelp" class="token-help-section">
          <h4>How to get your Gemini API token:</h4>
          <ol>
            <li>
              Go to the <el-link type="primary" @click="openGoogleAIConsole" :underline="false">Google AI Studio API Keys page</el-link>
            </li>
            <li>Create a new API key for your project</li>
            <li>Name the key (e.g., "Qelos Gemini")</li>
            <li>Copy the generated key (shown only once)</li>
            <li>Paste it here and store it securely</li>
          </ol>
          <div class="token-warning">
            <el-icon><Warning /></el-icon>
            Your API token grants access to Gemini services and will incur usage under your Google Cloud project. Keep it secure.
          </div>
        </div>
      </el-form-item>
    </ConnectionFormSection>
  </el-form>
</template>

<style scoped>
.token-form-item--flush {
  margin-block-start: 0;
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
  margin: 0 0 8px 0;
  font-weight: 500;
}

.token-help-section ol {
  margin: 0;
  padding-inline-start: 18px;
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

</style>
