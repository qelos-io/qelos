<script setup lang="ts">
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { watch } from 'vue';

const modelValue = defineModel<any>()

const emit = defineEmits(['confirm'])

const confirmAction = useConfirmAction((value) => {
  emit('confirm', value)
})


watch(() => modelValue.value, (newValue) => {
  if (newValue) {
    confirmAction(modelValue.value);
    modelValue.value = null;
  }
}, { immediate: true })
</script>

<template></template>