<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';
import { IOpenAISource } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';


const props = defineProps({
  modelValue: {
    type: Object as () => IOpenAISource,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formModel = ref({ ...props.modelValue });
const availableLabels = ['Chatbot', 'NLP'];
const rules = {
  name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
};

const token = ref('');

const submitForm = () => {
  if (token.value) {
    formModel.value.authentication = {
      token: token
    }
  }
  emit('submit', formModel.value);
};
</script>

<template>
  <el-form :model="formModel" :rules="rules" ref="formRef" @submit.prevent="submitForm">
    <FormInput v-model="formModel.name" title="Name" />
    <LabelsInput v-model="formModel.labels" :availableLabels="availableLabels" title="Labels">
      <el-option v-for="label in availableLabels" :key="label" :label="label" :value="label" />
    </LabelsInput>
    <FormInput v-model="token" title="Token" placeholder="Leave empty to keep previous value"/>
    <el-form-item>
      <el-button type="primary" nativeType="submit">{{ $t('Save') }}</el-button>
      <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
    </el-form-item>
  </el-form>
</template>
