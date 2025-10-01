<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { BlueprintPropertyType, EntityIdentifierMechanism, IBlueprintPropertyDescriptor } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import BlueprintPropertyTypeSelector from '@/modules/no-code/components/BlueprintPropertyTypeSelector.vue';
import { getKeyFromName } from '@/modules/core/utils/texts';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import Monaco from '@/modules/users/components/Monaco.vue';

const entityIdentifierMechanism = defineModel('entityIdentifierMechanism');
const properties = defineModel('properties');

// Loading states
const isLoading = ref(true);
const isPropertiesLoading = ref(true);
const isIdentifierLoading = ref(true);

function getSchema(property: IBlueprintPropertyDescriptor) {
  if (property.type === BlueprintPropertyType.OBJECT && property.schema) {
    try {
      return JSON.parse(property.schema)
    } catch {
      return undefined;
    }
  }
  return undefined;
}

const blueprintProperties = ref(
  Object
    .entries(properties.value || {})
    .map(([key, value]) => ({ key, ...value, schema: value.schema ? JSON.stringify(value.schema, null, 2) : undefined }))
);

// Track the currently selected property for detailed view
const selectedPropertyIndex = ref(-1);

function addProperty() {
  const newProperty = {
    key: 'new_property',
    title: '',
    enum: [],
    type: BlueprintPropertyType.STRING,
    description: '',
    required: false,
    multi: false
  };
  
  blueprintProperties.value.push(newProperty);
  // Automatically select the newly added property
  selectedPropertyIndex.value = blueprintProperties.value.length - 1;
}

function removeProperty(index) {
  blueprintProperties.value.splice(index, 1);
  if (selectedPropertyIndex.value === index) {
    selectedPropertyIndex.value = -1;
  } else if (selectedPropertyIndex.value > index) {
    selectedPropertyIndex.value--;
  }
}

function selectProperty(index) {
  selectedPropertyIndex.value = index;
}

function getPropertyTypeLabel(type) {
  const typeLabels = {
    [BlueprintPropertyType.STRING]: 'Text',
    [BlueprintPropertyType.NUMBER]: 'Number',
    [BlueprintPropertyType.BOOLEAN]: 'Boolean',
    [BlueprintPropertyType.DATE]: 'Date',
    [BlueprintPropertyType.TIME]: 'Time',
    [BlueprintPropertyType.DATETIME]: 'Date & Time',
    [BlueprintPropertyType.OBJECT]: 'Object',
    [BlueprintPropertyType.FILE]: 'File'
  };
  
  return typeLabels[type] || type;
}

function getPropertyTypeIcon(type) {
  const typeIcons = {
    [BlueprintPropertyType.STRING]: 'el-icon-document',
    [BlueprintPropertyType.NUMBER]: 'el-icon-tickets',
    [BlueprintPropertyType.BOOLEAN]: 'el-icon-switch-button',
    [BlueprintPropertyType.DATE]: 'el-icon-date',
    [BlueprintPropertyType.TIME]: 'el-icon-time',
    [BlueprintPropertyType.DATETIME]: 'el-icon-date',
    [BlueprintPropertyType.OBJECT]: 'el-icon-collection',
    [BlueprintPropertyType.FILE]: 'el-icon-document-copy'
  };
  
  return typeIcons[type] || 'el-icon-document';
}

function getPropertySummary(property) {
  const parts = [];
  
  if (property.required) {
    parts.push('Required');
  }
  
  if (property.multi) {
    parts.push('Multiple values');
  }
  
  if (property.type === BlueprintPropertyType.STRING && property.enum?.length) {
    parts.push(`Options: ${property.enum.join(', ')}`);
  }
  
  if (property.type === BlueprintPropertyType.NUMBER) {
    if (property.min !== undefined && property.max !== undefined) {
      parts.push(`Range: ${property.min} to ${property.max}`);
    } else if (property.min !== undefined) {
      parts.push(`Min: ${property.min}`);
    } else if (property.max !== undefined) {
      parts.push(`Max: ${property.max}`);
    }
  }
  
  if (property.type === BlueprintPropertyType.STRING && property.max) {
    parts.push(`Max length: ${property.max}`);
  }
  
  return parts.join(' • ');
}

