<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { ElMessage } from 'element-plus';

// Import requirement type components
import BlueprintRequirement from './components/BlueprintRequirement.vue';
import CrudRequirement from './components/CrudRequirement.vue';
import DataRequirement from './components/DataRequirement.vue';
import HttpRequirement from './components/HttpRequirement.vue';

const editorMode = ref(false);
const activeTab = ref('all');
const expandedItems = ref<number[]>([]);
const draggedItem = ref<number | null>(null);
const dropTarget = ref<number | null>(null);

const model = defineModel<any[]>();

const modelString = ref(json(model.value));

watch(model.value, () => {
  modelString.value = json(model.value);
}, { deep: true });

// Mock function to simulate fetching results for display
const getRequirementResult = (row) => {
  const type = getRowType(row);
  let mockResult;
  
  if (type === 'fromBlueprint') {
    mockResult = {
      result: row.fromBlueprint.identifier ? { id: 'entity-123', name: 'Sample Entity' } : [{ id: 'entity-123', name: 'Sample Entity 1' }, { id: 'entity-456', name: 'Sample Entity 2' }],
      loading: false,
      loaded: true,
      retry: () => console.log('Retrying blueprint fetch')
    };
  } else if (type === 'fromCrud') {
    mockResult = {
      result: [{ id: 'crud-123', name: 'CRUD Item 1' }, { id: 'crud-456', name: 'CRUD Item 2' }],
      loading: false,
      loaded: true,
      retry: () => console.log('Retrying CRUD fetch')
    };
  } else if (type === 'fromHTTP') {
    mockResult = {
      result: { data: { id: 'http-123', status: 'success', message: 'Data fetched successfully' } },
      loading: false,
      loaded: true,
      retry: () => console.log('Retrying HTTP fetch')
    };
  } else if (type === 'fromData') {
    mockResult = row.fromData;
  }
  
  return mockResult;
};

const typeCounts = computed(() => {
  const counts = {
    fromBlueprint: 0,
    fromCrud: 0,
    fromData: 0,
    fromHTTP: 0
  };
  
  model.value.forEach(row => {
    const type = getRowType(row);
    if (type) counts[type]++;
  });
  
  return counts;
});

const requirementTabs = computed(() => [
  { value: 'all', label: 'All', count: model.value.length },
  { value: 'fromBlueprint', label: 'Blueprint', count: typeCounts.value.fromBlueprint },
  { value: 'fromCrud', label: 'CRUD', count: typeCounts.value.fromCrud },
  { value: 'fromData', label: 'Data', count: typeCounts.value.fromData },
  { value: 'fromHTTP', label: 'HTTP', count: typeCounts.value.fromHTTP }
]);

function getTabIcon(tabValue) {
  switch (tabValue) {
    case 'fromBlueprint': return ['fas', 'database'];
    case 'fromCrud': return ['fas', 'sitemap'];
    case 'fromData': return ['fas', 'file-alt'];
    case 'fromHTTP': return ['fas', 'globe'];
    default: return ['fas', 'list'];
  }
}

const filteredRequirements = computed(() => {
  if (activeTab.value === 'all') {
    return model.value;
  }
  return model.value.filter(row => getRowType(row) === activeTab.value);
});

function toggleEditorMode() {
  editorMode.value = !editorMode.value;
  if (editorMode.value) {
    modelString.value = json(model.value);
  } else {
    try {
      model.value = JSON.parse(modelString.value);
    } catch (e) {
      ElMessage.error('Invalid JSON format');
      editorMode.value = true;
    }
  }
}

function toggleItemExpansion(index: number) {
  const idx = expandedItems.value.indexOf(index);
  if (idx === -1) {
    expandedItems.value.push(index);
  } else {
    expandedItems.value.splice(idx, 1);
  }
}

function isItemExpanded(index: number) {
  return expandedItems.value.includes(index);
}

function handleDragStart(index: number) {
  draggedItem.value = index;
}

function handleDragOver(index: number) {
  if (draggedItem.value !== null && draggedItem.value !== index) {
    dropTarget.value = index;
  }
}

