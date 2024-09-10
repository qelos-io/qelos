<script setup lang="ts">
import { provide, ref, watch } from 'vue';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import EditComponentBar from '@/modules/no-code/components/EditComponentBar.vue';

const props = defineProps<{
  onSubmit?: (data: any) => Promise<unknown>;
  data?: any | Promise<any>,
  successMsg?: string;
  errorMsg?: string;
  clearAfterSubmit?: boolean;
}>();
const emit = defineEmits(['submitted'])

function getClonedData() {
  return JSON.parse(JSON.stringify(props.data || {}))
}

const form = ref()
const { submit, submitting } = useSubmitting(async () => {
  const result = await props.onSubmit?.(form.value);
  emit('submitted', result);
  if (props.clearAfterSubmit) {
    form.value = getClonedData();
  }
  return result;
}, {
  success: props.successMsg || 'Submitted successfully',
  error: props.errorMsg || 'Failed to submit entity'
});

provide('submitting', submitting);

watch(() => props.data, () => {
  form.value = getClonedData();
}, { immediate: true });
</script>

<template>
  <el-form @submit.prevent="submit">
    <EditComponentBar/>
    <slot v-bind="{submit, submitting, data, form}"/>
  </el-form>
</template>

<style scoped>

</style>