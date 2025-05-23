<script setup lang="ts">
import { computed, ref } from 'vue';
import { getKeyFromName } from '@/modules/core/utils/texts';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { Document, Edit, Key, InfoFilled } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);

const edit = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Auto-generate identifier from name
function updateIdentifier(name) {
  if (name && name.trim()) {
    edit.value.identifier = getKeyFromName(name);
  }
}

// Check if the blueprint is new or being edited
const isNewBlueprint = computed(() => !edit.value._id);

// Generate example API usage
const apiExamples = computed(() => {
  if (!edit.value.identifier) return {};
  
  const baseEndpoint = `/api/blueprints/${edit.value.identifier}/entities`;
  
  return {
    create: `POST ${baseEndpoint}\n{\n  "metadata": { ... }\n}`,
    read: `GET ${baseEndpoint}/:identifier`,
    list: `GET ${baseEndpoint}`,
    update: `PUT ${baseEndpoint}/:identifier\n{\n  "metadata": { ... }\n}`,
    delete: `DELETE ${baseEndpoint}/:identifier`
  };
});

// Track if API examples are visible
const showApiExamples = ref(false);
</script>

<template>
  <div class="blueprint-general-container">
    <div class="general-content">
      <div class="blueprint-info-section">
        <h3>{{ $t('Blueprint Information') }}</h3>
        <p class="section-description">
          {{ $t('Provide basic information about this blueprint.') }}
        </p>
        
        <div class="blueprint-form-grid mobile-stack">
          <div class="form-group">
            <el-form-item>
              <template #label>
                <div class="label-with-icon">
                  <el-icon><Document /></el-icon>
                  {{ $t('Name') }}
                  <InfoIcon content="The human-readable name of this blueprint. This will be displayed in the UI."/>
                </div>
              </template>
              <el-input 
                v-model="edit.name" 
                :placeholder="$t('Enter blueprint name')" 
                @update:modelValue="updateIdentifier"
                required
              />
            </el-form-item>
          </div>
          
          <div class="form-group">
            <el-form-item>
              <template #label>
                <div class="label-with-icon">
                  <el-icon><Key /></el-icon>
                  {{ $t('Identifier') }}
                  <InfoIcon content="The unique identifier for this blueprint. This will be used in API calls and database references."/>
                </div>
              </template>
              <el-input 
                v-model="edit.identifier" 
                :placeholder="$t('Enter identifier')" 
                required
              />
              <div class="field-help">
                <small>{{ $t('Auto-generated from name. Use lowercase letters, numbers, and underscores only.') }}</small>
              </div>
            </el-form-item>
          </div>
          
          <div class="form-group full-width">
            <el-form-item>
              <template #label>
                <div class="label-with-icon">
                  <el-icon><InfoFilled /></el-icon>
                  {{ $t('Description') }}
                  <InfoIcon content="A detailed description of this blueprint. This helps users understand its purpose."/>
                </div>
              </template>
              <el-input 
                v-model="edit.description" 
                type="textarea" 
                :rows="3"
                :placeholder="$t('Enter a detailed description of this blueprint')"
              />
            </el-form-item>
          </div>
        </div>
      </div>
      
      <div class="blueprint-api-section">
        <div class="api-section-header" @click="showApiExamples = !showApiExamples">
          <h3>{{ $t('API Reference') }}</h3>
          <el-button text>
            {{ showApiExamples ? $t('Hide Examples') : $t('Show Examples') }}
          </el-button>
        </div>
        
        <div v-if="showApiExamples" class="api-examples">
          <p class="section-description">
            {{ $t('Once created, this blueprint will be accessible via the following API endpoints:') }}
          </p>
          
          <div class="api-examples-grid">
            <div class="api-example" v-if="edit.identifier">
              <h4>{{ $t('Create Entity') }}</h4>
              <el-card shadow="never" class="code-block">
                <pre>{{ apiExamples.create }}</pre>
              </el-card>
            </div>
            
            <div class="api-example" v-if="edit.identifier">
              <h4>{{ $t('Get Entity') }}</h4>
              <el-card shadow="never" class="code-block">
                <pre>{{ apiExamples.read }}</pre>
              </el-card>
            </div>
            
            <div class="api-example" v-if="edit.identifier">
              <h4>{{ $t('List Entities') }}</h4>
              <el-card shadow="never" class="code-block">
                <pre>{{ apiExamples.list }}</pre>
              </el-card>
            </div>
            
            <div class="api-example" v-if="edit.identifier">
              <h4>{{ $t('Update Entity') }}</h4>
              <el-card shadow="never" class="code-block">
                <pre>{{ apiExamples.update }}</pre>
              </el-card>
            </div>
            
            <div class="api-example" v-if="edit.identifier">
              <h4>{{ $t('Delete Entity') }}</h4>
              <el-card shadow="never" class="code-block">
                <pre>{{ apiExamples.delete }}</pre>
              </el-card>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="blueprint-status-panel">
      <el-card class="status-card">
        <template #header>
          <div class="status-header">
            <h3>{{ $t('Blueprint Status') }}</h3>
          </div>
        </template>
        
        <div class="status-content">
          <div class="status-item">
            <div class="status-label">{{ $t('Status') }}</div>
            <div class="status-value">
              <el-tag :type="isNewBlueprint ? 'warning' : 'success'">
                {{ isNewBlueprint ? $t('Draft') : $t('Published') }}
              </el-tag>
            </div>
          </div>
          
          <div class="status-item">
            <div class="status-label">{{ $t('API Identifier') }}</div>
            <div class="status-value">{{ edit.identifier || $t('Not set') }}</div>
          </div>
          
          <div class="blueprint-tips">
            <h4>{{ $t('Tips') }}</h4>
            <ul>
              <li>{{ $t('Use a clear, descriptive name for your blueprint') }}</li>
              <li>{{ $t('Add detailed descriptions to help users understand the purpose') }}</li>
              <li>{{ $t('Configure permissions carefully to control access') }}</li>
              <li>{{ $t('Define properties that match your data model needs') }}</li>
            </ul>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.blueprint-general-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  overflow: hidden;
}

