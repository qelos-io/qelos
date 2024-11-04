<!-- WorkspaceLabelSelector.vue -->
<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    availableLabels: string[];
    placeholder?: string;
    title?: string;
    // isAdmin?: boolean; 
  }>(),
  { modelValue: () => ['*'], } // Setting '*' as the default value
);

const emit = defineEmits(['update:modelValue']);

</script>

<template>
  <el-form-item>
    <template #label> {{ title || 'Workspace Labels' }}</template>
    <el-select :model-value="props.modelValue" multiple :placeholder="placeholder" title="Workspace Labels"
      class="styled-select" @change="(value) => {

        emit('update:modelValue', value)
      }">
      <el-option v-for="label in availableLabels" :key="label" :label="label" :value="label" />

    </el-select>
  </el-form-item>
</template>


<style lang="scss" scoped>
.styled-select {
  width: 100%;

}
</style>
