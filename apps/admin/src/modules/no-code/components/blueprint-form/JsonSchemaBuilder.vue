<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Plus, Delete, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';

interface JsonSchemaProperty {
  id: string;
  key: string;
  type: string;
  description?: string;
  required: boolean;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  default?: any;
}

interface JsonSchema {
  type: string;
  title?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, any>;
  items?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

const modelValue = defineModel<string>({ required: true });

const emit = defineEmits<{
  'toggle-mode': [];
}>();

const schemaProperties = ref<JsonSchemaProperty[]>([]);
const rootSchema = ref<Partial<JsonSchema>>({
  type: 'object',
  title: '',
  description: '',
});

let syncingFromParent = false;
let updateTimeout: ReturnType<typeof setTimeout> | null = null;

// Parse JSON schema from string
function parseSchema(schemaString: string): JsonSchema | null {
  try {
    return JSON.parse(schemaString);
  } catch {
    return null;
  }
}

// Convert our internal format to JSON Schema
function generateJsonSchema(): JsonSchema {
  const schema: JsonSchema = {
    type: rootSchema.value.type || 'object',
    ...(rootSchema.value.title && { title: rootSchema.value.title }),
    ...(rootSchema.value.description && { description: rootSchema.value.description }),
  };

  if (schema.type === 'object' && schemaProperties.value.length > 0) {
    schema.properties = {};
    schema.required = [];

    schemaProperties.value.forEach(prop => {
      const propSchema: any = {
        type: prop.type,
        ...(prop.description && { description: prop.description }),
      };

      // Add type-specific properties
      if (prop.type === 'string') {
        if (prop.enum && prop.enum.length > 0) {
          propSchema.enum = prop.enum;
        }
        if (prop.minLength !== undefined) propSchema.minLength = prop.minLength;
        if (prop.maxLength !== undefined) propSchema.maxLength = prop.maxLength;
        if (prop.pattern) propSchema.pattern = prop.pattern;
      } else if (prop.type === 'number' || prop.type === 'integer') {
        if (prop.minimum !== undefined) propSchema.minimum = prop.minimum;
        if (prop.maximum !== undefined) propSchema.maximum = prop.maximum;
      } else if (prop.type === 'array' && prop.items) {
        propSchema.items = {
          type: prop.items.type,
          ...(prop.items.description && { description: prop.items.description }),
        };
      } else if (prop.type === 'object' && prop.properties) {
        propSchema.properties = prop.properties;
      }

      if (prop.default !== undefined) {
        propSchema.default = prop.default;
      }

      schema.properties![prop.key] = propSchema;
      
      if (prop.required) {
        schema.required!.push(prop.key);
      }
    });

    if (schema.required!.length === 0) {
      delete schema.required;
    }
  }

  return schema;
}

// Convert JSON Schema to our internal format
function loadFromSchema(schema: JsonSchema) {
  syncingFromParent = true;
  
  rootSchema.value = {
    type: schema.type || 'object',
    title: schema.title || '',
    description: schema.description || '',
  };

  if (schema.type === 'object' && schema.properties) {
    schemaProperties.value = Object.entries(schema.properties).map(([key, propSchema]: [string, any]) => ({
      id: Math.random().toString(36).substr(2, 9),
      key,
      type: propSchema.type || 'string',
      description: propSchema.description || '',
      required: schema.required?.includes(key) || false,
      enum: propSchema.enum || [],
      minimum: propSchema.minimum,
      maximum: propSchema.maximum,
      minLength: propSchema.minLength,
      maxLength: propSchema.maxLength,
      pattern: propSchema.pattern,
      default: propSchema.default,
      items: propSchema.items ? {
        id: Math.random().toString(36).substr(2, 9),
        key: 'item',
        type: propSchema.items.type || 'string',
        description: propSchema.items.description || '',
        required: false,
      } : undefined,
      properties: propSchema.properties,
    }));
  } else {
    schemaProperties.value = [];
  }

  nextTick(() => {
    syncingFromParent = false;
  });
}

// Watch for changes from parent
watch(() => modelValue.value, (newValue) => {
  if (syncingFromParent) return;
  
  const schema = parseSchema(newValue || '{}');
  if (schema) {
    loadFromSchema(schema);
  }
}, { immediate: true });

// Debounced function to update parent model
function updateParentModel() {
  if (syncingFromParent) return;
  
  const schema = generateJsonSchema();
  modelValue.value = JSON.stringify(schema, null, 2);
}

// Debounced watch for changes to prevent focus loss
watch([rootSchema, schemaProperties], () => {
  if (syncingFromParent) return;
  
  // Clear existing timeout
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  
  // Set new timeout to update parent after user stops typing
  updateTimeout = setTimeout(() => {
    updateParentModel();
    updateTimeout = null;
  }, 300); // 300ms delay
}, { deep: true });

function addProperty() {
  schemaProperties.value.push({
    id: Math.random().toString(36).substr(2, 9),
    key: 'new_property',
    type: 'string',
    description: '',
    required: false,
    enum: [],
  });
}

function removeProperty(index: number) {
  schemaProperties.value.splice(index, 1);
}

function movePropertyUp(index: number) {
  if (index > 0) {
    const item = schemaProperties.value.splice(index, 1)[0];
    schemaProperties.value.splice(index - 1, 0, item);
  }
}

function movePropertyDown(index: number) {
  if (index < schemaProperties.value.length - 1) {
    const item = schemaProperties.value.splice(index, 1)[0];
    schemaProperties.value.splice(index + 1, 0, item);
  }
}

function addEnumOption(propertyIndex: number) {
  const property = schemaProperties.value[propertyIndex];
  if (!property.enum) property.enum = [];
  property.enum.push('');
}

function removeEnumOption(propertyIndex: number, optionIndex: number) {
  const property = schemaProperties.value[propertyIndex];
  if (property.enum) {
    property.enum.splice(optionIndex, 1);
  }
}

const typeOptions = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Integer', value: 'integer' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Array', value: 'array' },
  { label: 'Object', value: 'object' },
  { label: 'Null', value: 'null' },
];

