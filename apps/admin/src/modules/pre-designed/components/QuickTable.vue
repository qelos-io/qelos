<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, VNode } from 'vue';
import ErrorBoundary from '@/modules/core/components/layout/ErrorBoundary.vue';
import { ElMessageBox } from 'element-plus';
import type { TableColumnCtx } from 'element-plus/es/components/table/src/table-column/defaults';
import { get, set } from 'lodash-es';

const emit = defineEmits(['row-click', 'sort-change', 'filter-change', 'selection-change', 'row-contextmenu', 'action', 'cell-change', 'link-click', 'refresh']);

const props = defineProps<{
  data: any[],
  columns: Array<{
    prop: string,
    label: string,
    width?: string | number,
    minWidth?: string | number,
    fixed?: boolean | string,
    sortable?: boolean | string,
    filterable?: boolean,
    editable?: boolean,
    filters?: Array<{ text: string, value: any }>,
    filterMethod?: (value: any, row: any) => boolean,
    formatter?: (row: any, column: TableColumnCtx<any>, cellValue: any, index: number) => string | VNode,
    align?: 'left' | 'center' | 'right',
    headerAlign?: 'left' | 'center' | 'right',
    className?: string,
    type?: 'selection' | 'expand' | 'index' | 'date' | 'datetime' | 'boolean' | 'status' | 'actions' | 'image' | 'tags' | 'link' | 'number' | 'currency' | 'percent' | 'file' | '',
    tag?: string,
    renderHeader?: (h: any, params: { column: TableColumnCtx<any>, $index: number }) => VNode,
    resizable?: boolean,
    showOverflowTooltip?: boolean
  }>,
  pageSize?: number,
  loading?: boolean,
  emptyText?: string,
  stripe?: boolean,
  highlightCurrentRow?: boolean,
  rowClassName?: string | ((params: { row: any, rowIndex: number }) => string),
  headerRowClassName?: string | ((params: { row: any, rowIndex: number }) => string),
  showSelection?: boolean,
  selectionType?: 'single' | 'multiple',
  showPagination?: boolean,
  showToolbar?: boolean,
  showExport?: boolean,
  showRefresh?: boolean,
  showColumnCustomizer?: boolean,
  height?: string | number,
  maxHeight?: string | number,
  rowKey?: string | ((row: any) => string),
  defaultSort?: { prop: string, order: 'ascending' | 'descending' },
  summaryMethod?: (param: { columns: TableColumnCtx<any>[], data: any[] }) => string[],
  showSummary?: boolean,
  sumText?: string,
  treeProps?: { children: string, hasChildren: string },
  expandRowKeys?: string[],
  defaultExpandAll?: boolean
}>()

// Table reference for methods access
const tableRef = ref<InstanceType<typeof import('element-plus').ElTable> | null>(null);

// Selected rows
const selectedRows = ref<any[]>([]);

// Visible columns control
const visibleColumns = ref<string[]>([]);

// Pagination state
const currentPage = ref(1);
const defaultPageSize = 50;
const pageSizeOptions = [10, 20, 50, 100];
const currentPageSize = ref(props.pageSize || defaultPageSize);

// Sorting state
const sortBy = ref(props.defaultSort?.prop || '');
const sortOrder = ref(props.defaultSort?.order || '');

// Filtering state
const activeFilters = ref<Record<string, any>>({});
const searchQuery = ref('');

// Column customization
const columnSettingsVisible = ref(false);

// Initialize visible columns
onMounted(() => {
  visibleColumns.value = props.columns.map(col => col.prop);
  
  // Apply default sort if provided
  if (props.defaultSort) {
    nextTick(() => {
      tableRef.value?.sort(props.defaultSort.prop, props.defaultSort.order);
    });
  }
});

// Reset pagination when data changes
watch(() => props.data, () => {
  currentPage.value = 1;
  // Clear selection when data changes
  if (tableRef.value) {
    tableRef.value.clearSelection();
  }
});