function handleDrop() {
  if (draggedItem.value !== null && dropTarget.value !== null) {
    const itemToMove = model.value[draggedItem.value];
    model.value.splice(draggedItem.value, 1);
    model.value.splice(dropTarget.value, 0, itemToMove);
    
    // Update expanded items indices if needed
    const newExpandedItems = expandedItems.value.map(idx => {
      if (idx === draggedItem.value) return dropTarget.value;
      if (idx > draggedItem.value && idx <= dropTarget.value) return idx - 1;
      if (idx < draggedItem.value && idx >= dropTarget.value) return idx + 1;
      return idx;
    });
    expandedItems.value = newExpandedItems;
  }
  
  draggedItem.value = null;
  dropTarget.value = null;
}

function addRequirement() {
  const newRequirement: any = { key: '' };
  
  // Use the filtered type if it's not 'all'
  if (activeTab.value !== 'all') {
    switch (activeTab.value) {
      case 'fromBlueprint':
        newRequirement.fromBlueprint = { name: '' };
        break;
      case 'fromCrud':
        newRequirement.fromCrud = { name: '' };
        break;
      case 'fromData':
        newRequirement.fromData = {};
        break;
      case 'fromHTTP':
        newRequirement.fromHTTP = { uri: '' };
        break;
    }
  } else {
    // Default to Blueprint if no filter is selected
    newRequirement.fromBlueprint = { name: '' };
  }
  
  model.value.push(newRequirement);
}

function getRowType(row: any) {
  if (row.fromBlueprint) {
    return 'fromBlueprint';
  }
  if (row.fromCrud) {
    return 'fromCrud';
  }
  if (row.fromData) {
    return 'fromData';
  }
  if (row.fromHTTP) {
    return 'fromHTTP';
  }
  return ''
}

function updateRowType(row: any, type: string) {
  const data = row[getRowType(row)];
  delete row[getRowType(row)]

  row[type] = data;
}

function json(obj: any) {
  return JSON.stringify(obj, null, 2)
}

function updateRowJSON(row: any, key: string, value: string) {
  try {
    row[key] = JSON.parse(value);
  } catch {
    //
  }
}

function clearIfEmpty($event: any, obj: any, key: string) {
  if ($event === '') {
    delete obj[key];
  }
}

</script>

