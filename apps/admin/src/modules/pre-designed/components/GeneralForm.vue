<script setup lang="ts">
import { inject, provide, ref, watch } from 'vue';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

const props = defineProps<{
  onSubmit?: (data: any) => Promise<unknown>;
  data: any | Promise<any>,
  successMsg?: string;
  errorMsg?: string;
}>();
const emit = defineEmits(['submitted'])

function getClonedData() {
  return JSON.parse(JSON.stringify(props.data || {}))
}

const form = ref()
const { submit, submitting } = useSubmitting(async () => {
  const result = await props.onSubmit?.(form.value);
  emit('submitted', result);
  return result;
}, {
  success: props.successMsg || 'Submitted successfully',
  error: props.errorMsg || 'Failed to submit entity'});

provide('submitting', submitting);

watch(() => props.data, () => {
  form.value = getClonedData();
}, { immediate: true });
const editableManager = inject<any>('editableManager');
</script>

<template>
  <el-form @submit.prevent="submit">
    <RemoveButton v-if="editableManager" class="remove-component-btn" @click="editableManager.removeComponent($el)"/>
    <slot v-bind="{submit, submitting, data, form}"/>
  </el-form>
</template>

<style scoped>

</style>