// Handle selection change
const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection;
  emit('selection-change', selection);
};

// Handle row context menu
const handleContextMenu = (row: any, column: any, event: MouseEvent) => {
  event.preventDefault();
  emit('row-contextmenu', { row, column, event });
};

// Toggle column visibility
const toggleColumnVisibility = (prop: string) => {
  const index = visibleColumns.value.indexOf(prop);
  if (index > -1) {
    visibleColumns.value.splice(index, 1);
  } else {
    visibleColumns.value.push(prop);
  }
};

// Refresh data
const refreshData = () => {
  emit('refresh');
};

// Handle sort change
const handleSortChange = (column: { prop: string, order: string | null }) => {
  sortBy.value = column.prop;
  sortOrder.value = column.order || '';
  emit('sort-change', { prop: column.prop, order: column.order });
};

// Handle filter change
const handleFilterChange = (filters: Record<string, any>) => {
  activeFilters.value = filters;
  emit('filter-change', filters);
};

// Handle search input
const handleSearch = () => {
  // Reset to first page when searching
  currentPage.value = 1;
};

// Handle page size change
const handleSizeChange = (size: number) => {
  currentPageSize.value = size;
  // Reset to first page when changing page size
  currentPage.value = 1;
};

// Apply local sorting if no external handler
const sortedData = computed(() => {
  if (!sortBy.value || !sortOrder.value) return props.data;
  
  return [...props.data].sort((a, b) => {
    const aValue = a[sortBy.value];
    const bValue = b[sortBy.value];
    
    if (aValue === bValue) return 0;
    
    const result = aValue > bValue ? 1 : -1;
    return sortOrder.value === 'ascending' ? result : -result;
  });
});

// Apply local filtering if no external handler
const filteredData = computed(() => {
  let result = sortedData.value;
  
  // Apply column filters
  if (Object.keys(activeFilters.value).length > 0) {
    result = result.filter(row => {
      return Object.entries(activeFilters.value).every(([key, values]) => {
        if (!values || values.length === 0) return true;
        
        const column = props.columns.find(col => col.prop === key);
        if (column?.filterMethod) {
          return values.some((value: any) => column.filterMethod!(value, row));
        }
        
        return values.includes(row[key]);
      });
    });
  }
  
  // Apply global search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    result = result.filter(row => {
      return props.columns.some(column => {
        if (!column.filterable) return false;
        const value = row[column.prop];
        if (value == null) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  }
  
  return result;
});

// Computed data for current page
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * currentPageSize.value;
  const end = start + currentPageSize.value;
  return filteredData.value.slice(start, end);
});

// Total number of pages
const totalPages = computed(() => {
  return Math.ceil(filteredData.value.length / currentPageSize.value);
});

// Column settings dialog
const showColumnSettings = () => {
  columnSettingsVisible.value = true;
};

// Reset columns to default
const resetColumns = () => {
  visibleColumns.value = props.columns.map(col => col.prop);
};

// Helper functions for column types

// Status type helpers
const getStatusType = (value: any, statusMap?: Record<string, { type: string, label: string }>) => {
  if (!statusMap) return '';
  return statusMap[value]?.type || '';
};

const getStatusLabel = (value: any, statusMap?: Record<string, { type: string, label: string }>) => {
  if (!statusMap) return value;
  return statusMap[value]?.label || value;
};

// Number formatting
const formatNumber = (value: number, format?: string) => {
  if (value === null || value === undefined) return '';
  
  try {
    if (format) {
      // Simple format string like '0,0.00'
      const hasThousands = format.includes(',');
      const decimalPart = format.split('.')[1];
      const decimals = decimalPart ? decimalPart.length : 0;
      
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: hasThousands
      }).format(value);
    }
    
    return new Intl.NumberFormat().format(value);
  } catch (e) {
    console.error('Error formatting number:', e);
    return value.toString();
  }
};

