<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, toRaw } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import KeyValueInput from '@/modules/core/components/forms/KeyValueInput.vue';
import ConnectionIdentity from '../connections/ConnectionIdentity.vue';
import ConnectionFormSection from './ConnectionFormSection.vue';
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
const formRef = ref();
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

const nameError = ref('');

const submitForm = () => {
  if (!String(formModel.value.name ?? '').trim()) {
    nameError.value = 'Name is required';
    return;
  }
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

function getAuthenticationOverride() {
  return securedHeadersEdited.value ? { securedHeaders: { ...securedHeadersMasked.value } } : undefined;
}

function getStatusFormModel() {
  return { metadata: { ...formModel.value.metadata } };
}

defineExpose({ submitForm, getAuthenticationOverride, getStatusFormModel });
</script>

<template>
  <el-form :model="formModel" ref="formRef" label-position="top" @submit.prevent="submitForm">
    <ConnectionFormSection :title="$t('Connection section basics')">
      <ConnectionIdentity
        v-model:name="formModel.name"
        v-model:labels="formModel.labels"
        :error="nameError"
        @edited="nameError = ''"
      />
      <FormInput v-model="formModel.metadata.baseUrl" title="Base URL" dir="ltr" />
    </ConnectionFormSection>
    <ConnectionFormSection
      :title="$t('Request defaults')"
      :description="$t('Sent with every request made through this connection.')"
    >
      <KeyValueInput v-model="formModel.metadata.headers" title="Headers" />
      <KeyValueInput v-model="formModel.metadata.query" title="Query Params" />
    </ConnectionFormSection>
    <ConnectionFormSection
      :title="$t('Connection section authentication')"
      :description="$t('Stored encrypted. Values show as ***** after saving; leave them to keep the saved ones.')"
    >
      <KeyValueInput
        v-model="securedHeadersMasked"
        :initialValue="securedHeadersArray"
        title="Secured Headers"
        @change="onSecuredHeadersChange"
      />
    </ConnectionFormSection>
  </el-form>
</template>
