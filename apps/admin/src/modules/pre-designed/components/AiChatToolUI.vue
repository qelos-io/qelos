<template>
  <div class="ai-tool-ui" :class="[toolName, { resolved: isResolved }]">
    <!-- Confirm Tool -->
    <template v-if="toolName === 'confirm'">
      <div class="tool-message">{{ args.message || "Please confirm" }}</div>
      <div class="tool-actions" v-if="!isResolved">
        <el-button type="primary" size="small" @click="resolve('yes')">
          {{ args.confirmLabel || "Yes" }}
        </el-button>
        <el-button size="small" @click="resolve('no')">
          {{ args.denyLabel || "No" }}
        </el-button>
      </div>
      <div class="tool-result" v-else>
        <el-tag :type="resolvedValue === 'yes' ? 'success' : 'danger'" size="small">
          {{
            resolvedValue === "yes"
              ? args.confirmLabel || "Yes"
              : args.denyLabel || "No"
          }}
        </el-tag>
      </div>
    </template>

    <!-- Select Tool -->
    <template v-else-if="toolName === 'select'">
      <div class="tool-message">{{ args.message || "Select an option" }}</div>
      <div class="tool-options" v-if="!isResolved">
        <el-button
          v-for="(opt, idx) in normalizedOptions"
          :key="idx"
          size="small"
          @click="resolve(opt.value)"
        >
          {{ opt.label }}
        </el-button>
      </div>
      <div class="tool-result" v-else>
        <el-tag size="small">{{ resolvedLabel }}</el-tag>
      </div>
    </template>

    <!-- Multi-Select Tool -->
    <template v-else-if="toolName === 'multi_select'">
      <div class="tool-message">
        {{ args.message || "Select one or more options" }}
      </div>
      <div class="tool-options" v-if="!isResolved">
        <el-checkbox-group v-model="multiSelected">
          <el-checkbox
            v-for="(opt, idx) in normalizedOptions"
            :key="idx"
            :label="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-checkbox>
        </el-checkbox-group>
        <el-button
          type="primary"
          size="small"
          :disabled="multiSelected.length === 0"
          @click="resolve(multiSelected)"
          style="margin-block-start: 8px"
        >
          {{ args.submitLabel || "Submit" }}
        </el-button>
      </div>
      <div class="tool-result" v-else>
        <el-tag v-for="v in resolvedValue" :key="v" size="small" style="margin-inline-end: 4px">
          {{ getOptionLabel(v) }}
        </el-tag>
      </div>
    </template>

    <!-- Form Tool -->
    <template v-else-if="toolName === 'form'">
      <div class="tool-message">{{ args.message || "Please fill in the form" }}</div>
      <div class="tool-form" v-if="!isResolved">
        <div
          v-for="field in normalizedFields"
          :key="field.name"
          class="tool-form-field"
        >
          <label>{{ field.label || field.name }}</label>
          <el-input
            v-if="field.type === 'text' || !field.type"
            v-model="formValues[field.name]"
            :placeholder="field.placeholder"
            size="small"
            dir="ltr"
          />
          <el-input
            v-else-if="field.type === 'number'"
            v-model.number="formValues[field.name]"
            type="number"
            :placeholder="field.placeholder"
            size="small"
            dir="ltr"
          />
          <el-select
            v-else-if="field.type === 'select'"
            v-model="formValues[field.name]"
            :placeholder="field.placeholder"
            size="small"
          >
            <el-option
              v-for="o in field.options || []"
              :key="typeof o === 'string' ? o : o.value"
              :label="typeof o === 'string' ? o : o.label"
              :value="typeof o === 'string' ? o : o.value"
            />
          </el-select>
        </div>
        <el-button
          type="primary"
          size="small"
          :disabled="!isFormValid"
          @click="resolve(formValues)"
          style="margin-block-start: 8px"
        >
          {{ args.submitLabel || "Submit" }}
        </el-button>
      </div>
      <div class="tool-result" v-else>
        <div v-for="(val, key) in resolvedValue" :key="key" class="tool-result-field">
          <span class="field-label">{{ getFieldLabel(String(key)) }}:</span>
          <span class="field-value">{{ val }}</span>
        </div>
      </div>
    </template>

    <!-- Date Tool -->
    <template v-else-if="toolName === 'date'">
      <div class="tool-message">{{ args.message || "Pick a date" }}</div>
      <div class="tool-picker" v-if="!isResolved">
        <el-date-picker
          v-model="pickerValue"
          type="date"
          size="small"
          value-format="YYYY-MM-DD"
          :disabled-date="disabledDate"
          :default-value="args.defaultValue ? new Date(args.defaultValue) : undefined"
        />
        <el-button
          type="primary"
          size="small"
          :disabled="!pickerValue"
          @click="resolve(pickerValue)"
        >
          OK
        </el-button>
      </div>
      <div class="tool-result" v-else>
        <el-tag size="small">{{ resolvedValue }}</el-tag>
      </div>
    </template>

    <!-- Time Tool -->
    <template v-else-if="toolName === 'time'">
      <div class="tool-message">{{ args.message || "Pick a time" }}</div>
      <div class="tool-picker" v-if="!isResolved">
        <el-time-picker
          v-model="pickerValue"
          size="small"
          format="HH:mm"
          value-format="HH:mm"
          :default-value="args.defaultValue"
        />
        <el-button
          type="primary"
          size="small"
          :disabled="!pickerValue"
          @click="resolve(pickerValue)"
        >
          OK
        </el-button>
      </div>
      <div class="tool-result" v-else>
        <el-tag size="small">{{ resolvedValue }}</el-tag>
      </div>
    </template>

    <!-- Datetime Tool -->
    <template v-else-if="toolName === 'datetime'">
      <div class="tool-message">{{ args.message || "Pick a date and time" }}</div>
      <div class="tool-picker" v-if="!isResolved">
        <el-date-picker
          v-model="pickerValue"
          type="datetime"
          size="small"
          value-format="YYYY-MM-DD HH:mm"
          :disabled-date="disabledDate"
          :default-value="args.defaultValue ? new Date(args.defaultValue) : undefined"
        />
        <el-button
          type="primary"
          size="small"
          :disabled="!pickerValue"
          @click="resolve(pickerValue)"
        >
          OK
        </el-button>
      </div>
      <div class="tool-result" v-else>
        <el-tag size="small">{{ resolvedValue }}</el-tag>
      </div>
    </template>

    <!-- Number Tool (slider when min+max, input otherwise) -->
    <template v-else-if="toolName === 'number'">
      <div class="tool-message">{{ args.message || "Enter a number" }}</div>
      <div class="tool-number" v-if="!isResolved">
        <template v-if="hasRange">
          <el-slider
            v-model="numberValue"
            :min="args.min"
            :max="args.max"
            :step="args.step || 1"
            show-input
            size="small"
          />
        </template>
        <template v-else>
          <el-input-number
            v-model="numberValue"
            :min="args.min"
            :max="args.max"
            :step="args.step || 1"
            size="small"
          />
        </template>
        <el-button
          type="primary"
          size="small"
          :disabled="numberValue === null || numberValue === undefined"
          @click="resolve(numberValue)"
          style="margin-block-start: 8px"
        >
          OK
        </el-button>
      </div>
      <div class="tool-result" v-else>
        <el-tag size="small">{{ resolvedValue }}</el-tag>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, reactive } from "vue";