// Currency formatting
const formatCurrency = (value: number, currencyCode = 'USD', locale = 'en-US') => {
  if (value === null || value === undefined) return '';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(value);
  } catch (e) {
    console.error('Error formatting currency:', e);
    return value.toString();
  }
};

// Format URL for display
const formatUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    // Remove protocol and trailing slash for display
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  } catch (e) {
    console.error('Error formatting URL:', e);
    return url;
  }
};

// Check if a file is an image based on its extension
const isImageFile = (fileUrl: string): boolean => {
  if (!fileUrl) return false;
  
  try {
    const extension = fileUrl.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(extension || '');
  } catch (e) {
    console.error('Error checking if file is an image:', e);
    return false;
  }
};

// Preview image in a larger view
const previewImage = (imageUrl: string) => {
  if (!imageUrl) return;
  
  // Use Element Plus's image preview functionality if available
  // or create a simple modal with the image
  try {
    // For Element Plus v2.x
    const imgInstance = ElMessageBox.alert('', {
      title: 'Image Preview',
      dangerouslyUseHTMLString: true,
      message: `<div style="text-align: center;"><img src="${imageUrl}" style="max-width: 100%; max-height: 70vh;" /></div>`,
      showCancelButton: false,
      confirmButtonText: 'Close',
      customClass: 'image-preview-dialog'
    });
    
    return imgInstance;
  } catch (e) {
    console.error('Error previewing image:', e);
    // Fallback to opening in a new tab
    window.open(imageUrl, '_blank');
  }
};

