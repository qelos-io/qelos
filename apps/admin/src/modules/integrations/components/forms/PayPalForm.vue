<template>
  <el-form :model="formModel" :rules="rules" ref="formRef" @submit.prevent="submitForm" label-position="top">
    <FormInput
      v-model="formModel.name"
      title="Connection Name"
      required
      placeholder="Enter a descriptive name for this PayPal Connection"
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
      label="Client ID"
      required
    >
      <el-input
        v-model="formModel.metadata.clientId"
        placeholder="Enter your PayPal Client ID"
        size="large"
        :disabled="isSubmitting"
      />
    </el-form-item>

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
      label="Client Secret"
      :required="isNewIntegration"
      class="token-form-item"
    >
      <el-input
        v-model="tokenInput"
        placeholder="Enter your PayPal Client Secret"
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
        Leave empty to keep the existing secret
      </div>

      <div v-if="showTokenHelp" class="token-help-section">
        <h4>How to get your PayPal API credentials:</h4>
        <ol>
          <li>Go to <el-link type="primary" href="https://developer.paypal.com/dashboard/applications" target="_blank" :underline="false">https://developer.paypal.com/dashboard/applications</el-link></li>
          <li>Log in to your PayPal Developer account</li>
          <li>Create a new app or select an existing one</li>
          <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
          <li>Choose the matching environment (Sandbox for testing, Live for production)</li>
        </ol>
        <div class="token-warning">
          <el-icon><Warning /></el-icon> Your Client Secret gives access to PayPal API services. Keep it secure and never share it publicly.
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

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IPayPalSource } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled, Warning } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Object as () => IPayPalSource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formRef = ref();
const formModel = ref({
  ...props.modelValue,
  metadata: {
    clientId: '',
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

    if (!formModel.value.metadata.clientId) {
      ElMessage.error('Client ID is required');
      return false;
    }

    if (isNewIntegration.value && !tokenInput.value) {
      ElMessage.error('Client Secret is required for new integrations');
      return false;
    }

    if (tokenInput.value && tokenInput.value.length < 10) {
      ElMessage.error('Please enter a valid PayPal Client Secret');
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
        clientSecret: tokenInput.value
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

.form-actions {
  margin-block-start: 24px;
}
</style>