.general-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0; /* Allows flex items to shrink below content size */
}

.blueprint-status-panel {
  width: 100%;
}

/* Desktop layout */
@media (min-width: 992px) {
  .blueprint-general-container {
    flex-direction: row;
  }
  
  .general-content {
    flex: 3;
  }
  
  .blueprint-status-panel {
    flex: 1;
    min-width: 280px;
    max-width: 320px;
  }
}



.blueprint-info-section, .blueprint-api-section {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1.5rem;
}

.section-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 1.5rem;
}

.blueprint-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.mobile-stack {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .blueprint-form-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .mobile-stack {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

.form-group.full-width {
  grid-column: span 2;
}

.label-with-icon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.field-help {
  margin-top: 0.5rem;
  color: var(--el-text-color-secondary);
}

.api-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  cursor: pointer;
}

.api-examples-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

@media (min-width: 768px) {
  .api-examples-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

.api-example h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.code-block {
  background-color: var(--el-fill-color);
  font-family: monospace;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.9em;
  overflow-x: auto;
}

.status-card {
  height: 100%;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-label {
  font-size: 0.9em;
  color: var(--el-text-color-secondary);
}

.status-value {
  font-weight: 500;
}

.status-divider {
  height: 1px;
  background-color: var(--el-border-color-lighter);
  margin: 0.5rem 0;
}

.blueprint-tips {
  margin-top: 0.5rem;
}

.blueprint-tips h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1em;
}

.blueprint-tips ul {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.blueprint-tips li {
  margin-bottom: 0.5rem;
  font-size: 0.9em;
  color: var(--el-text-color-regular);
}

h3, h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}
</style>
