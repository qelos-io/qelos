<script setup lang="ts">
import { inject } from 'vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

const props = defineProps<{
  data: any[],
  columns: Array<{
    prop: string,
    label: string,
    width?: string | number,
    minWidth?: string | number,
    fixed?: boolean
  }>
}>()

const editableManager = inject('editableManager');
</script>

<template>
  <div class="quick-table-wrapper">
    <RemoveButton v-if="editableManager" class="remove-component-btn" @click="editableManager.removeComponent($el)" />
    <el-table v-if="props.data && props.columns?.length" :data="data" style="width: 100%" border @row-click="$emit('row-click', $event)">
      <el-table-column v-for="(col, index) in columns" :key="index" v-bind="col">
        <template v-if="$slots[col.prop]" #default="scope"><slot :name="col.prop" v-bind="scope"/></template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.quick-table-wrapper {
  position: relative;
  margin: var(--spacing);
}
</style>