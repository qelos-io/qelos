<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue';
import { IOpenAISource } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled, Warning } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Object as () => IOpenAISource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formRef = ref();
const formModel = ref({ ...props.modelValue });
const availableLabels = ['Chatbot', 'NLP', 'AI Assistant', 'Text Generation'];
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

const openOpenAIConsole = () => {
  window.open('https://platform.openai.com/settings/organization/api-keys', '_blank');
};

const validateForm = async () => {
  if (!formRef.value) return false;
  
  try {
    await formRef.value.validate();
    
    // Custom validation for token field
    if (isNewIntegration.value && !tokenInput.value) {
      ElMessage.error('API token is required for new integrations');
      return false;
    }
    
    if (tokenInput.value && tokenInput.value.length < 20) {
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
  <el-form :model="formModel" :rules="rules" ref="formRef" @submit.prevent="submitForm" label-position="top">
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
    
    <el-form-item 
      label="API Token" 
      :required="isNewIntegration"
      class="token-form-item"
    >
      <el-input 
        v-model="tokenInput" 
        placeholder="Enter your OpenAI API token" 
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

    <div class="endpoints-info">
      <h4>Available Endpoints:</h4>
      <ul>
        <li><code>/api/ai/sources/{{ modelValue?._id || 'sourceId' }}/chat-completion</code></li>
        <li><code>/api/ai/sources/{{ modelValue?._id || 'sourceId' }}/chat-completion/pages</code></li>
        <li><code>/api/ai/sources/{{ modelValue?._id || 'sourceId' }}/blueprints</code></li>
      </ul>
    </div>
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
  margin-top: 4px;
}

.token-help-section {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 12px 16px;
  margin-top: 12px;
  border-left: 4px solid #409eff;
}

.token-help-section h4 {
  margin-top: 0;
  margin-bottom: 8px;
  font-weight: 500;
}

.token-help-section ol {
  margin: 0;
  padding-left: 20px;
}

.token-help-section li {
  margin-bottom: 6px;
}

.token-warning {
  margin-top: 12px;
  color: #e6a23c;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.form-actions {
  margin-top: 24px;
}
</style>
