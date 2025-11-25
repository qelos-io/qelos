<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import Monaco from '@/modules/users/components/Monaco.vue';

const schemaText = defineModel<string>('modelValue', { required: true });
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>();

type ParameterType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

interface ParameterRow {
  key: string;
  type: ParameterType;
  description: string;
  required: boolean;
}

const collapseState = ref(false);
const mode = ref<'editor' | 'viewer'>('editor');
const rows = ref<ParameterRow[]>([]);
const schemaError = ref<string | null>(null);
const isSyncingFromViewer = ref(false);

const parameterTypeOptions = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Integer', value: 'integer' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Object', value: 'object' },
  { label: 'Array', value: 'array' }
];

const hasProperties = computed(() => rows.value.length > 0);

const parseSchema = (value: string | undefined | null) => {
  if (!value) {
    return {
      type: 'object',
      properties: {},
      required: [] as string[]
    };
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed.type !== 'object') {
      throw new Error('Schema root must be an object');
    }
    return {
      type: 'object',
      properties: parsed.properties || {},
      required: Array.isArray(parsed.required) ? parsed.required : []
    };
  } catch (error: any) {
    schemaError.value = error?.message || 'Invalid JSON schema';
    return {
      type: 'object',
      properties: {},
      required: [] as string[]
    };
  }
};

const syncRowsFromSchema = (value: string) => {
  const schema = parseSchema(value);
  const requiredKeys = new Set(schema.required);
  rows.value = Object.entries(schema.properties || {}).map(([key, property]: [string, any]) => ({
    key,
    type: (property?.type as ParameterType) || 'string',
    description: property?.description || '',
    required: requiredKeys.has(key)
  }));
  schemaError.value = null;
};

const updateSchemaFromRows = () => {
  const schema = {
    type: 'object',
    properties: {} as Record<string, any>,
    required: [] as string[]
  };

  rows.value.forEach((row) => {
    if (!row.key) {
      return;
    }
    schema.properties[row.key] = {
      type: row.type,
      ...(row.description ? { description: row.description } : {})
    };
    if (row.required) {
      schema.required.push(row.key);
    }
  });

  if (!schema.required.length) {
    delete schema.required;
  }

  isSyncingFromViewer.value = true;
  const nextValue = JSON.stringify(schema, null, 2);
  schemaText.value = nextValue;
  emit('update:modelValue', nextValue);
};

watch(
  () => schemaText.value,
  (value) => {
    if (isSyncingFromViewer.value) {
      isSyncingFromViewer.value = false;
      return;
    }
    syncRowsFromSchema(value || '');
  },
  { immediate: true }
);

const addRow = () => {
  rows.value.push({ key: '', type: 'string', description: '', required: false });
};

const removeRow = (index: number) => {
  rows.value.splice(index, 1);
  updateSchemaFromRows();
};

const handleRowChange = () => {
  updateSchemaFromRows();
};

const toggleCollapse = () => {
  collapseState.value = !collapseState.value;
};
</script>

<template>
  <div class="parameters-schema-editor">
    <button class="collapse-header" type="button" @click="toggleCollapse">
      <div class="header-content">
        <strong>Parameters Schema</strong>
        <span class="help-text">
          JSON schema defining the function parameters.
        </span>
      </div>
      <el-icon :class="['collapse-icon', { collapsed: collapseState }]">
        <ArrowDown />
      </el-icon>
    </button>
    <el-collapse-transition>
      <div v-show="!collapseState" class="editor-content">
        <div class="mode-toggle">
          <el-radio-group v-model="mode">
            <el-radio-button label="editor">JSON Editor</el-radio-button>
            <el-radio-button label="viewer">Form Builder</el-radio-button>
          </el-radio-group>
        </div>
        <small class="help-text">
          Example: {"type": "object", "properties": {"location": {"type": "string"}}, "required": ["location"]}
        </small>
        <div v-if="mode === 'editor'" class="monaco-wrapper">
          <Monaco
            v-model="schemaText"
            language="json"
            height="250px"
            @update:modelValue="value => emit('update:modelValue', value)"
          />
        </div>
        <div v-else class="viewer-wrapper">
          <div class="viewer-legend">
            <span>Define each parameter</span>
            <el-button type="primary" size="small" @click="addRow">Add parameter</el-button>
          </div>
          <el-alert
            v-if="schemaError"
            class="mt-2"
            type="error"
            :closable="false"
          >
            {{ schemaError }}
          </el-alert>
          <div v-if="hasProperties" class="parameters-grid">
            <div
              v-for="(row, index) in rows"
              :key="index"
              class="parameter-row"
            >
              <el-input
                v-model="row.key"
                placeholder="propertyKey"
                size="small"
                dir="ltr"
                @change="handleRowChange"
              />
              <el-select
                v-model="row.type"
                placeholder="Type"
                size="small"
                @change="handleRowChange"
              >
                <el-option
                  v-for="option in parameterTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <el-input
                v-model="row.description"
                placeholder="Description"
                size="small"
                @change="handleRowChange"
              />
              <el-checkbox
                v-model="row.required"
                label="Required"
                @change="handleRowChange"
              />
              <el-button
                circle
                type="danger"
                size="small"
                plain
                @click="removeRow(index)"
              >
                <el-icon><icon-delete/></el-icon>
              </el-button>
            </div>
          </div>
          <p v-else class="help-text no-rows">
            No parameters defined. Click "Add parameter" to create one.
          </p>
        </div>
      </div>
    </el-collapse-transition>
  </div>
</template>

<style scoped>
.parameters-schema-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  margin-block-end: 20px;
}

.collapse-header {
  inline-size: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.header-content {
  display: flex;
  flex-direction: column;
  inline-size: calc(100% - 40px);
  text-align: start;
}

.collapse-icon {
  transition: transform 0.2s ease;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.editor-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-toggle {
  display: flex;
  justify-content: flex-end;
}

.monaco-wrapper {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
}

.viewer-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.viewer-legend {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.parameters-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parameter-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 1.5fr auto auto;
  gap: 8px;
  align-items: center;
}

.no-rows {
  margin-block-start: 8px;
}
</style>
