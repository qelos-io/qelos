<script lang="ts" setup>
import { defineProps, defineModel } from 'vue';

const props = defineProps<{
  availableLabels: string[];
}>();

const modelValue = defineModel<string[]>('modelValue', { required: true })

</script>

<template>
  <el-form-item>
    <el-select v-model="modelValue" multiple clearable placeholder="Choose labels" class="styled-select"
      popper-class="workspaces-dropdown-header" style="width: 320px" allow-create>
      <el-option v-for="label in props.availableLabels" :key="label" :label="label" :value="label" />
    </el-select>
  </el-form-item>
</template>

<style lang="scss" scoped>
.styled-select {
  width: 100%;
  margin-right: 50px;
}

.workspaces-dropdown-header {
  .el-checkbox {
    display: flex;
    height: unset;
  }
}
</style>
