<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElLoading } from 'element-plus';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { IntegrationSourceKind, IBlueprint } from '@qelos/global-types';

const router = useRouter();
const route = useRoute();
const visible = defineModel<boolean>('visible');
const emit = defineEmits(['close']);

const prompt = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const selectedSourceId = ref('');
const generatedBlueprints = ref<IBlueprint[]>([]);
const creatingBlueprints = ref(false);
const selectedBlueprintIds = ref<string[]>([]);

// Get blueprints store for creating blueprints
const blueprintsStore = useBlueprintsStore();

// Get integration sources
const integrationSourcesStore = useIntegrationSourcesStore();

// Filter sources to only include OpenAI and Claude (when available)
const aiSources = computed(() => {
  const sources = [];
  
  // Add OpenAI sources
  if (integrationSourcesStore.groupedSources?.[IntegrationSourceKind.OpenAI]) {
    sources.push(...integrationSourcesStore.groupedSources[IntegrationSourceKind.OpenAI]);
  }
  
  // Add Claude sources
  if (integrationSourcesStore.groupedSources?.[IntegrationSourceKind.ClaudeAi]) {
    sources.push(...integrationSourcesStore.groupedSources[IntegrationSourceKind.ClaudeAi]);
  }
  
  return sources;
});

// Set default source when sources are loaded
watch(() => aiSources.value, (newSources) => {
  if (newSources?.length && !selectedSourceId.value) {
    selectedSourceId.value = newSources[0]._id;
  }
}, { immediate: true });

// Load integration sources when component is mounted
onMounted(() => {
  if (!integrationSourcesStore.loaded) {
    integrationSourcesStore.retry();
  }
});

function selectOption(option: string) {
  router.push({query: {...route.query, option}});
}

function navigateToManualCreate() {
  router.push({ name: 'createBlueprint' });
}

