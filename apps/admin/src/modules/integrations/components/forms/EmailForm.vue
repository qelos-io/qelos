<script setup lang="ts">
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { IEmailSource, IntegrationSourceKind } from '@qelos/global-types';
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object as () => IEmailSource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formModel = ref({ ...props.modelValue, kind: IntegrationSourceKind.Email });
const availableLabels = ['Database', 'Backend'];
const rules = {
  name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
  'metadata.email': [{ required: true, message: 'Email is required', trigger: 'blur' }],
  'metadata.username': [{ required: true, message: 'Username is required', trigger: 'blur' }],
  'authentication.password': [{ required: true, message: 'Password is required', trigger: 'blur' }],
  'metadata.pop3': [{ required: true, message: 'POP3 Address is required', trigger: 'blur' }],
  'metadata.smtp': [{ required: true, message: 'SMTP Address is required', trigger: 'blur' }],
  'metadata.senderName': [{ required: true, message: 'Sender Name is required', trigger: 'blur' }],
};

const submitForm = () => {
  emit('submit', formModel.value);
};
</script>

<template>
  <el-form :model="formModel" :rules="rules" ref="formRef">
    <FormInput v-model="formModel.name" title="Name" />
    <LabelsInput v-model="formModel.labels" :availableLabels="availableLabels" title="Labels">
      <el-option v-for="label in availableLabels" :key="label" :label="label" :value="label" />
    </LabelsInput>
    <FormInput v-model="formModel.metadata.senderName" title="Sender Name" />
    <FormInput v-model="formModel.metadata.email" title="Email" />
    <FormInput v-model="formModel.metadata.pop3" title="POP3 Address" />
    <FormInput v-model="formModel.metadata.smtp" title="SMTP Address" />
    <FormInput v-model="formModel.metadata.username" title="Username" />
    <FormInput type="password" v-model="formModel.authentication.password" title="Password" />
    <el-form-item>
      <el-button type="primary" @click="submitForm">{{ $t('Save') }}</el-button>
      <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
    </el-form-item>
  </el-form>
</template>
