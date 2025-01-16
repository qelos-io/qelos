<!-- WorkspaceLabelSelector.vue -->
<script setup lang="ts">
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';

const props = defineProps<{
  availableLabels: string[];
  placeholder?: string;
  title?: string;
}>()

const model = defineModel();
</script>

<template>
  <LabelsInput v-model="model" :title="title || 'Workspace Labels'">
    <el-option v-for="label in props.availableLabels" :key="label" :label="label" :value="label"/>
  </LabelsInput>
</template>