interface ToolOption {
  label: string;
  value: string;
}

interface FormField {
  name: string;
  label?: string;
  type?: "text" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  options?: Array<string | { label: string; value: string }>;
}

const props = defineProps<{
  toolName: string;
  args: Record<string, any>;
}>();

const emit = defineEmits<{
  resolved: [value: any];
}>();

const isResolved = ref(false);
const resolvedValue = ref<any>(null);

const multiSelected = ref<string[]>([]);
const formValues = reactive<Record<string, any>>({});
const pickerValue = ref<string | null>(props.args.defaultValue || null);
const numberValue = ref<number | null>(
  props.args.defaultValue ?? (props.args.min != null && props.args.max != null
    ? Math.round((props.args.min + props.args.max) / 2)
    : null),
);

const hasRange = computed(
  () => props.args.min != null && props.args.max != null,
);

function disabledDate(date: Date): boolean {
  if (props.args.min && date < new Date(props.args.min)) return true;
  if (props.args.max && date > new Date(props.args.max + "T23:59:59")) return true;
  return false;
}

const normalizedOptions = computed<ToolOption[]>(() => {
  const opts = props.args.options;
  if (!Array.isArray(opts)) return [];
  return opts.map((o: any) =>
    typeof o === "string" ? { label: o, value: o } : { label: o.label || o.value, value: o.value },
  );
});

const normalizedFields = computed<FormField[]>(() => {
  const fields = props.args.fields;
  if (!Array.isArray(fields)) return [];
  return fields.map((f: any) =>
    typeof f === "string" ? { name: f } : f,
  );
});

const isFormValid = computed(() => {
  return normalizedFields.value
    .filter((f) => f.required !== false)
    .every((f) => formValues[f.name] !== undefined && formValues[f.name] !== "");
});

const resolvedLabel = computed(() => {
  const opt = normalizedOptions.value.find((o) => o.value === resolvedValue.value);
  return opt?.label || resolvedValue.value;
});

function getOptionLabel(value: string) {
  const opt = normalizedOptions.value.find((o) => o.value === value);
  return opt?.label || value;
}

function getFieldLabel(name: string) {
  const field = normalizedFields.value.find((f) => f.name === name);
  return field?.label || name;
}

function resolve(value: any) {
  isResolved.value = true;
  resolvedValue.value = value;
  emit("resolved", value);
}
</script>

<style scoped>
.ai-tool-ui {
  padding: 10px 0;
}

.ai-tool-ui.resolved {
  opacity: 0.85;
}

.tool-message {
  font-size: 0.92em;
  margin-block-end: 8px;
  color: var(--text-color, #333);
}

.tool-actions,
.tool-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-result {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.tool-result-field {
  display: flex;
  gap: 4px;
  font-size: 0.88em;
}

.tool-result-field .field-label {
  font-weight: 600;
  color: var(--text-color-secondary, #666);
}

.tool-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 320px;
}

.tool-form-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tool-form-field label {
  font-size: 0.85em;
  font-weight: 500;
  color: var(--text-color-secondary, #555);
}

.tool-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-number {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 320px;
}
</style>
