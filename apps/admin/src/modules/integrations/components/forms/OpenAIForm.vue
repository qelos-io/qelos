<script setup lang="ts">
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { IOpenAISource } from '@qelos/global-types';
import { ref, defineProps, defineEmits } from 'vue';

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
    <el-form-item>
      <el-button type="primary" @click="submitForm">{{ $t('Save') }}</el-button>
      <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
    </el-form-item>
  </el-form>
</template>
