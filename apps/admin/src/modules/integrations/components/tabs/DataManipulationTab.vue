<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { Delete, Plus, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import BlueprintDropdown from '@/modules/integrations/components/BlueprintDropdown.vue';

// Define props and emits
const props = defineProps<{
  modelValue: any[];
}>();

const emit = defineEmits(['update:modelValue']);

// Store steps as arrays of entries for stable references
const steps = ref<any[]>([]);
const mapEntries = ref<Record<number, Array<{key: string, value: string}>>>({});
const populateEntries = ref<Record<number, Array<{key: string, source: string, blueprint?: string}>>>({});

// JSON representation for each step
const stepJsons = ref<Record<number, string>>({});
const completeJsonText = ref('');

// Helper functions to safely access entries
const getMapEntries = (stepIndex: number) => {
  return mapEntries.value[stepIndex] || [];
};

const getPopulateEntries = (stepIndex: number) => {
  return populateEntries.value[stepIndex] || [];
};

// Initialize the component with data from props
const initialize = () => {
  // Create a deep copy of the modelValue
  const modelCopy = JSON.parse(JSON.stringify(props.modelValue || []));
  steps.value = modelCopy;
  
  // Convert map and populate objects to arrays of entries
  modelCopy.forEach((step, stepIndex) => {
    // Convert map object to array
    if (step.map) {
      mapEntries.value[stepIndex] = Object.entries(step.map).map(([key, value]) => ({
        key,
        value: value as string
      }));
    } else {
      mapEntries.value[stepIndex] = [];
    }
    
    // Convert populate object to array
    if (step.populate) {
      populateEntries.value[stepIndex] = Object.entries(step.populate).map(([key, config]) => {
        const populateConfig = config as any;
        return {
          key,
          source: populateConfig.source || 'user',
          blueprint: populateConfig.blueprint
        };
      });
    } else {
      populateEntries.value[stepIndex] = [];
    }
    
    // Initialize JSON representations
    stepJsons.value[stepIndex] = JSON.stringify(step, null, 2);
  });
  
  completeJsonText.value = JSON.stringify(steps.value, null, 2);
};

// Sync entries back to the model
const syncToModel = () => {
  const newModelValue = steps.value.map((step, stepIndex) => {
    const newStep = { ...step };
    
    // Convert map entries array back to object
    newStep.map = {};
    if (mapEntries.value[stepIndex]) {
      mapEntries.value[stepIndex].forEach(entry => {
        if (entry.key.trim()) {
          newStep.map[entry.key] = entry.value;
        }
      });
    }
    
    // Convert populate entries array back to object
    newStep.populate = {};
    if (populateEntries.value[stepIndex]) {
      populateEntries.value[stepIndex].forEach(entry => {
        if (entry.key.trim()) {
          newStep.populate[entry.key] = {
            source: entry.source || 'user'
          };
          if (entry.source === 'blueprintEntities' && entry.blueprint) {
            newStep.populate[entry.key].blueprint = entry.blueprint;
          }
        }
      });
    }
    
    return newStep;
  });
  
  // Update JSON representations
  newModelValue.forEach((step, index) => {
    stepJsons.value[index] = JSON.stringify(step, null, 2);
  });
  completeJsonText.value = JSON.stringify(newModelValue, null, 2);
  
  // Emit the updated value
  emit('update:modelValue', newModelValue);
};

// Add a new step to the data manipulation
const addStep = () => {
  // Add a new step to the steps array
  steps.value.push({
    map: {},
    populate: {}
  });
  
  // Initialize empty entry arrays for the new step
  const newIndex = steps.value.length - 1;
  mapEntries.value[newIndex] = [];
  populateEntries.value[newIndex] = [];
  
  // Update JSON and emit changes
  syncToModel();
};

// Remove a step from the data manipulation
const removeStep = (index: number) => {
  // Remove the step
  steps.value.splice(index, 1);
  
  // Rebuild the entries with updated indices
  const newMapEntries = {};
  const newPopulateEntries = {};
  const newStepJsons = {};
  
  steps.value.forEach((_, i) => {
    if (i < index) {
      newMapEntries[i] = mapEntries.value[i];
      newPopulateEntries[i] = populateEntries.value[i];
    } else {
      newMapEntries[i] = mapEntries.value[i + 1] || [];
      newPopulateEntries[i] = populateEntries.value[i + 1] || [];
    }
  });
  
  mapEntries.value = newMapEntries;
  populateEntries.value = newPopulateEntries;
  
  // Update JSON and emit changes
  syncToModel();
};

// Move a step up or down in the sequence
const moveStep = (fromIndex: number, toIndex: number) => {
  // Validate indices
  if (toIndex < 0 || toIndex >= steps.value.length) return;
  
  // Move the step
  const step = steps.value.splice(fromIndex, 1)[0];
  steps.value.splice(toIndex, 0, step);
  
  // Move the entries
  const mapEntriesToMove = mapEntries.value[fromIndex];
  const populateEntriesToMove = populateEntries.value[fromIndex];
  
  // Rebuild the entries with updated indices
  const newMapEntries = {};
  const newPopulateEntries = {};
  
  // Handle the case where we're moving up (fromIndex > toIndex)
  if (fromIndex > toIndex) {
    for (let i = 0; i < steps.value.length; i++) {
      if (i < toIndex) {
        newMapEntries[i] = mapEntries.value[i];
        newPopulateEntries[i] = populateEntries.value[i];
      } else if (i === toIndex) {
        newMapEntries[i] = mapEntriesToMove;
        newPopulateEntries[i] = populateEntriesToMove;
      } else if (i <= fromIndex) {
        newMapEntries[i] = mapEntries.value[i - 1];
        newPopulateEntries[i] = populateEntries.value[i - 1];
      } else {
        newMapEntries[i] = mapEntries.value[i];
        newPopulateEntries[i] = populateEntries.value[i];
      }
    }
  } 
  // Handle the case where we're moving down (fromIndex < toIndex)
  else {
    for (let i = 0; i < steps.value.length; i++) {
      if (i < fromIndex) {
        newMapEntries[i] = mapEntries.value[i];
        newPopulateEntries[i] = populateEntries.value[i];
      } else if (i > fromIndex && i <= toIndex) {
        newMapEntries[i - 1] = mapEntries.value[i];
        newPopulateEntries[i - 1] = populateEntries.value[i];
      } else if (i === toIndex + 1) {
        newMapEntries[i - 1] = mapEntriesToMove;
        newPopulateEntries[i - 1] = populateEntriesToMove;
      } else {
        newMapEntries[i] = mapEntries.value[i];
        newPopulateEntries[i] = populateEntries.value[i];
      }
    }
  }
  
  mapEntries.value = newMapEntries;
  populateEntries.value = newPopulateEntries;
  
  // Update JSON and emit changes
  syncToModel();
};

// Map entry methods
const addMapEntry = (stepIndex: number) => {
  if (!mapEntries.value[stepIndex]) {
    mapEntries.value[stepIndex] = [];
  }
  
  // Add a new entry with empty key and value
  mapEntries.value[stepIndex].push({
    key: '',
    value: ''
  });
  
  // Sync to model
  syncToModel();
};

const removeMapEntry = (stepIndex: number, entryIndex: number) => {
  if (!mapEntries.value[stepIndex]) return;
  
  // Remove the entry at the specified index
  mapEntries.value[stepIndex].splice(entryIndex, 1);
  
  // Sync to model
  syncToModel();
};

// Populate entry methods
const addPopulateEntry = (stepIndex: number) => {
  if (!populateEntries.value[stepIndex]) {
    populateEntries.value[stepIndex] = [];
  }
  
  // Add a new entry with default values
  populateEntries.value[stepIndex].push({
    key: '',
    source: 'user'
  });
  
  // Sync to model
  syncToModel();
};

const removePopulateEntry = (stepIndex: number, entryIndex: number) => {
  if (!populateEntries.value[stepIndex]) return;
  
  // Remove the entry at the specified index
  populateEntries.value[stepIndex].splice(entryIndex, 1);
  
  // Sync to model
  syncToModel();
};

// Update methods for JSON views
const updateStepJson = (stepIndex: number, json: string) => {
  try {
    // Parse the JSON to ensure it's valid
    const parsedJson = JSON.parse(json);
    
    // Update the step
    steps.value[stepIndex] = parsedJson;
    
    // Convert the updated step back to arrays of entries
    if (parsedJson.map) {
      mapEntries.value[stepIndex] = Object.entries(parsedJson.map).map(([key, value]) => ({
        key,
        value: value as string
      }));
    } else {
      mapEntries.value[stepIndex] = [];
    }
    
    if (parsedJson.populate) {
      populateEntries.value[stepIndex] = Object.entries(parsedJson.populate).map(([key, config]) => {
        const populateConfig = config as any;
        return {
          key,
          source: populateConfig.source || 'user',
          blueprint: populateConfig.blueprint
        };
      });
    } else {
      populateEntries.value[stepIndex] = [];
    }
    
    // Update JSON representations
    stepJsons.value[stepIndex] = json;
    completeJsonText.value = JSON.stringify(steps.value, null, 2);
    
    // Emit the updated value
    syncToModel();
  } catch (e) {
    // If JSON is invalid, don't update anything
    console.error('Invalid JSON:', e);
  }
};

const updateCompleteJson = (json: string) => {
  try {
    // Parse the JSON to ensure it's valid
    const parsedJson = JSON.parse(json);
    
    // Update the steps
    steps.value = parsedJson;
    
    // Convert all steps to arrays of entries
    parsedJson.forEach((step, stepIndex) => {
      if (step.map) {
        mapEntries.value[stepIndex] = Object.entries(step.map).map(([key, value]) => ({
          key,
          value: value as string
        }));
      } else {
        mapEntries.value[stepIndex] = [];
      }
      
      if (step.populate) {
        populateEntries.value[stepIndex] = Object.entries(step.populate).map(([key, config]) => {
          const populateConfig = config as any;
          return {
            key,
            source: populateConfig.source || 'user',
            blueprint: populateConfig.blueprint
          };
        });
      } else {
        populateEntries.value[stepIndex] = [];
      }
    });
    
    // Update JSON representations
    parsedJson.forEach((step, index) => {
      stepJsons.value[index] = JSON.stringify(step, null, 2);
    });
    completeJsonText.value = json;
    
    // Emit the updated value
    syncToModel();
  } catch (e) {
    // If JSON is invalid, don't update anything
    console.error('Invalid JSON:', e);
  }
};

// Initialize on mount
onMounted(() => {
  initialize();
});
</script>

<template>
  <div class="data-manipulation-container">
    <el-alert type="info" :closable="false" class="mb-3">
      {{ $t('Each step processes data from the previous step. Use map to transform data and populate to fetch related data.') }}
    </el-alert>
    
    <!-- Steps List -->
    <div v-for="(step, i) in steps" :key="i" class="data-step">
      <div class="step-header">
        <h4>{{ $t('Step') }} {{ i + 1 }}</h4>
        <div class="step-actions">
          <el-button size="small" type="danger" @click="removeStep(i)" :icon="Delete" circle />
          <el-button size="small" @click="moveStep(i, i - 1)" :disabled="i === 0" :icon="ArrowUp" circle />
          <el-button size="small" @click="moveStep(i, i + 1)" :disabled="i === steps.length - 1" :icon="ArrowDown" circle />
        </div>
      </div>
      
      <el-tabs class="step-tabs">
        <!-- Map Tab -->
        <el-tab-pane :label="$t('Map')">
          <p class="step-description">{{ $t('Map transforms data using JQ-like expressions') }}</p>
          <div class="map-entries">
            <div v-for="(entry, index) in getMapEntries(i)" :key="index" class="map-entry">
              <el-input 
                v-model="entry.key" 
                placeholder="Key" 
                @update:model-value="syncToModel" 
              />
              <el-input 
                v-model="entry.value" 
                placeholder="JQ Expression" 
                @update:model-value="syncToModel" 
              />
              <el-button type="danger" :icon="Delete" @click="removeMapEntry(i, index)" circle />
            </div>
            <el-button type="primary" @click="addMapEntry(i)" :icon="Plus">{{ $t('Add Field') }}</el-button>
          </div>
        </el-tab-pane>
        
        <!-- Populate Tab -->
        <el-tab-pane :label="$t('Populate')">
          <p class="step-description">{{ $t('Populate fetches related data from databases') }}</p>
          <div class="populate-entries">
            <div v-for="(entry, index) in populateEntries[i]" :key="index" class="populate-entry">
              <el-input 
                v-model="entry.key" 
                placeholder="Key" 
                @update:model-value="syncToModel" 
              />
              <el-select 
                v-model="entry.source" 
                placeholder="Source"
                @update:model-value="syncToModel" 
              >
                <el-option value="user" label="User" />
                <el-option value="workspace" label="Workspace" />
                <el-option value="blueprint" label="Blueprint" />
                <el-option value="blueprintEntities" label="Blueprint Entities" />
                <el-option value="blueprintEntity" label="Blueprint Entity" />
              </el-select>
              <BlueprintDropdown 
                v-if="entry.source === 'blueprintEntities'" 
                v-model="entry.blueprint" 
                @update:model-value="syncToModel" 
              />
              <el-button type="danger" :icon="Delete" @click="removePopulateEntry(i, index)" circle />
            </div>
            <el-button type="primary" @click="addPopulateEntry(i)" :icon="Plus">{{ $t('Add Field') }}</el-button>
          </div>
        </el-tab-pane>
        
        <!-- JSON View Tab -->
        <el-tab-pane :label="$t('JSON View')">
          <Monaco 
            :modelValue="stepJsons[i]" 
            height="200px" 
            language="json"
            @update:modelValue="(value) => updateStepJson(i, value)" 
          />
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <!-- Add Step Button -->
    <div class="add-step-container">
      <el-button type="primary" @click="addStep" :icon="Plus">{{ $t('Add Step') }}</el-button>
    </div>
    
    <el-divider />
    
    <!-- Complete JSON Preview -->
    <div class="json-preview">
      <h4>{{ $t('Complete Data Manipulation JSON') }}</h4>
      <Monaco 
        :modelValue="completeJsonText" 
        height="200px" 
        language="json"
        @update:modelValue="updateCompleteJson" 
      />
    </div>
  </div>
</template>

<style scoped>
.data-manipulation-container {
  padding: 10px 0;
}

.data-step {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.step-header h4 {
  margin: 0;
}

.step-actions {
  display: flex;
  gap: 5px;
}

.step-tabs {
  margin-top: 10px;
}

.step-description {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
  margin-bottom: 15px;
}

.map-entries, .populate-entries {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.map-entry, .populate-entry {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.add-step-container {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

.json-preview {
  margin-top: 20px;
}

.mb-3 {
  margin-bottom: 15px;
}

/* Connection selector icon styling */
:deep(.flex-row) {
  display: flex;
  align-items: center;
}

:deep(.flex-middle) {
  align-items: center;
}

:deep(.flex-row img) {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  object-fit: contain;
}

:deep(.flex-row small) {
  font-size: 0.8em;
  margin-right: 8px;
  color: var(--el-text-color-secondary);
}
</style>
