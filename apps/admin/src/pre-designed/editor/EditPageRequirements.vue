<script setup lang="ts">
import { capitalize, computed, ref, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import BlueprintSelector from '@/modules/no-code/components/BlueprintSelector.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { getPlural } from '@/modules/core/utils/texts';
import { useDispatcher } from '@/modules/core/composables/useDispatcher';

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

const requirementTabs = computed(() => [
  { value: 'all', label: 'All' },
  { value: 'fromBlueprint', label: 'Blueprint' },
  { value: 'fromCrud', label: 'CRUD' },
  { value: 'fromData', label: 'Data' },
  { value: 'fromHTTP', label: 'HTTP' }
]);

function getTabIcon(tabValue) {
  switch (tabValue) {
    case 'fromBlueprint': return ['fas', 'sitemap'];
    case 'fromCrud': return ['fas', 'database'];
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
            <span>{{ $t(tab.label) }}</span>
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
  
  <Monaco v-if="editorMode" ref="requirementsEditor"
          v-model="modelString"
          language="json"
          style="min-height:65vh; margin: 0 1rem;"/>
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
          <div v-if="row.fromBlueprint">
            <FormRowGroup>
              <BlueprintSelector v-model="row.fromBlueprint.name"/>
              <FormInput v-model="row.fromBlueprint.identifier" title="Entity Identifier"
                         placeholder="Try to use: {{identifier}} for dynamic route param"
                         @update:model-value="clearIfEmpty($event, row.fromBlueprint, 'identifier')"/>
            </FormRowGroup>
            <div class="checkbox-group">
              <el-switch v-model="row.lazy" :active-text="$t('Lazy')" />
              <el-switch 
                :model-value="row.fromBlueprint.query?.$populate"
                :active-text="$t('Populate References')"
                @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $populate: $event ? true : undefined }"
              />
              <el-switch 
                :model-value="!!row.fromBlueprint.query?.$limit"
                :active-text="$t('Limit # Documents')"
                @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $limit: $event ? 100 : undefined }"
              />
              <el-switch 
                :model-value="!!row.fromBlueprint.query?.$page"
                :active-text="$t('Page')"
                @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $page: $event ? '{{query.page}}' : undefined }"
              />
            </div>
            <el-form-item :label="$t('Query Params')">
              <Monaco :model-value="json(row.fromBlueprint.query) || '{}'"
                      style="max-height:200px;"
                      @update:model-value="updateRowJSON(row.fromBlueprint, 'query', $event);"/>
            </el-form-item>
            <details>
              <summary>
                {{ $t('Usage Instructions') }}
              </summary>
              <p>
                {{ $t('You can use the following variables in your template:') }}
                <br>
                <i v-html="getBlueprintInstructionsCode(row)"></i>
              </p>
            </details>
            
            <details class="result-preview-details">
              <summary>{{ $t('Result Preview') }}</summary>
              <div class="result-preview">
                <div class="result-preview-header">
                  <el-button size="small" type="primary" @click="getRequirementResult(row).retry()">{{ $t('Retry') }}</el-button>
                </div>
                <div class="result-preview-content">
                  <pre>{{ json(getRequirementResult(row)) }}</pre>
                </div>
              </div>
            </details>
          </div>
          <div v-if="row.fromCrud">
            <FormRowGroup>
              <el-form-item :label="$t('CRUD Name')" required>
                <el-select v-model="row.fromCrud.name">
                  <el-option :label="$t('Configurations')" value="configurations"/>
                  <el-option :label="$t('Blocks')" value="blocks"/>
                  <el-option :label="$t('Blueprints')" value="blueprints"/>
                  <el-option :label="$t('Invites')" value="invites"/>
                  <el-option :label="$t('Plugins')" value="plugins"/>
                  <el-option :label="$t('Storages')" value="storages"/>
                  <el-option :label="$t('Users')" value="users"/>
                  <el-option :label="$t('Workspaces')" value="workspaces"/>
                </el-select>
              </el-form-item>
              <FormInput v-model="row.fromCrud.identifier" title="Identifier"
                         placeholder="Try to use: {{identifier}} for dynamic route param"
                         @update:model-value="clearIfEmpty($event, row.fromCrud, 'identifier')"/>
            </FormRowGroup>
            <div class="checkbox-group">
              <el-switch v-model="row.lazy" :active-text="$t('Lazy')" />
            </div>
            
            <details class="result-preview-details">
              <summary>{{ $t('Result Preview') }}</summary>
              <div class="result-preview">
                <div class="result-preview-header">
                  <el-button size="small" type="primary" @click="getRequirementResult(row).retry()">{{ $t('Retry') }}</el-button>
                </div>
                <div class="result-preview-content">
                  <pre>{{ json(getRequirementResult(row)) }}</pre>
                </div>
              </div>
            </details>
          </div>
          <div v-if="row.fromData">
            <el-form-item :label="$t('Data')">
              <Monaco :model-value="json(row.fromData) || '{}'"
                      style="max-height:350px;"
                      @update:model-value="updateRowJSON(row, 'fromData', $event)"/>
            </el-form-item>
            
            <details class="result-preview-details">
              <summary>{{ $t('Result Preview') }}</summary>
              <div class="result-preview">
                <div class="result-preview-content">
                  <pre>{{ json(getRequirementResult(row)) }}</pre>
                </div>
              </div>
            </details>
          </div>
          <div v-if="row.fromHTTP">
            <FormRowGroup>
              <FormInput v-model="row.fromHTTP.method" title="Method" placeholder="GET"
                         @update:model-value="clearIfEmpty($event, row.fromHTTP, 'method')"/>
              <FormInput v-model="row.fromHTTP.uri" title="URL" placeholder="https://example.com/api" required/>
            </FormRowGroup>
            <div class="checkbox-group">
              <el-switch v-model="row.lazy" :active-text="$t('Lazy')" />
            </div>
            <el-form-item :label="$t('Query Params')">
              <Monaco :model-value="json(row.fromHTTP.query) || '{}'"
                      style="max-height:200px;"
                      @update:model-value="updateRowJSON(row.fromHTTP, 'query', $event);"/>
            </el-form-item>
            <details>
              <summary>
                {{ $t('Usage Instructions') }}
              </summary>
              <p>
                {{ $t('You can use the following variables in your template:') }}
                <br>
                <i v-html="getHttpInstructionsCode(row)"></i>
              </p>
            </details>
            
            <details class="result-preview-details">
              <summary>{{ $t('Result Preview') }}</summary>
              <div class="result-preview">
                <div class="result-preview-header">
                  <el-button size="small" type="primary" @click="getRequirementResult(row).retry()">{{ $t('Retry') }}</el-button>
                </div>
                <div class="result-preview-content">
                  <pre>{{ json(getRequirementResult(row)) }}</pre>
                </div>
              </div>
            </details>
          </div>
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
