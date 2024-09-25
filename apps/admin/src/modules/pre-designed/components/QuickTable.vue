<script setup lang="ts">
import EditComponentBar from '@/modules/no-code/components/EditComponentBar.vue';
import { ref, computed, defineProps } from 'vue';

const props = defineProps<{
  data: any[],
  columns: Array<{
    prop: string,
    label: string,
    width?: string | number,
    minWidth?: string | number,
    fixed?: boolean
  }>
  pageSize?: number
}>()

// Pagination state
const currentPage = ref(1);
const defaultPageSize = 50;
//  Use pageSize from props with fallback to default value
const pageSize = computed(() => props.pageSize || defaultPageSize);

// Computed data for current page
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return props.data.slice(start, end);
});

</script>
<template>
  <div class="quick-table-wrapper">
    <EditComponentBar />
    <el-table v-if="props.data && props.columns?.length" :data="paginatedData"
      style="width: 100% ; max-height: 80vh; overflow: auto;" border @row-click="$emit('row-click', $event)">
      <el-table-column v-for="(col, index) in columns" :key="index" v-bind="col" :index="index" class="sticky-header">
        <template v-if="$slots[col.prop]" #default="scope">
          <slot :name="col.prop" v-bind="scope" />
        </template>
      </el-table-column>
    </el-table>
    <!-- Pagination is only displayed if the total amount of data is greater than the page size -->
    <el-pagination 
    v-if="props.data.length > pageSize"
    :current-page="currentPage"
    :page-size="pageSize"
    :total="props.data.length"
    @current-change="currentPage = $event"
    layout="prev, pager, next" />

  </div>
</template>

<style scoped>
.quick-table-wrapper {
  position: relative;
  margin: var(--spacing);
}

.sticky-header {
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}
</style>
