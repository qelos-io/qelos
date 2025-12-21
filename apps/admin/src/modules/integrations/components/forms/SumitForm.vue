<template>
  <el-form :model="formModel" :rules="rules" ref="formRef" @submit.prevent="submitForm" label-position="top">
    <FormInput
      v-model="formModel.name"
      title="Connection Name"
      required
      placeholder="Enter a descriptive name for this Sumit Connection"
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
      label="Company ID"
      required
    >
      <el-input
        v-model="formModel.metadata.companyId"
        placeholder="Enter your Sumit Company ID"
        size="large"
        :disabled="isSubmitting"
      />
    </el-form-item>

    <el-form-item
      label="API Key"
      :required="isNewIntegration"
      class="token-form-item"
    >
      <el-input
        v-model="tokenInput"
        placeholder="Enter your Sumit API Key"
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
        <h4>How to get your Sumit API Key and Company ID:</h4>
        <ol>
          <li>Go to <el-link type="primary" href="https://app.sumit.co.il/developers/keys/" target="_blank" :underline="false">https://app.sumit.co.il/developers/keys/</el-link></li>
          <li>Log in to your Sumit account</li>
          <li>Copy your <strong>Company ID</strong> from the page</li>
          <li>Click "Generate New Key" to create an API Key</li>
          <li>Copy the generated API Key and paste it here</li>
        </ol>
        <div class="token-warning">
          <el-icon><Warning /></el-icon> Your API Key gives access to Sumit services and will be charged according to your Sumit account usage. Keep it secure.
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
import { ref, computed, defineProps, defineEmits } from 'vue';
import { ISumitSource } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled, Warning } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Object as () => ISumitSource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formRef = ref();
const formModel = ref({ ...props.modelValue });
const availableLabels = ['Payments', 'Finance', 'Billing'];
const tokenInput = ref('');
const isSubmitting = ref(false);
const showTokenHelp = ref(false);

// Determine if this is a new integration or an edit
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

const openSumitKeys = () => {
  window.open('https://app.sumit.co.il/developers/keys/', '_blank');
};

const validateForm = async () => {
  if (!formRef.value) return false;

  try {
    await formRef.value.validate();

    // Custom validation for token field
    if (isNewIntegration.value && !tokenInput.value) {
      ElMessage.error('API Key is required for new integrations');
      return false;
    }

    if (tokenInput.value && tokenInput.value.length < 20) {
      ElMessage.error('Please enter a valid Sumit API Key');
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

.form-actions {
  margin-block-start: 24px;
}
</style>
