<script setup lang="ts">
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { IFacebookSource, IntegrationSourceKind } from '@qelos/global-types';
import { watch } from 'vue';
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object as () => IFacebookSource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);

const formModel = ref({ ...props.modelValue, kind: IntegrationSourceKind.Facebook });
const availableLabels = ['marketing', 'analytics'];
const isEditing = ref(!!props.modelValue?._id);

const clientSecretMasked = ref(isEditing.value ? '*****' : '');
const clientSecretEdited = ref(false);

const rules = {
  name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
  'metadata.clientId': [{ required: true, message: 'Client ID is required', trigger: 'blur' }],
  'metadata.scope': [{ required: true, message: 'Scope is required', trigger: 'blur' }],
  'authentication.clientSecret': [
    {
      required: !isEditing.value,
      message: 'Client Secret is required for new integrations',
      trigger: 'blur'
    }
  ]
};

watch(() => props.modelValue, (newValue) => {
  formModel.value = { ...newValue, kind: IntegrationSourceKind.Facebook };
  isEditing.value = !!newValue?._id;
  clientSecretMasked.value = isEditing.value ? '*****' : '';
  clientSecretEdited.value = false;
});

const onClientSecretChange = (value: string) => {
  clientSecretEdited.value = value !== '*****';
  clientSecretMasked.value = value;
};

const submitForm = () => {
  const submissionData = { ...formModel.value };
  submissionData.authentication = submissionData.authentication || {};

  if (!isEditing.value || clientSecretEdited.value) {
    submissionData.authentication.clientSecret = clientSecretMasked.value;
  } else {
    delete submissionData.authentication.clientSecret;
  }

  emit('submit', submissionData);
};

</script>

<template>
  <el-form :model="formModel" :rules="rules" ref="formRef">
    <FormInput v-model="formModel.name" title="Name" />
    <LabelsInput v-model="formModel.labels" :availableLabels="availableLabels" title="Labels">
      <el-option v-for="label in availableLabels" :key="label" :label="label" :value="label" />
    </LabelsInput>
    <FormInput v-model="formModel.metadata.clientId" title="Client ID" />
    <FormInput v-model="formModel.metadata.scope" title="Scope" />
    <FormInput type="password" v-model="clientSecretMasked" @input="onClientSecretChange" title="Client Secret" />
    <el-form-item>
      <el-button type="primary" @click="submitForm">{{ $t('Save') }}</el-button>
      <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
    </el-form-item>
  </el-form>
</template>