async function generateBlueprints() {
  if (!prompt.value.trim()) {
    errorMessage.value = 'Please enter a prompt';
    return;
  }
  
  if (!selectedSourceId.value) {
    errorMessage.value = 'Please select an AI source';
    return;
  }
  
  errorMessage.value = '';
  isLoading.value = true;
  generatedBlueprints.value = [];
  
  const loading = ElLoading.service({
    lock: true,
    text: 'Generating blueprints...',
    background: 'rgba(0, 0, 0, 0.7)',
  });
  
  try {
    const response = await fetch(`/api/ai/sources/${selectedSourceId.value}/blueprints`, {
      method: 'post',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        prompt: prompt.value
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const result = await response.json();
    generatedBlueprints.value = result;
    
    // By default, select all blueprints
    selectedBlueprintIds.value = result.map((_, index) => index.toString());
    
    // Move to the review step
    router.push({query: {...route.query, step: 'review'}});
    
  } catch (error) {
    console.error('Error generating blueprints:', error);
    errorMessage.value = 'Failed to generate blueprints. Please try again.';
    ElMessage.error('Failed to generate blueprints');
  } finally {
    loading.close();
    isLoading.value = false;
  }
}

async function createBlueprints() {
  creatingBlueprints.value = true;
  
  try {
    // Get only selected blueprints
    const blueprintsToCreate = generatedBlueprints.value.filter((_, index) => 
      selectedBlueprintIds.value.includes(index.toString())
    );
    
    // Create each selected blueprint using the store
    for (const blueprint of blueprintsToCreate) {
      await blueprintsStore.create(blueprint);
    }
    
    ElMessage.success(`${blueprintsToCreate.length} blueprints created successfully!`);
    emit('close');
    // Refresh the blueprints list
    router.push({ name: 'blueprints' });
  } catch (error) {
    console.error('Error creating blueprints:', error);
    ElMessage.error('Failed to create some blueprints');
  } finally {
    creatingBlueprints.value = false;
  }
}

watch(visible, () => {
  if (visible.value) {
    prompt.value = '';
    errorMessage.value = '';
    generatedBlueprints.value = [];
    selectedBlueprintIds.value = [];
    // Set default source if available
    if (aiSources.value?.length) {
      selectedSourceId.value = aiSources.value[0]._id;
    } else {
      selectedSourceId.value = '';
    }
    router.push({query: {...route.query, option: undefined, step: undefined}});
  }
});
</script>

<template>
<el-form v-if="visible">
  <el-dialog v-model="visible"
             :title="$t('Create a Blueprint')"
             @close="$emit('close')">
    <div v-if="!route.query.option">
        <h3>{{ $t('How would you like to create your blueprint?') }}</h3>

        <div class="content-list">
          <div class="content-item" @click="selectOption('ai')">
            <font-awesome-icon :icon="['fas', 'robot']" size="2x" />
            <span>{{ $t('Using AI') }}</span>
            <small>{{ $t('Generate a blueprint using AI assistance') }}</small>
          </div>
          <div class="content-item" @click="navigateToManualCreate()">
            <font-awesome-icon :icon="['fas', 'pencil']" size="2x" />
            <span>{{ $t('Manual') }}</span>
            <small>{{ $t('Create a blueprint manually') }}</small>
          </div>
        </div>
      </div>

      <div v-else-if="route.query.option === 'ai'" class="ai-form">
        <!-- Step 1: Input prompt and generate blueprints -->
        <div v-if="!route.query.step">
          <h3>{{ $t('Generate Blueprints with AI') }}</h3>
          <p class="description">{{ $t('Describe your blueprints needs, and our AI will generate them for you.') }}</p>
          
          <el-form-item label="AI Source" required>
            <el-select v-model="selectedSourceId" :loading="integrationSourcesStore.loading" class="source-select">
              <el-option
                v-for="source in aiSources"
                :key="source._id"
                :label="source.name"
                :value="source._id"
              >
                <div class="source-option">
                  <span>{{ source.name }}</span>
                  <small>{{ source.kind }}</small>
                </div>
              </el-option>
              <template #empty>
                <div class="empty-sources">
                  <p v-if="integrationSourcesStore.loading">{{ $t('Loading AI sources...') }}</p>
                  <p v-else>{{ $t('No AI sources available. Please add an OpenAI integration source.') }}</p>
                </div>
              </template>
            </el-select>
          </el-form-item>
          
          <el-form-item :error="errorMessage">
            <el-input
              v-model="prompt"
              type="textarea"
              :rows="4"
              :disabled="!selectedSourceId"
              :placeholder="$t('Describe your blueprint (e.g., a customer management system with contacts, orders, and invoices)')"
            />
            <small v-if="!selectedSourceId" class="source-warning">{{ $t('Please select an AI source first') }}</small>
          </el-form-item>
          
          <div class="examples">
            <h4>{{ $t('Example prompts:') }}</h4>
            <ul>
              <li>{{ $t('A project management system with tasks, milestones, and team members') }}</li>
              <li>{{ $t('An inventory management system for a retail store') }}</li>
              <li>{{ $t('A CRM system with customers, deals, and communication history') }}</li>
            </ul>
          </div>
        </div>
        
        <!-- Step 2: Review generated blueprints -->
        <div v-else-if="route.query.step === 'review'" class="review-blueprints">
          <h3>{{ $t('Review Generated Blueprints') }}</h3>
          <p class="description">{{ $t('Review and confirm the blueprints generated based on your prompt.') }}</p>
          
          <div v-if="generatedBlueprints.length === 0" class="no-blueprints">
            <p>{{ $t('No blueprints were generated. Please try again with a different prompt.') }}</p>
            <el-button @click="router.push({query: {...route.query, step: undefined}})">{{ $t('Back to Prompt') }}</el-button>
          </div>
          
          <div v-else class="blueprints-list">
            <div class="blueprint-selection-header">
              <el-checkbox 
                :indeterminate="selectedBlueprintIds.length > 0 && selectedBlueprintIds.length < generatedBlueprints.length"
                :checked="selectedBlueprintIds.length === generatedBlueprints.length"
                @change="(val) => val ? selectedBlueprintIds = generatedBlueprints.map((_, i) => i.toString()) : selectedBlueprintIds = []"
              >
                {{ $t('Select All') }}
              </el-checkbox>
              <span class="selected-count text-center">{{ $t('Selected') }}: {{ selectedBlueprintIds.length }} / {{ generatedBlueprints.length }}</span>
            </div>
            <p class="blueprints-count">{{ $t('{count} blueprints generated', { count: generatedBlueprints.length }) }}</p>
            
            <el-collapse>
              <el-collapse-item v-for="(blueprint, index) in generatedBlueprints" :key="index">
                <template #title>
                  <div class="blueprint-title-container">
                    <el-checkbox 
                      :checked="selectedBlueprintIds.includes(index.toString())"
                      @change="(val) => {
                        if (val) {
                          selectedBlueprintIds.push(index.toString());
                        } else {
                          const idx = selectedBlueprintIds.indexOf(index.toString());
                          if (idx > -1) selectedBlueprintIds.splice(idx, 1);
                        }
                      }"
                      @click.stop
                    ></el-checkbox>
                    <span class="blueprint-title">{{ blueprint.name }}</span>
                  </div>
                </template>
                <div class="blueprint-details">
                  <p><strong>{{ $t('Description') }}:</strong> {{ blueprint.description }}</p>
                  
                  <div class="properties-list">
                    <h4>{{ $t('Properties') }}:</h4>
                    <el-table :data="Object.entries(blueprint.properties).map(([key, value]) => ({ key, ...value }))" border>
                      <el-table-column prop="title" :label="$t('Property')" width="180" />
                      <el-table-column prop="type" :label="$t('Type')" width="120" />
                      <el-table-column prop="required" :label="$t('Required')" width="100">
                        <template #default="{ row }">
                          <el-tag v-if="row.required" type="danger" size="small">{{ $t('Required') }}</el-tag>
                          <el-tag v-else type="info" size="small">{{ $t('Optional') }}</el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="description" :label="$t('Description')" />
                    </el-table>
                  </div>
                  
                  <div v-if="blueprint.relations && blueprint.relations.length > 0" class="relations-list">
                    <h4>{{ $t('Relations') }}:</h4>
                    <el-table :data="blueprint.relations" border>
                      <el-table-column prop="target" :label="$t('Target Blueprint')" width="180" />
                      <el-table-column prop="field" :label="$t('Field')" width="180" />
                      <el-table-column prop="type" :label="$t('Relation Type')" />
                    </el-table>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="$emit('close')">{{ $t('Close') }}</el-button>
         
          <!-- Buttons for AI option - Input step -->
          <div v-if="route.query.option === 'ai' && !route.query.step" class="operation-buttons">
            <el-button @click="router.push({query: {...route.query, option: undefined}})">
              {{ $t('Back') }}
            </el-button>
            <el-button type="primary" @click="generateBlueprints" :loading="isLoading" :disabled="isLoading">
              {{ $t('Generate Blueprints') }}
            </el-button>
          </div>
          
          <!-- Buttons for AI option - Review step -->
          <div v-else-if="route.query.option === 'ai' && route.query.step === 'review'" class="operation-buttons">
            <el-button @click="router.push({query: {...route.query, step: undefined}})">
              {{ $t('Back to Prompt') }}
            </el-button>
            <el-button type="primary" @click="createBlueprints" :loading="creatingBlueprints" :disabled="creatingBlueprints || selectedBlueprintIds.length === 0">
              {{ $t('Create {count} Blueprints', { count: selectedBlueprintIds.length }) }}
            </el-button>
          </div>
        </div>
      </template>
  </el-dialog>
</el-form>
</template>

<style scoped>
.content-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.content-item {
  margin: 10px;
  padding: 20px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  cursor: pointer;
  min-width: 200px;
  width: 40%;
  height: 200px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  transition: background-color 0.2s ease;
}

.content-item:hover {
  background-color: var(--third-color);
}

.content-item span {
  margin-top: 15px;
  font-weight: bold;
}

.content-item small {
  margin-top: 10px;
  font-size: 14px;
  color: var(--text-color-secondary);
}

.ai-form {
  padding: 0 10px;
}

.ai-form h3 {
  margin-bottom: 10px;
  text-align: center;
}

.ai-form .description {
  margin-bottom: 20px;
  text-align: center;
  color: var(--text-color-secondary);
}

.examples {
  margin-top: 30px;
  padding: 15px;
  background-color: var(--third-color);
  border-radius: var(--border-radius);
}

.examples h4 {
  margin-bottom: 10px;
  font-size: 16px;
}

.examples ul {
  padding-left: 20px;
}

.examples li {
  margin-bottom: 8px;
  color: var(--text-color-secondary);
  font-size: 14px;
}

.source-select {
  width: 100%;
}

.source-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.source-option small {
  color: var(--text-color-secondary);
  font-size: 12px;
}

.empty-sources {
  padding: 10px;
  text-align: center;
  color: var(--text-color-secondary);
}

.source-warning {
  display: block;
  margin-top: 5px;
  color: var(--color-warning);
  font-style: italic;
}

.review-blueprints {
  max-height: 60vh;
  overflow-y: auto;
}

.blueprints-count {
  margin-bottom: 15px;
  font-weight: bold;
  text-align: center;
}

.blueprint-details {
  padding: 10px;
}

.properties-list,
.relations-list {
  margin-top: 15px;
}

.properties-list h4,
.relations-list h4 {
  margin-bottom: 10px;
  font-size: 16px;
}

.no-blueprints {
  text-align: center;
  padding: 20px;
  background-color: var(--third-color);
  border-radius: var(--border-radius);
}

.no-blueprints p {
  margin-bottom: 15px;
}

.blueprint-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 10px;
}

.selected-count {
  color: var(--text-color-secondary);
  font-size: 14px;
}

.blueprint-title-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.blueprint-title {
  font-weight: bold;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.operation-buttons {
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .content-list {
    gap: 10px;
  }
  
  .content-item {
    width: 100%;
    margin: 0;
  }
  
  .examples ul {
    padding-left: 15px;
  }
  
  .dialog-footer {
    flex-direction: column-reverse;
    gap: 10px;
  }
  
  .operation-buttons {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