</script>

<template>
  <div class="json-schema-builder">
    <div class="schema-header">
      <div class="header-controls">
        <h4>{{ $t('Visual Schema Builder') }}</h4>
        <el-button size="small" @click="emit('toggle-mode')">
          {{ $t('Switch to JSON') }}
        </el-button>
      </div>
      
      <div class="root-schema-config">
        <div class="form-row">
          <FormInput 
            v-model="rootSchema.title" 
            :title="$t('Schema Title')"
            :placeholder="$t('Enter schema title')"
          />
          <el-form-item :label="$t('Root Type')">
            <el-select v-model="rootSchema.type" size="default">
              <el-option 
                v-for="option in typeOptions" 
                :key="option.value" 
                :label="option.label" 
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </div>
        <FormInput 
          v-model="rootSchema.description" 
          :title="$t('Schema Description')"
          :placeholder="$t('Enter schema description')"
        />
      </div>
    </div>

    <div class="properties-section" v-if="rootSchema.type === 'object'">
      <div class="properties-header">
        <h5>{{ $t('Properties') }}</h5>
        <el-button type="primary" size="small" @click="addProperty">
          <el-icon><Plus /></el-icon>
          {{ $t('Add Property') }}
        </el-button>
      </div>

      <div class="properties-list">
        <el-empty v-if="schemaProperties.length === 0" :description="$t('No properties defined')">
          <el-button type="primary" @click="addProperty">{{ $t('Add First Property') }}</el-button>
        </el-empty>

        <el-card 
          v-for="(property, index) in schemaProperties" 
          :key="property.id"
          class="property-card"
          shadow="hover"
        >
          <div class="property-header">
            <div class="property-info">
              <el-tag :type="property.required ? 'danger' : 'info'" size="small">
                {{ property.type }}
              </el-tag>
              <strong>{{ property.key }}</strong>
              <span v-if="property.description" class="property-desc">{{ property.description }}</span>
            </div>
            <div class="property-actions">
              <el-button 
                size="small" 
                circle 
                :disabled="index === 0"
                @click="movePropertyUp(index)"
              >
                <el-icon><ArrowUp /></el-icon>
              </el-button>
              <el-button 
                size="small" 
                circle 
                :disabled="index === schemaProperties.length - 1"
                @click="movePropertyDown(index)"
              >
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                circle 
                @click="removeProperty(index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>

          <div class="property-content">
            <FormInput 
              v-model="property.key" 
              :title="$t('Key')" 
              required
              :placeholder="$t('property_key')"
            />

            <div class="form-row">
              <el-form-item :label="$t('Type')">
                <el-select v-model="property.type" size="default">
                  <el-option 
                    v-for="option in typeOptions" 
                    :key="option.value" 
                    :label="option.label" 
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
              <FormInput 
                v-model="property.required" 
                :title="$t('Required')" 
                type="switch"
              />
            </div>

            <FormInput 
              v-model="property.description" 
              :title="$t('Description')"
              :placeholder="$t('Property description')"
            />

            <!-- String-specific properties -->
            <div v-if="property.type === 'string'" class="type-specific">
              <div class="form-row">
                <FormInput 
                  v-model="property.minLength" 
                  :title="$t('Min Length')" 
                  type="number"
                />
                <FormInput 
                  v-model="property.maxLength" 
                  :title="$t('Max Length')" 
                  type="number"
                />
              </div>
              <FormInput 
                v-model="property.pattern" 
                :title="$t('Pattern (RegEx)')"
                :placeholder="$t('Enter regex pattern')"
              />
              
              <!-- Enum options -->
              <div class="enum-section">
                <div class="enum-header">
                  <label>{{ $t('Allowed Values (Enum)') }}</label>
                  <el-button size="small" @click="addEnumOption(index)">
                    <el-icon><Plus /></el-icon>
                    {{ $t('Add Option') }}
                  </el-button>
                </div>
                <div v-if="property.enum && property.enum.length > 0" class="enum-list">
                  <div 
                    v-for="(option, optIndex) in property.enum" 
                    :key="optIndex"
                    class="enum-item"
                  >
                    <el-input 
                      v-model="property.enum[optIndex]" 
                      :placeholder="$t('Option value')"
                      size="small"
                    />
                    <el-button 
                      type="danger" 
                      size="small" 
                      circle
                      @click="removeEnumOption(index, optIndex)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Number-specific properties -->
            <div v-if="property.type === 'number' || property.type === 'integer'" class="type-specific">
              <div class="form-row">
                <FormInput 
                  v-model="property.minimum" 
                  :title="$t('Minimum')" 
                  type="number"
                />
                <FormInput 
                  v-model="property.maximum" 
                  :title="$t('Maximum')" 
                  type="number"
                />
              </div>
            </div>

            <!-- Array-specific properties -->
            <div v-if="property.type === 'array'" class="type-specific">
              <el-form-item :label="$t('Array Item Type')">
                <el-select v-model="property.items.type" size="default" v-if="property.items">
                  <el-option 
                    v-for="option in typeOptions.filter(opt => opt.value !== 'array' && opt.value !== 'object')" 
                    :key="option.value" 
                    :label="option.label" 
                    :value="option.value"
                  />
                </el-select>
                <el-button v-else @click="property.items = { id: Math.random().toString(36).substr(2, 9), key: 'item', type: 'string', description: '', required: false }">
                  {{ $t('Define Item Type') }}
                </el-button>
              </el-form-item>
              <div v-if="property.items">
                <FormInput 
                  v-model="property.items.description" 
                  :title="$t('Item Description')"
                />
              </div>
            </div>

            <!-- Default value -->
            <FormInput 
              v-model="property.default" 
              :title="$t('Default Value')"
              :placeholder="$t('Default value for this property')"
            />
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-schema-builder {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.schema-header {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1rem;
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-controls h4 {
  margin: 0;
}

.root-schema-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.form-row > * {
  flex: 1;
}

.properties-section {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1rem;
}

.properties-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.properties-header h5 {
  margin: 0;
}

.properties-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.property-card {
  border-left: 3px solid var(--el-color-primary);
  max-width: 100%;
}

.property-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.property-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.property-desc {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
  font-weight: normal;
}

.property-actions {
  display: flex;
  gap: 0.25rem;
}

.property-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.type-specific {
  background-color: var(--el-fill-color-lighter);
  border-radius: 6px;
  padding: 1rem;
  border: 1px solid var(--el-border-color-light);
}

.enum-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.enum-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.enum-header label {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.enum-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.enum-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.enum-item .el-input {
  flex: 1;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .property-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .property-info {
    align-items: flex-start;
  }
  
  .property-actions {
    justify-content: flex-end;
    align-self: flex-end;
  }
}
</style>