<template>
  <div class="requirements-header">
    <div class="header-actions">
      <div v-if="!editorMode" class="filter-buttons">
        <el-button-group>
          <el-button 
            v-for="tab in requirementTabs" 
            :key="tab.value" 
            :type="activeTab === tab.value ? 'primary' : 'default'"
            @click="activeTab = tab.value"
            size="small"
          >
            <el-icon v-if="tab.value !== 'all'">
              <font-awesome-icon :icon="getTabIcon(tab.value)" />
            </el-icon>
            <span>{{ $t(tab.label) }} <span class="counter-badge">{{ tab.count }}</span></span>
          </el-button>
        </el-button-group>
      </div>
      
      <div class="right-actions">
        <el-button-group>
          <el-tooltip :content="$t('Toggle between visual editor and JSON editor')" placement="top">
            <el-button @click="toggleEditorMode" size="small" :type="editorMode ? 'primary' : 'default'">
              <el-icon>
                <font-awesome-icon :icon="['fas', 'code']"/>
              </el-icon>
              <span>{{ $t('Code Editor') }}</span>
            </el-button>
          </el-tooltip>
          <el-tooltip :content="$t('Add a new requirement')" placement="top">
            <el-button @click="addRequirement" size="small" type="primary">
              <el-icon>
                <font-awesome-icon :icon="['fas', 'plus']"/>
              </el-icon>
              <span>{{ $t('Add Requirement') }}</span>
            </el-button>
          </el-tooltip>
        </el-button-group>
      </div>
    </div>
  </div>
  
  <div v-if="editorMode" class="editor-container">
    <Monaco ref="requirementsEditor"
            v-model="modelString"
            language="json"
            style="min-height:65vh; width:100%;"/>
  </div>
  <div v-else class="flex-1 requirements-container">
    <div v-if="filteredRequirements.length === 0" class="empty-state">
      <el-empty :description="$t('No requirements found')">
        <el-button type="primary" @click="addRequirement">
          {{ $t('Add Requirement') }}
        </el-button>
      </el-empty>
    </div>
    <TransitionGroup name="requirement-list" tag="div" class="requirements-list">
      <BlockItem 
        v-for="(row, index) in filteredRequirements" 
        :key="index"
        class="requirement-item"
        :class="{
          'is-dragging': draggedItem === index,
          'is-drop-target': dropTarget === index,
          'is-expanded': isItemExpanded(index)
        }"
        draggable="true"
        @dragstart="handleDragStart(index)"
        @dragover.prevent="handleDragOver(index)"
        @dragend="handleDrop()"
        @drop.prevent="handleDrop()"
      >
        <template #header>
          <div class="requirement-header">
            <div class="drag-handle">
              <el-icon><font-awesome-icon :icon="['fas', 'grip-lines']" /></el-icon>
            </div>
            <el-input 
              required 
              v-model="row.key" 
              :placeholder="$t('Key')"
              size="small"
              class="key-input"
            />
            <div class="requirement-type-badge" :class="getRowType(row)">
              <el-icon>
                <font-awesome-icon :icon="getTabIcon(getRowType(row))" />
              </el-icon>
              <span>{{ $t(getRowType(row).replace('from', '')) }}</span>
            </div>
            <div class="expand-toggle" @click.stop="toggleItemExpansion(index)">
              <el-icon>
                <font-awesome-icon :icon="isItemExpanded(index) ? ['fas', 'chevron-up'] : ['fas', 'chevron-down']" />
              </el-icon>
            </div>
          </div>
        </template>
        <template #default>
          <div v-show="isItemExpanded(index)">
            <div class="requirement-type-select">
              <div class="form-label">{{ $t('Requirement Type') }}</div>
              <el-select :model-value="getRowType(row)" @change="updateRowType(row, $event)" class="w-full" size="small">
                <el-option value="fromBlueprint" :label="$t('Blueprint')">
                  <div class="select-option-with-icon">
                    <el-icon>
                      <font-awesome-icon :icon="getTabIcon('fromBlueprint')" />
                    </el-icon>
                    <span>{{ $t('Blueprint') }}</span>
                  </div>
                </el-option>
                <el-option value="fromCrud" :label="$t('CRUD')">
                  <div class="select-option-with-icon">
                    <el-icon>
                      <font-awesome-icon :icon="getTabIcon('fromCrud')" />
                    </el-icon>
                    <span>{{ $t('CRUD') }}</span>
                  </div>
                </el-option>
                <el-option value="fromData" :label="$t('Data')">
                  <div class="select-option-with-icon">
                    <el-icon>
                      <font-awesome-icon :icon="getTabIcon('fromData')" />
                    </el-icon>
                    <span>{{ $t('Data') }}</span>
                  </div>
                </el-option>
                <el-option value="fromHTTP" :label="$t('HTTP')">
                  <div class="select-option-with-icon">
                    <el-icon>
                      <font-awesome-icon :icon="getTabIcon('fromHTTP')" />
                    </el-icon>
                    <span>{{ $t('HTTP') }}</span>
                  </div>
                </el-option>
              </el-select>
            </div>
            <div>
              <BlueprintRequirement 
                v-if="row.fromBlueprint" 
                :model-value="row" 
                :json="json" 
                :get-requirement-result="getRequirementResult" 
                :update-row-json="updateRowJSON" 
                :clear-if-empty="clearIfEmpty" 
              />
              
              <CrudRequirement 
                v-if="row.fromCrud" 
                :model-value="row" 
                :json="json" 
                :get-requirement-result="getRequirementResult" 
                :clear-if-empty="clearIfEmpty"
              />
              
              <DataRequirement 
                v-if="row.fromData" 
                :model-value="row" 
                :json="json" 
                :get-requirement-result="getRequirementResult" 
                :update-row-json="updateRowJSON"
              />
              
              <HttpRequirement 
                v-if="row.fromHTTP" 
                :model-value="row" 
                :json="json" 
                :get-requirement-result="getRequirementResult" 
                :update-row-json="updateRowJSON" 
                :clear-if-empty="clearIfEmpty" 
              />
            </div>
          </div>
          <div v-show="!isItemExpanded(index)" class="requirement-summary">
            <div class="requirement-preview">
              <span class="preview-label">{{ $t('Type') }}:</span> 
              <span class="preview-value">{{ $t(getRowType(row).replace('from', '')) }}</span>
              
              <template v-if="row.fromBlueprint && row.fromBlueprint.name">
                <span class="preview-separator">|</span>
                <span class="preview-label">{{ $t('Blueprint') }}:</span> 
                <span class="preview-value">{{ row.fromBlueprint.name }}</span>
              </template>
              
              <template v-if="row.fromHTTP && row.fromHTTP.uri">
                <span class="preview-separator">|</span>
                <span class="preview-label">{{ $t('URL') }}:</span> 
                <span class="preview-value">{{ row.fromHTTP.uri }}</span>
              </template>
              
              <template v-if="row.fromCrud && row.fromCrud.name">
                <span class="preview-separator">|</span>
                <span class="preview-label">{{ $t('CRUD') }}:</span> 
                <span class="preview-value">{{ row.fromCrud.name }}</span>
              </template>
            </div>
          </div>
        </template>
        <template #actions>
          <RemoveButton wide @click="model.splice(model.indexOf(row), 1)"/>
        </template>
      </BlockItem>
    </TransitionGroup>
  </div>
