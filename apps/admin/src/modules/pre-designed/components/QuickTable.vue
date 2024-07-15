<script setup lang="ts">
import { inject } from 'vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

defineProps<{
  data: any[],
  columns: Array<{
    prop: string,
    label: string,
    width?: string | number,
    minWidth?: string | number,
    fixed?: boolean
  }>
}>()

const isEditable = inject('isEditable');

defineEmits(['removeComponent'])
</script>

<template>
  <div class="quick-table-wrapper">
    <RemoveButton v-if="isEditable" class="remove" @click="$emit('removeComponent', $el)" />
    <el-table :data="data" style="width: 100%" max-height="250">
      <el-table-column v-for="(col, index) in columns" :key="index" v-bind="col"/>
    </el-table>
  </div>
</template>

<style scoped>
.quick-table-wrapper {
  position: relative;
}

.remove {
  position: absolute;
  top: 10px;
  inset-inline-end: 0;
  z-index: 2;
  font-size: 150%;
}
</style>