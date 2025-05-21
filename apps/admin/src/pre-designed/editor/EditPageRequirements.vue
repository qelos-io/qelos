<script setup lang="ts">
import { capitalize, computed, ref, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { getPlural } from '@/modules/core/utils/texts';
import { useDispatcher } from '@/modules/core/composables/useDispatcher';

// Import requirement type components
import BlueprintRequirement from './components/BlueprintRequirement.vue';
import CrudRequirement from './components/CrudRequirement.vue';
import DataRequirement from './components/DataRequirement.vue';
import HttpRequirement from './components/HttpRequirement.vue';

const editorMode = ref(false);
const activeTab = ref('all');

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
    model.value = JSON.parse(modelString.value);
  }
}

function addRequirement() {
  const newRequirement = { key: '' };
  
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

function getBlueprintInstructionsCode(row) {
  if (row.fromBlueprint && row.fromBlueprint.name) {
    const blueprintName = capitalize(row.fromBlueprint.name);
    const texts = [
      `<strong>{{${row.key}.result}}</strong> will be ${row.fromBlueprint.identifier ? ('a ' + blueprintName + ' entity') : 'an array of ' + getPlural(blueprintName) + ' entities'}`,
      `<strong>{{${row.key}.loading}}</strong> and <strong>{{${row.key}.loaded}}</strong> can help you distinguish rather the API call is loading or loaded.`
    ]
    return texts.join('<br>')
  }
}

function getHttpInstructionsCode(row) {
  if (row.fromHTTP) {
    const texts = [
      `<strong>{{${row.key}.result}}</strong> will be the response of the HTTP request`,
      `<strong>{{${row.key}.loading}}</strong> and <strong>{{${row.key}.loaded}}</strong> can help you distinguish rather the API call is loading or loaded.`
    ]
    return texts.join('<br>')
  }
}

</script>

<template>
  <div class="requirements-header">
    <div class="header-actions">
      <div class="filter-buttons">
        <el-button-group>
          <el-button 
            v-for="tab in requirementTabs" 
            :key="tab.value" 
            :type="activeTab === tab.value ? 'primary' : 'default'"
            @click="activeTab = tab.value"
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
          <el-button @click="toggleEditorMode">
            <el-icon>
              <font-awesome-icon :icon="['fas', 'code']"/>
            </el-icon>
            <span>{{ $t('Toggle Code Editor') }}</span>
          </el-button>
          <el-button @click="addRequirement">
            <el-icon>
              <font-awesome-icon :icon="['fas', 'plus']"/>
            </el-icon>
            <span>{{ $t('Add Requirement') }}</span>
          </el-button>
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
    <BlockItem v-for="(row, index) in filteredRequirements" :key="index">
      <template #header>
        <el-input required v-model="row.key" :placeholder="$t('Key')"/>
      </template>
      <template #default>
        <FormInput type="select" title="Requirement Type" :model-value="getRowType(row)"
                   @update:model-value="updateRowType(row, $event)">
          <template #options>
            <el-option value="fromBlueprint" :label="$t('Blueprint')"/>
            <el-option value="fromCrud" :label="$t('CRUD')"/>
            <el-option value="fromData" :label="$t('Data')"/>
            <el-option value="fromHTTP" :label="$t('HTTP')"/>
          </template>
        </FormInput>
        <div>
          <BlueprintRequirement 
            v-if="row.fromBlueprint" 
            :model-value="row" 
            :json="json" 
            :get-requirement-result="getRequirementResult" 
            :update-row-JSON="updateRowJSON" 
            :clear-if-empty="clearIfEmpty" 
            :get-blueprint-instructions-code="getBlueprintInstructionsCode"
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
            :update-row-JSON="updateRowJSON"
          />
          
          <HttpRequirement 
            v-if="row.fromHTTP" 
            :model-value="row" 
            :json="json" 
            :get-requirement-result="getRequirementResult" 
            :update-row-JSON="updateRowJSON" 
            :clear-if-empty="clearIfEmpty" 
            :get-http-instructions-code="getHttpInstructionsCode"
          />
        </div>
      </template>
      <template #actions>
        <RemoveButton wide @click="model.splice(model.indexOf(row), 1)"/>
      </template>
    </BlockItem>
  </div>
</template>
<style scoped>
.requirements-header {
  margin-bottom: 1rem;
  margin-left: 1rem;
  margin-right: 1rem;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.right-actions {
  display: flex;
  align-items: center;
}

.filter-buttons {
  display: flex;
  align-items: center;
}

.filter-buttons .el-button:not(.el-button--primary):hover {
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
  margin-left: 6px;
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
}

.requirements-container {
  margin: 0 1rem;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
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
</style>