// Percentage formatting
const formatPercent = (value: number, decimals = 2) => {
  if (value === null || value === undefined) return '';
  
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch (e) {
    console.error('Error formatting percentage:', e);
    return value.toString();
  }
};
</script>
<template>
  <div class="quick-table-wrapper" :class="{ 'is-loading': props.loading }">
    <div class="quick-table-toolbar" v-if="props.showToolbar !== false">
      <div class="quick-table-search" v-if="props.columns?.some(col => col.filterable)">
        <el-input
          v-model="searchQuery"
          placeholder="Search..."
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon class="el-input__icon">
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M795.904 750.72l124.992 124.928a32 32 0 0 1-45.248 45.248L750.656 795.904a416 416 0 1 1 45.248-45.248zM480 832a352 352 0 1 0 0-704 352 352 0 0 0 0 704z"></path>
              </svg>
            </el-icon>
          </template>
        </el-input>
      </div>
      <div class="quick-table-actions">
        <el-tooltip content="Refresh data" placement="top" v-if="props.showRefresh !== false">
          <el-button
            type="primary"
            size="small"
            plain
            @click="refreshData"
            aria-label="Refresh table data"
          >
            <el-icon>
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M771.776 794.88A384 384 0 0 1 128 512h64a320 320 0 0 0 555.712 216.448H654.72a32 32 0 1 1 0-64h149.056a32 32 0 0 1 32 32v148.928a32 32 0 1 1-64 0v-50.56zM276.288 295.616h92.992a32 32 0 0 1 0 64H220.16a32 32 0 0 1-32-32V178.56a32 32 0 0 1 64 0v50.56A384 384 0 0 1 896.128 512h-64a320 320 0 0 0-555.776-216.384z"></path>
              </svg>
            </el-icon>
            <span>Refresh</span>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="Customize columns" placement="top" v-if="props.showColumnCustomizer !== false">
          <el-button
            type="primary"
            size="small"
            plain
            @click="showColumnSettings"
            aria-label="Customize table columns"
          >
            <el-icon>
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M160 448h704a32 32 0 0 1 32 32v32a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32v-32a32 32 0 0 1 32-32zm0-192h704a32 32 0 0 1 32 32v32a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32v-32a32 32 0 0 1 32-32zm0 384h704a32 32 0 0 1 32 32v32a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32v-32a32 32 0 0 1 32-32z"></path>
              </svg>
            </el-icon>
            <span>Columns</span>
          </el-button>
        </el-tooltip>
      </div>
    </div>
    
    <!-- Column Settings Dialog -->
    <el-dialog
      v-model="columnSettingsVisible"
      title="Customize Columns"
      width="400px"
      append-to-body
      destroy-on-close
    >
      <el-checkbox-group v-model="visibleColumns" class="column-settings-list">
        <el-checkbox
          v-for="col in props.columns"
          :key="col.prop"
          :label="col.prop"
          :disabled="col.type === 'selection'"
        >
          {{ col.label }}
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="columnSettingsVisible = false">Cancel</el-button>
          <el-button @click="resetColumns">Reset</el-button>
          <el-button type="primary" @click="columnSettingsVisible = false">Apply</el-button>
        </div>
      </template>
    </el-dialog>
    
    <ErrorBoundary>
      <el-table
        ref="tableRef"
        v-if="props.data && props.columns?.length"
        :data="paginatedData"
        :empty-text="props.emptyText || 'No data available'"
        :border="true"
        :stripe="props.stripe !== false"
        :highlight-current-row="props.highlightCurrentRow"
        :row-class-name="props.rowClassName"
        :header-row-class-name="props.headerRowClassName || 'table-header-row'"
        :max-height="props.maxHeight || 'calc(80vh - 120px)'"
        :height="props.height"
        :row-key="props.rowKey"
        :default-sort="props.defaultSort"
        :show-summary="props.showSummary"
        :summary-method="props.summaryMethod"
        :sum-text="props.sumText"
        :tree-props="props.treeProps"
        :expand-row-keys="props.expandRowKeys"
        :default-expand-all="props.defaultExpandAll"
        style="width: 100%"
        @row-click="$emit('row-click', $event)"
        @sort-change="handleSortChange"
        @filter-change="handleFilterChange"
        @selection-change="handleSelectionChange"
        @row-contextmenu="handleContextMenu"
        v-loading="props.loading"
        element-loading-text="Loading data..."
        element-loading-background="rgba(255, 255, 255, 0.8)"
      >
        <!-- Selection column if needed -->
        <el-table-column
          v-if="props.showSelection"
          type="selection"
          width="55"
          align="center"
          fixed="left"
        />
        
        <!-- Dynamic columns based on visible columns -->
        <el-table-column
          v-for="(col, index) in props.columns.filter(col => visibleColumns.includes(col.prop) || col.type === 'selection')"
          :key="col.prop || index"
          v-bind="col"
          :class-name="'column-' + col.prop"
          :align="col.align || 'left'"
          :header-align="col.headerAlign || col.align || 'left'"
          :show-overflow-tooltip="col.showOverflowTooltip !== false"
        >
          <template #default="scope">
            <!-- Custom slot if provided -->
            <slot v-if="$slots[col.prop]" :name="col.prop" v-bind="scope" />
            
            <!-- Pre-defined column types -->
            <template v-else>
              <!-- Date type - formats date strings -->
              <span v-if="col.type === 'date' && get(scope.row, col.prop)" class="column-date">
                {{ new Date(get(scope.row, col.prop)).toLocaleDateString() }}
              </span>
              
              <!-- Datetime type - formats date and time -->
              <span v-else-if="col.type === 'datetime' && get(scope.row, col.prop)" class="column-datetime">
                {{ new Date(get(scope.row, col.prop)).toLocaleString() }}
              </span>
              
              <!-- Boolean type - shows as toggle/checkbox -->
              <template v-else-if="col.type === 'boolean'">
                <el-switch 
                :model-value="get(scope.row, col.prop)"
                v-if="col.editable"
                @change="(val) => {
                  const updatedRow = { ...scope.row };
                  set(updatedRow, col.prop, val);
                  emit('cell-change', { row: updatedRow, prop: col.prop, value: val });
                }"
                class="column-boolean"
              />
              <span v-else><font-awesome-icon icon="fa-regular fa-circle-check" /></span>
              </template>              
              <!-- Status type - shows as badge/tag -->
              <el-tag 
                v-else-if="col.type === 'status'"
                :type="getStatusType(get(scope.row, col.prop), col.statusMap)"
                size="small"  
                class="column-status"
              >
                {{ getStatusLabel(get(scope.row, col.prop), col.statusMap) }}
              </el-tag>
              
              <!-- Actions type - shows action buttons -->
              <div v-else-if="col.type === 'actions'" class="column-actions">
                <el-tooltip v-if="col.showEdit !== false" content="Edit" placement="top">
                  <el-button
                    type="primary"
                    size="small"
                    circle
                    @click.stop="emit('action', { type: 'edit', row: scope.row })"
                  >
                    <el-icon><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M832 512a32 32 0 1 1 64 0v352a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32h352a32 32 0 0 1 0 64H192v640h640V512z"></path><path fill="currentColor" d="m469.952 554.24 52.8-7.552L847.104 222.4a32 32 0 1 0-45.248-45.248L477.44 501.44l-7.552 52.8zm422.4-422.4a96 96 0 0 1 0 135.808l-331.84 331.84a32 32 0 0 1-18.112 9.088L436.8 623.68a32 32 0 0 1-36.224-36.224l15.104-105.6a32 32 0 0 1 9.024-18.112l331.904-331.84a96 96 0 0 1 135.744 0z"></path></svg></el-icon>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip v-if="col.showDelete !== false" content="Delete" placement="top">
                  <el-button
                    type="danger"
                    size="small"
                    circle
                    @click.stop="emit('action', { type: 'delete', row: scope.row })"
                  >
                    <el-icon><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M160 256H96a32 32 0 0 1 0-64h256V95.936a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V192h256a32 32 0 1 1 0 64h-64v672a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32V256zm448-64v-64H416v64h192zM224 896h576V256H224v640zm192-128a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32zm192 0a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32z"></path></svg></el-icon>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip v-if="col.showView !== false" content="View" placement="top">
                  <el-button
                    type="info"
                    size="small"
                    circle
                    @click.stop="emit('action', { type: 'view', row: scope.row })"
                  >
                    <el-icon><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M512 160c320 0 512 352 512 352S832 864 512 864 0 512 0 512s192-352 512-352zm0 64c-225.28 0-384.128 208.064-436.8 288 52.608 79.872 211.456 288 436.8 288 225.28 0 384.128-208.064 436.8-288-52.608-79.872-211.456-288-436.8-288zm0 64a224 224 0 1 1 0 448 224 224 0 0 1 0-448zm0 64a160.192 160.192 0 0 0-160 160c0 88.192 71.744 160 160 160s160-71.808 160-160-71.744-160-160-160z"></path></svg></el-icon>
                  </el-button>
                </el-tooltip>
                
                <!-- Custom action buttons if provided -->
                <slot v-if="$slots[`${col.prop}-actions`]" :name="`${col.prop}-actions`" v-bind="scope" />
              </div>
              
              <!-- Image type - shows as thumbnail -->
              <div v-else-if="col.type === 'image'" class="column-image">
                <el-image
                  v-if="get(scope.row, col.prop)"
                  :src="get(scope.row, col.prop)"
                  :preview-src-list="[get(scope.row, col.prop)]"
                  fit="cover"
                  :style="{
                    width: col.imageWidth || '50px',
                    height: col.imageHeight || '50px',
                    borderRadius: col.imageRounded ? '4px' : '0'
                  }"
                />
                <div v-else class="image-placeholder"></div>
              </div>
              
              <!-- Tags type - shows as multiple tags -->
              <div v-else-if="col.type === 'tags' && Array.isArray(get(scope.row, col.prop))" class="column-tags">
                <el-tag
                  v-for="(tag, i) in get(scope.row, col.prop, [])"
                  :key="i"
                  size="small"
                  :type="col.tagType || ''"
                  :effect="col.tagEffect || 'light'"
                  class="tag-item"
                >
                  {{ tag }}
                </el-tag>
              </div>
              
              <!-- Link type - shows as clickable link -->
              <el-link
                v-else-if="col.type === 'link'"
                :type="col.linkType || 'primary'"
                :href="col.linkPrefix ? col.linkPrefix + get(scope.row, col.prop, '') : get(scope.row, col.prop, '')"
                :target="col.linkTarget || '_blank'"
                @click.stop="col.linkClick ? emit('link-click', { row: scope.row, prop: col.prop }) : null"
                class="column-link"
              >
                {{ col.linkLabel ? col.linkLabel : get(scope.row, col.prop, '') }}
              </el-link>
              
              <!-- Number type - formats numbers -->
              <span v-else-if="col.type === 'number'" class="column-number">
                {{ formatNumber(get(scope.row, col.prop), col.numberFormat) }}
              </span>
              
              <!-- Currency type - formats as currency -->
              <span v-else-if="col.type === 'currency'" class="column-currency">
                {{ formatCurrency(get(scope.row, col.prop), col.currencyCode, col.currencyLocale) }}
              </span>
              
              <!-- Percent type - formats as percentage -->
              <span v-else-if="col.type === 'percent'" class="column-percent">
                {{ formatPercent(get(scope.row, col.prop), col.percentDecimals) }}
              </span>
              
              <!-- File type - shows image or download link based on file extension -->
              <div v-else-if="col.type === 'file'" class="column-file">
                <template v-if="get(scope.row, col.prop)">
                  <img 
                    v-if="isImageFile(get(scope.row, col.prop))" 
                    :src="get(scope.row, col.prop)" 
                    :style="{
                      maxWidth: col.imageMaxWidth || '100px',
                      maxHeight: col.imageMaxHeight || 'auto',
                      borderRadius: col.imageRounded ? '4px' : '0'
                    }"
                    :alt="col.imageAlt || 'Image'"
                    class="file-image"
                    @click="col.imagePreview !== false ? previewImage(get(scope.row, col.prop)) : null"
                  />
                  <el-link 
                    v-else 
                    :href="get(scope.row, col.prop)" 
                    target="_blank"
                    class="file-download"
                    type="primary"
                  >
                    <el-icon class="el-icon--left">
                      <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M160 832h704a32 32 0 1 1 0 64H160a32 32 0 1 1 0-64zm384-253.696 236.288-236.352 45.248 45.248L508.8 704 192 387.2l45.248-45.248L480 584.704V128h64v450.304z"></path>
                      </svg>
                    </el-icon>
                    {{ col.downloadText || 'Download' }}
                  </el-link>
                </template>
                <span v-else class="file-empty">{{ col.emptyText || 'No file' }}</span>
              </div>
              
              <!-- Default - just show the value using lodash get for nested properties -->
              <span v-else>{{ get(scope.row, col.prop, '') }}</span>
            </template>
          </template>
        </el-table-column>
        
        <!-- Empty slot for custom columns -->
        <slot name="columns"></slot>
      </el-table>
      
      <!-- Skeleton loader when in loading state and no data -->
      <div v-else-if="props.loading" class="table-skeleton">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div v-for="j in 3" :key="j" class="skeleton-cell"></div>
        </div>
      </div>
      
      <!-- Empty state when no data and not loading -->
      <div v-else-if="!props.loading && (!props.data || !props.data.length)" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <p>{{ props.emptyText || 'No data available' }}</p>
      </div>
    </ErrorBoundary>
    
    <!-- Enhanced pagination with page size selection -->
    <div class="quick-table-pagination" v-if="props.showPagination !== false && props.data && props.data.length > 0">
      <el-pagination
        :current-page="currentPage"
        :page-size="currentPageSize"
        :page-sizes="pageSizeOptions"
        :total="filteredData.length"
        @current-change="currentPage = $event"
        @size-change="handleSizeChange"
        layout="total, sizes, prev, pager, next, jumper"
        background
        aria-label="Table pagination"
      />
    </div>
  </div>
