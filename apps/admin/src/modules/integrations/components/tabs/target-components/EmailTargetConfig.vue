<script setup lang="ts">
import { ref, watch } from 'vue';
import { EmailTargetOperation } from '@qelos/global-types';

const props = defineProps<{
  modelValue: any;
  operation: string;
}>();

const emit = defineEmits(['update:modelValue']);

// Email target UI state
const emailDetails = ref({
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: '', 
});

// Initialize component with existing data if available
const initEmailDetails = () => {
  if (props.modelValue?.details) {
    emailDetails.value = {
      to: props.modelValue.details.to || '',
      cc: props.modelValue.details.cc || '',
      bcc: props.modelValue.details.bcc || '',
      subject: props.modelValue.details.subject || '',
      body: props.modelValue.details.body || '',
    };
  }
};

// Sync UI state to form.target.details
const syncEmailDetailsToTargetDetails = () => {
  const newModelValue = { ...props.modelValue };
  newModelValue.details = { ...emailDetails.value };
  emit('update:modelValue', newModelValue);
};

// Initialize on mount and when modelValue changes
watch(() => props.modelValue, initEmailDetails, { immediate: true });
</script>

<template>
  <div class="email-target-config" v-if="operation === EmailTargetOperation.sendEmail">
    <el-alert
        type="info"
        :closable="false"
        show-icon
      ><p>{{ $t('Every data from your data manipulation steps will be override those values') }}</p></el-alert>
    <p class="config-description">
      {{ $t('Configure default email sending details:') }}
    </p>

    
    <el-form-item :label="$t('To')">
      <el-input v-model="emailDetails.to" placeholder="recipient@example.com" @input="syncEmailDetailsToTargetDetails" />
    </el-form-item>
    
    <el-form-item :label="$t('CC')">
      <el-input v-model="emailDetails.cc" placeholder="cc@example.com" @input="syncEmailDetailsToTargetDetails" />
    </el-form-item>
    
    <el-form-item :label="$t('BCC')">
      <el-input v-model="emailDetails.bcc" placeholder="bcc@example.com" @input="syncEmailDetailsToTargetDetails" />
    </el-form-item>
    
    <el-form-item :label="$t('Subject')">
      <el-input v-model="emailDetails.subject" placeholder="Email subject" @input="syncEmailDetailsToTargetDetails" />
    </el-form-item>
    
    <el-form-item :label="$t('Body')">
      <el-input
        v-model="emailDetails.body"
        type="textarea"
        :rows="4"
        placeholder="Email body"
        @input="syncEmailDetailsToTargetDetails"
      />
    </el-form-item>
  </div>
</template>

<style scoped>
.email-target-config {
  width: 100%;
}

.config-description {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
  margin-bottom: 15px;
}
</style>
