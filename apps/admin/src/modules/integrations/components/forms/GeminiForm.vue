<script setup lang="ts">
import { ref, computed } from 'vue';
import { IGeminiSource } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled, Warning } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Object as () => IGeminiSource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formRef = ref();
const formModel = ref({ ...props.modelValue });
const availableLabels = ['AI Assistant', 'Multimodal', 'Gemini'];
const tokenInput = ref('');
const isSubmitting = ref(false);
const showTokenHelp = ref(false);

const ensureMetadata = () => {
  if (!formModel.value.metadata) {
    formModel.value.metadata = {};
  }
  if (typeof formModel.value.metadata.defaultModel !== 'string') {
    formModel.value.metadata.defaultModel = 'gemini-1.5-pro-latest';
  }
};

ensureMetadata();

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
</script>

<template>
  <el-form
    :model="formModel"
    :rules="rules"
    ref="formRef"
    @submit.prevent="submitForm"
    label-position="top"
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

    <FormInput
      v-model="formModel.metadata.defaultModel"
      title="Default Model"
      required
      placeholder="gemini-1.5-pro-latest"
      description="Gemini model to use when a specific model isn't provided by workflows."
    />

    <el-form-item
      label="API Token"
      :required="isNewIntegration"
      class="token-form-item"
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

    <el-form-item class="form-actions">
      <el-button
        type="primary"
        nativeType="submit"
        :loading="isSubmitting"
      >
        {{ $t('Save') }}
      </el-button>
      <el-button @click="$emit('close')" :disabled="isSubmitting">
        {{ $t('Cancel') }}
      </el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.token-form-item {
  margin-block-start: 16px;
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

.form-actions {
  margin-block-start: 24px;
}
</style>