</template>

<style scoped>
.quick-table-wrapper {
  position: relative;
  margin: var(--spacing);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  background-color: #fff;
  padding: 16px;
  transition: all 0.3s ease;
}

.quick-table-wrapper.is-loading {
  opacity: 0.7;
}

.quick-table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.quick-table-search {
  flex: 1;
  max-width: 300px;
}

.quick-table-actions {
  display: flex;
  gap: 8px;
}

.table-header-row th {
  position: sticky;
  top: 0;
  background: #f5f7fa;
  z-index: 10;
  font-weight: 600;
  color: #333;
  padding: 12px 8px;
  transition: background-color 0.2s;
}

.table-header-row th:hover {
  background-color: #ebeef5;
}

.quick-table-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* Skeleton loader styles */
.table-skeleton {
  width: 100%;
}

.skeleton-row {
  display: flex;
  margin-bottom: 12px;
}

.skeleton-cell {
  flex: 1;
  height: 24px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
  margin-right: 12px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty state styles */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #909399;
}

.empty-state svg {
  margin-bottom: 16px;
  color: #dcdfe6;
}

.empty-state p {
  font-size: 14px;
}

/* Column settings dialog */
.column-settings-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

/* Responsive styles */
@media (max-width: 768px) {
  .quick-table-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .quick-table-search {
    max-width: 100%;
  }
  
  .quick-table-pagination :deep(.el-pagination) {
    justify-content: center;
    flex-wrap: wrap;
  }
}

