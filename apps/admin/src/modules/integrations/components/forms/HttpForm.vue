<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, toRaw } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import KeyValueInput from '@/modules/core/components/forms/KeyValueInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { IntegrationSourceKind, IHttpSource } from '@qelos/global-types';
import { useSecuredHeadersMasked } from '../../compositions/use-secured-headers-masked';

const { securedHeadersMasked } = useSecuredHeadersMasked();
const props = defineProps({
  modelValue: {
    type: Object as () => IHttpSource,
    required: true
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const isEditing = computed(() => !!props.modelValue?._id);
const securedHeadersEdited = ref(false);
const securedHeadersOriginal = ref<Record<string, string>>(props.modelValue?.authentication?.securedHeaders || {});

// If securedHeaders are not provided, take keys from headers where value === "*****"
if (Object.keys(securedHeadersOriginal.value).length === 0) {
  securedHeadersOriginal.value = Object.fromEntries(
    Object.entries(props.modelValue?.metadata?.headers || {}).filter(([_, value]) => value === '*****')
  );
}

const formModel = ref<IHttpSource>({
  ...props.modelValue,
  metadata: {
    method: props.modelValue?.metadata?.method || 'GET',
    baseUrl: props.modelValue?.metadata?.baseUrl || '',
    headers: props.modelValue?.metadata?.headers || {},
    query: props.modelValue?.metadata?.query || {},
  },
  authentication: {
    securedHeaders: props.modelValue?.authentication?.securedHeaders || {},
  },
  kind: IntegrationSourceKind.Http,
});

// Use structuredClone on a plain object 

if (isEditing.value && Object.keys(securedHeadersOriginal.value).length > 0) {
  securedHeadersMasked.value = structuredClone(toRaw(securedHeadersOriginal.value));
  Object.keys(securedHeadersMasked.value).forEach((key) => {
    securedHeadersMasked.value[key] = '*****';
  });
}

// Remove secured headers from normal headers
Object.keys(securedHeadersMasked.value).forEach((key) => {
  if (formModel.value.metadata.headers[key]) {
    delete formModel.value.metadata.headers[key];
  }
});

// Computed property for secured headers array remains if needed:
const securedHeadersArray = computed({
  get: () => Object.entries(securedHeadersMasked.value).map(([key, value]) => ({ key, value })),
  set: (newArray) => {
    securedHeadersEdited.value = true;
    securedHeadersMasked.value = Object.fromEntries(newArray.map(({ key, value }) => [key, value]));
  }
});

// Handle secured headers changes (if still used)
const onSecuredHeadersChange = (newArray: { key: string; value: string }[]) => {
  securedHeadersEdited.value = true;
  // Update securedHeadersMasked with '*****''
  securedHeadersMasked.value = Object.fromEntries(newArray.map(({ key, value }) => [key, value]));

  if (!formModel.value.authentication) {
    formModel.value.authentication = { securedHeaders: {} };
  }

  // Update securedHeaders in authentication with reactivity
  formModel.value.authentication.securedHeaders = Object.fromEntries(newArray.map(({ key, value }) => [key, value]));

};

const submitForm = () => {
  Object.keys(securedHeadersMasked.value).forEach((key) => {
    formModel.value.metadata.headers[key] = '*****';
  });

  const submissionData = { ...formModel.value };

  if (securedHeadersEdited.value) {
    // Use structuredClone with toRaw here as well
    submissionData.authentication.securedHeaders = { ...securedHeadersMasked.value };

  } else {
    delete submissionData.authentication.securedHeaders;
  }
  emit('submit', submissionData);

};
</script>

<template>
  <el-form :model="formModel" ref="formRef">
    <FormInput v-model="formModel.name" title="Name" />

    <LabelsInput v-model="formModel.labels" :availableLabels="['supplier', 'store', 'consumer']" title="Labels">
      <el-option v-for="label in ['supplier', 'store', 'consumer']" :key="label" :label="label" :value="label" />
    </LabelsInput>

    <KeyValueInput v-model="securedHeadersMasked" :initialValue="securedHeadersArray" @change="onSecuredHeadersChange"
      title="Secured Headers" />
    <KeyValueInput v-model="formModel.metadata.headers" title="Headers" />
    <KeyValueInput v-model="formModel.metadata.query" title="Query Params" />
    <FormInput v-model="formModel.metadata.baseUrl" title="Base URL" />

    <el-form-item>
      <el-button type="primary" @click="submitForm">Save</el-button>
      <el-button @click="$emit('close')">Cancel</el-button>
    </el-form-item>
  </el-form>
</template>
