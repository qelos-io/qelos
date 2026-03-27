<template>
  <el-form :model="formModel" :rules="rules" ref="formRef" @submit.prevent="submitForm" label-position="top">
    <FormInput
      v-model="formModel.name"
      title="Connection Name"
      required
      placeholder="Enter a descriptive name for this Paddle Connection"
    />

    <LabelsInput
      v-model="formModel.labels"
      :availableLabels="availableLabels"
      title="Labels"
      placeholder="Select applicable labels"
    >
      <el-option v-for="label in availableLabels" :key="label" :label="label" :value="label" />
    </LabelsInput>

    <el-form-item
      label="Environment"
      required
    >
      <el-radio-group v-model="formModel.metadata.environment" :disabled="isSubmitting">
        <el-radio value="sandbox">Sandbox</el-radio>
        <el-radio value="live">Live</el-radio>
      </el-radio-group>
      <div v-if="formModel.metadata.environment === 'live'" class="environment-warning">
        <el-icon><Warning /></el-icon> Live mode will process real payments. Make sure you're using production credentials.
      </div>
    </el-form-item>

    <el-form-item
      label="API Key"
      :required="isNewIntegration"
      class="token-form-item"
    >
      <el-input
        v-model="tokenInput"
        placeholder="Enter your Paddle API Key"
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
        Leave empty to keep the existing API key
      </div>

      <div v-if="showTokenHelp" class="token-help-section">
        <h4>How to get your Paddle API Key:</h4>
        <ol>
          <li>Go to <el-link type="primary" href="https://vendors.paddle.com/authentication" target="_blank" :underline="false">https://vendors.paddle.com/authentication</el-link></li>
          <li>Log in to your Paddle account</li>
          <li>Navigate to <strong>Developer Tools</strong> &gt; <strong>Authentication</strong></li>
          <li>Generate or copy your <strong>API Key</strong></li>
          <li>Choose the matching environment (Sandbox for testing, Live for production)</li>
        </ol>
        <div class="token-warning">
          <el-icon><Warning /></el-icon> Your API Key gives access to Paddle API services. Keep it secure and never share it publicly.
        </div>
      </div>
    </el-form-item>

  </el-form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IPaddleSource } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled, Warning } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Object as () => IPaddleSource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formRef = ref();
const formModel = ref({
  ...props.modelValue,
  metadata: {
    environment: 'sandbox' as 'sandbox' | 'live',
    ...props.modelValue?.metadata,
  },
});
const availableLabels = ['Payments', 'E-commerce', 'Subscriptions'];
const tokenInput = ref('');
const isSubmitting = ref(false);
const showTokenHelp = ref(false);

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

const validateForm = async () => {
  if (!formRef.value) return false;

  try {
    await formRef.value.validate();

    if (isNewIntegration.value && !tokenInput.value) {
      ElMessage.error('API Key is required for new integrations');
      return false;
    }

    if (tokenInput.value && tokenInput.value.length < 10) {
      ElMessage.error('Please enter a valid Paddle API Key');
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
        apiKey: tokenInput.value
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

<style scoped>
.token-form-item {
  margin-block-start: 24px;
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

.environment-warning {
  margin-block-start: 8px;
  color: #f56c6c;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
}

</style>