</template>
<style scoped>
.requirements-header {
  margin-bottom: 1rem;
  margin-inline-start: 1rem;
  margin-inline-end: 1rem;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
}

.filter-buttons {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

.right-actions {
  display: flex;
  align-items: center;
  margin-inline-start: auto;
}

.filter-buttons .el-button:not(.el-button--primary):hover,
.right-actions .el-button:not(.el-button--primary):hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-7);
  background-color: var(--el-color-primary-light-9);
}

.counter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  margin-inline-start: 6px;
  font-size: 12px;
  line-height: 1;
  border-radius: 10px;
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info-dark-2);
  font-weight: 600;
}

.el-button--primary .counter-badge {
  background-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.editor-container {
  margin: 0 1rem;
  width: auto;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 1rem;
  background-color: var(--el-fill-color-light);
}

.requirements-container {
  margin: 0 1rem;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  margin-bottom: 1rem;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.requirement-item {
  transition: all 0.3s ease;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.requirement-item.is-dragging {
  opacity: 0.5;
  transform: scale(0.98);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.requirement-item.is-drop-target {
  border: 1px dashed var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.requirement-item.is-expanded {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.requirement-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.drag-handle {
  cursor: grab;
  color: var(--el-text-color-secondary);
  padding: 0.25rem;
  border-radius: 4px;
}

.drag-handle:hover {
  background-color: var(--el-fill-color);
}

.key-input {
  flex: 1;
}

.requirement-type-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.requirement-type-badge.fromBlueprint {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary-dark-2);
}

.requirement-type-badge.fromCrud {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success-dark-2);
}

.requirement-type-badge.fromData {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
}

.requirement-type-badge.fromHTTP {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info-dark-2);
}

.expand-toggle {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  padding: 0.25rem;
  border-radius: 4px;
}

.expand-toggle:hover {
  background-color: var(--el-fill-color);
}

.requirement-type-select {
  margin-bottom: 1rem;
}

.form-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  margin-bottom: 8px;
}

.w-full {
  width: 100%;
}

.select-option-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-option-with-icon .el-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.requirement-summary {
  padding: 0.5rem 0;
}

.requirement-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 13px;
}

.preview-label {
  color: var(--el-text-color-secondary);
  font-weight: 600;
}

.preview-value {
  color: var(--el-text-color-primary);
}

.preview-separator {
  color: var(--el-text-color-placeholder);
  margin: 0 0.25rem;
}

.result-preview-details {
  margin-top: 1rem;
  margin-inline-start: 0;
}

.result-preview-details > summary {
  font-weight: bold;
  cursor: pointer;
  user-select: none;
  padding: 0.5rem 0;
}

.result-preview {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  margin-top: 0.5rem;
}

.result-preview-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}

.result-preview-content {
  max-height: 200px;
  overflow: auto;
}

details {
  margin-inline-start: 20px;

  &[open] > summary {
    list-style-type: disclosure-open;
  }

  > summary {
    list-style-type: disclosure-closed;
    user-select: none;
  }
}

/* Transition animations */
.requirement-list-enter-active,
.requirement-list-leave-active {
  transition: all 0.3s ease;
}

.requirement-list-enter-from,
.requirement-list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.requirement-list-move {
  transition: transform 0.5s ease;
}
</style>