/* Table enhancements */
:deep(.el-table) {
  --el-table-border-color: #ebeef5;
  --el-table-header-bg-color: #f5f7fa;
  --el-table-row-hover-bg-color: #f5f7fa;
  border-radius: 4px;
  overflow: hidden;
}

:deep(.el-table__header) {
  font-weight: 600;
}

:deep(.el-table__row) {
  transition: background-color 0.2s;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
}

:deep(.el-table__row.current-row) {
  background-color: #ecf5ff !important;
}

:deep(.el-table__row.success-row) {
  background-color: #f0f9eb;
}

:deep(.el-table__row.warning-row) {
  background-color: #fdf6ec;
}

:deep(.el-table__row.danger-row) {
  background-color: #fef0f0;
}

:deep(.el-table__row.info-row) {
  background-color: #f4f4f5;
}

/* Improve focus states for accessibility */
:deep(.el-table__row:focus),
:deep(.el-table__row:focus-within) {
  outline: 2px solid var(--el-color-primary, #409eff);
  outline-offset: -2px;
}

:deep(.el-pagination) {
  --el-pagination-button-disabled-bg-color: #f5f7fa;
  --el-pagination-hover-color: var(--el-color-primary);
}

:deep(.el-input__wrapper) {
  border-radius: 4px;
}

/* Column type specific styles */
.column-date,
.column-datetime {
  white-space: nowrap;
}

.column-boolean {
  display: flex;
  justify-content: center;
}

.column-status {
  display: inline-block;
}

.column-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.column-image {
  display: flex;
  justify-content: center;
}

.image-placeholder {
  width: 50px;
  height: 50px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.column-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-item {
  margin-right: 0;
}

.column-link {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.column-number,
.column-currency,
.column-percent {
  font-variant-numeric: tabular-nums;
  text-align: right;
  display: block;
}

/* File column styles */
.column-file {
  display: flex;
  justify-content: center;
  align-items: center;
}

.file-image {
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid #ebeef5;
}

.file-image:hover {
  transform: scale(1.05);
}

.file-download {
  display: inline-flex;
  align-items: center;
}

.file-empty {
  color: #909399;
  font-style: italic;
  font-size: 0.9em;
}

/* Image preview dialog */
:deep(.image-preview-dialog) {
  max-width: 90vw;
}

:deep(.image-preview-dialog .el-message-box__message) {
  overflow: auto;
  max-height: 80vh;
}
</style>