// Simulate loading states
onMounted(() => {
  // Simulate async data loading
  setTimeout(() => {
    isIdentifierLoading.value = false;
  }, 800);
  
  setTimeout(() => {
    isPropertiesLoading.value = false;
    isLoading.value = false;
  }, 1200);
});

// Watch for changes and update the parent component
watch(blueprintProperties, () => {
  properties.value = blueprintProperties.value.reduce((acc, { key, ...rest }) => {
    return { ...acc, [key]: {
      ...rest,
      schema: rest.type === BlueprintPropertyType.OBJECT && rest.schema ? getSchema(rest) : undefined,
    } };
  }, {});
}, { deep: true });
</script>

<template>
  <div class="blueprint-properties-container">
    <div class="properties-header">
      <template v-if="isIdentifierLoading">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="h3" style="width: 40%; margin-bottom: 1rem;" />
            <el-skeleton-item variant="text" style="width: 80%; margin-bottom: 0.5rem;" />
            <el-skeleton-item variant="text" style="width: 60%; margin-bottom: 1.5rem;" />
            <el-skeleton-item variant="text" style="width: 30%; margin-bottom: 0.5rem;" />
            <el-skeleton-item variant="rect" style="width: 100%; height: 32px; margin-bottom: 0.5rem;" />
            <el-skeleton-item variant="text" style="width: 70%;" />
          </template>
        </el-skeleton>
      </template>
      
      <template v-else>
        <div class="content-fade-in">
          <h3>{{ $t('Blueprint Properties') }}</h3>
          <p class="properties-description">
            {{ $t('Properties determine the structure of the blueprint.') }}
            <InfoIcon content="Each entity will also have an identifier and a title, regardless of those custom properties."/>
          </p>
          
          <el-form-item :label="$t('Identifier Mechanism for Entities')">
            <el-select v-model="entityIdentifierMechanism" required :placeholder="$t('Select mechanism')">
              <el-option label="Object ID" :value="EntityIdentifierMechanism.OBJECT_ID"/>
              <el-option label="GUID" :value="EntityIdentifierMechanism.GUID"/>
            </el-select>
            <div class="mechanism-description">
              <small>{{ $t('This determines how entity IDs are generated. Object ID uses MongoDB\'s ObjectId, while GUID uses globally unique identifiers.') }}</small>
            </div>
          </el-form-item>
        </div>
      </template>
    </div>
    
    <div class="properties-content">
      <div class="properties-list">
        <template v-if="isPropertiesLoading">
          <el-skeleton animated>
            <template #template>
              <div class="properties-list-header">
                <el-skeleton-item variant="h1" style="width: 30%;" />
                <el-skeleton-item variant="button" style="width: 120px; height: 28px;" />
              </div>
              <div class="properties-list-content">
                <div v-for="i in 3" :key="i" class="property-card-skeleton">
                  <el-skeleton-item variant="rect" style="width: 100%; height: 120px; margin-bottom: 1rem; border-radius: 8px;" />
                </div>
              </div>
            </template>
          </el-skeleton>
        </template>
        
        <template v-else>
          <div class="properties-list-header">
            <h4>{{ $t('Properties') }}</h4>
            <el-button type="primary" size="small" @click="addProperty">
              <el-icon><Plus /></el-icon>
              {{ $t('Add Property') }}
            </el-button>
          </div>
          
          <div class="properties-list-content content-fade-in">
            <el-empty v-if="blueprintProperties.length === 0" :description="$t('No properties defined yet')">
              <el-button type="primary" @click="addProperty">{{ $t('Add First Property') }}</el-button>
            </el-empty>
            
            <el-card 
              v-for="(property, index) in blueprintProperties" 
              :key="index"
              class="property-card"
              :class="{ 'selected': selectedPropertyIndex === index }"
              @click="selectProperty(index)"
              shadow="hover"
            >
              <div class="property-card-content">
                <div class="property-info">
                  <div class="property-title">
                    <strong>{{ property.title || property.key }}</strong>
                    <span class="property-key">({{ property.key }})</span>
                  </div>
                  <div class="property-type">
                    <el-tag size="small" :type="property.required ? 'danger' : 'info'">
                      {{ getPropertyTypeLabel(property.type) }}
                    </el-tag>
                    <el-tag v-if="property.multi" size="small" type="warning" class="multi-tag">Multiple</el-tag>
                  </div>
                  <div class="property-description" v-if="property.description">
                    {{ property.description }}
                  </div>
                  <div class="property-summary" v-if="getPropertySummary(property)">
                    {{ getPropertySummary(property) }}
                  </div>
                </div>
                
                <div class="property-actions">
                  <el-button 
                    type="danger" 
                    circle 
                    size="small" 
                    @click.stop="removeProperty(index)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </el-card>
          </div>
        </template>
      </div>
      
      <div class="property-details" v-if="isPropertiesLoading || selectedPropertyIndex >= 0">
        <template v-if="isPropertiesLoading">
          <el-skeleton animated>
            <template #template>
              <div class="property-details-header">
                <el-skeleton-item variant="h1" style="width: 40%; margin-bottom: 1.5rem;" />
              </div>
              <div class="property-details-content">
                <div class="mobile-form-group">
                  <div style="flex: 1;">
                    <el-skeleton-item variant="text" style="width: 20%; margin-bottom: 0.5rem;" />
                    <el-skeleton-item variant="rect" style="width: 100%; height: 32px; margin-bottom: 1rem;" />
                  </div>
                  <div style="flex: 1;">
                    <el-skeleton-item variant="text" style="width: 25%; margin-bottom: 0.5rem;" />
                    <el-skeleton-item variant="rect" style="width: 100%; height: 32px; margin-bottom: 1rem;" />
                  </div>
                </div>
                <div>
                  <el-skeleton-item variant="text" style="width: 30%; margin-bottom: 0.5rem;" />
                  <el-skeleton-item variant="rect" style="width: 100%; height: 32px; margin-bottom: 1rem;" />
                </div>
                <div>
                  <el-skeleton-item variant="text" style="width: 35%; margin-bottom: 0.5rem;" />
                  <el-skeleton-item variant="rect" style="width: 100%; height: 32px; margin-bottom: 1rem;" />
                </div>
                <div style="display: flex; gap: 1rem; align-items: end;">
                  <el-skeleton-item variant="rect" style="width: 60px; height: 24px;" />
                  <el-skeleton-item variant="rect" style="width: 60px; height: 24px;" />
                  <el-skeleton-item variant="rect" style="width: 60px; height: 24px;" />
                </div>
              </div>
            </template>
          </el-skeleton>
        </template>
        
        <template v-else-if="selectedPropertyIndex >= 0">
          <div class="property-details-header">
            <h4>{{ $t('Property Details') }}</h4>
          </div>
          
          <div class="property-details-content content-fade-in">
            <div class="mobile-form-group">
              <FormInput v-model="blueprintProperties[selectedPropertyIndex].key" title="Key" required/>
              <FormInput 
                v-model="blueprintProperties[selectedPropertyIndex].title" 
                @input="blueprintProperties[selectedPropertyIndex].key = getKeyFromName($event)" 
                title="Title" 
                required
              />
            </div>
            
            <FormInput v-model="blueprintProperties[selectedPropertyIndex].description" title="Description"/>
            
            <BlueprintPropertyTypeSelector v-model="blueprintProperties[selectedPropertyIndex].type"/>
            
            <el-form-item 
              v-if="blueprintProperties[selectedPropertyIndex].type === BlueprintPropertyType.STRING" 
              :label="$t('Valid Options (Enum)')">
              <el-select
                v-model="blueprintProperties[selectedPropertyIndex].enum"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                :placeholder="$t('Enter valid options')"
              >
                <el-option 
                  v-for="item in blueprintProperties[selectedPropertyIndex].enum" 
                  :key="item" 
                  :label="item" 
                  :value="item"
                />
              </el-select>
              <div class="field-help">
                <small>{{ $t('If specified, only these values will be allowed for this property') }}</small>
              </div>
            </el-form-item>

            <div v-if="blueprintProperties[selectedPropertyIndex].type === BlueprintPropertyType.OBJECT">
              <el-form-item :label="$t('Schema')">
                <Monaco v-model="blueprintProperties[selectedPropertyIndex].schema" language="json"/>
              </el-form-item>
            </div>
            
            <FormRowGroup v-if="blueprintProperties[selectedPropertyIndex].type === BlueprintPropertyType.NUMBER">
              <FormInput v-model="blueprintProperties[selectedPropertyIndex].min" type="number" title="Min Value"/>
              <FormInput v-model="blueprintProperties[selectedPropertyIndex].max" type="number" title="Max Value"/>
            </FormRowGroup>
            
            <FormRowGroup>
              <FormInput 
                v-model="blueprintProperties[selectedPropertyIndex].required" 
                title="Required" 
                type="switch" 
                class="flex-0"
              />
              <FormInput 
                v-model="blueprintProperties[selectedPropertyIndex].multi" 
                title="Allow Multiple Values" 
                type="switch" 
                class="flex-0"
              />
              <template v-if="blueprintProperties[selectedPropertyIndex].type === BlueprintPropertyType.STRING">
                <FormInput 
                  v-model="blueprintProperties[selectedPropertyIndex].max" 
                  title="Max Length" 
                  type="number" 
                  class="flex-0"
                />
              </template>
            </FormRowGroup>
          </div>
        </template>
      </div>
      
      <div class="property-details-empty" v-else-if="!isPropertiesLoading && selectedPropertyIndex < 0">
        <div class="content-fade-in">
          <el-empty :description="$t('Select a property to edit its details')">
            <el-button type="primary" @click="addProperty">{{ $t('Add New Property') }}</el-button>
          </el-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blueprint-properties-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.properties-header {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1.5rem;
}

.properties-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 1rem;
}

.mechanism-description {
  margin-top: 0.5rem;
  color: var(--el-text-color-secondary);
}

.properties-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 992px) {
  .properties-content {
    flex-direction: row;
  }
}

.properties-list {
  flex: 1;
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
}

@media (min-width: 992px) {
  .properties-list {
    max-width: 40%;
  }
}

.properties-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.properties-list-content {
  max-height: 500px;
  overflow-y: auto;
}

.property-card {
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  border-left: 3px solid transparent;
}

.property-card:hover {
  transform: translateX(2px);
}

.property-card.selected {
  border-left-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.property-card-content {
  display: flex;
  justify-content: space-between;
}

.property-info {
  flex: 1;
}

.property-title {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.property-key {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
}

.property-type {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.multi-tag {
  margin-left: 0.5rem;
}

.property-description {
  color: var(--el-text-color-regular);
  margin-bottom: 0.5rem;
  font-size: 0.9em;
}

.property-summary {
  color: var(--el-text-color-secondary);
  font-size: 0.8em;
}

.property-actions {
  display: flex;
  align-items: flex-start;
}

.property-details, .property-details-empty {
  flex: 1.5;
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
}

.property-details-header {
  margin-bottom: 1.5rem;
}

.property-details-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-help {
  margin-top: 0.5rem;
  color: var(--el-text-color-secondary);
}

.mobile-form-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 768px) {
  .mobile-form-group {
    display: flex;
    flex-direction: row;
    gap: 1rem;
  }
  
  .mobile-form-group > * {
    flex: 1;
  }
}

h3, h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

/* Loading and transition animations */
.content-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.property-card-skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

/* Smooth transitions for content changes */
.properties-header,
.properties-list,
.property-details,
.property-details-empty {
  transition: all 0.3s ease-in-out;
}

/* Skeleton specific styling */
.properties-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

/* Enhanced loading state styling */
.blueprint-properties-container {
  position: relative;
}

.blueprint-properties-container .el-skeleton {
  width: 100%;
}

.blueprint-properties-container .el-skeleton__item {
  background: linear-gradient(90deg, var(--el-skeleton-color) 25%, var(--el-skeleton-to-color) 37%, var(--el-skeleton-color) 63%);
  background-size: 400% 100%;
  animation: el-skeleton-loading 1.4s ease infinite;
}

/* Prevent layout shifts */
.properties-list,
.property-details,
.property-details-empty {
  min-height: 400px;
}

.properties-header {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Mobile responsive skeleton adjustments */
@media (max-width: 991px) {
  .properties-list,
  .property-details,
  .property-details-empty {
    min-height: 300px;
  }
  
  .properties-header {
    min-height: 180px;
  }
}

/* Skeleton animation improvements */
.property-card-skeleton {
  border-radius: 8px;
  overflow: hidden;
}

.mobile-form-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 768px) {
  .mobile-form-group {
    flex-direction: row;
  }
  
  .mobile-form-group > * {
    flex: 1;
  }
}
</style>
