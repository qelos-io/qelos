<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ConnectionIdentity from './ConnectionIdentity.vue';
import {
  buildAuthenticationOverride,
  buildConnectionPayload,
  getConnectionSchema,
  getSchemaDefaults,
  getPath,
  setPath,
  validateConnection,
  type ConnectionField,
} from '../../services/connection-fields';

const props = defineProps<{ modelValue: any; kind: string }>();
const emit = defineEmits<{ submit: [payload: any] }>();

const { t } = useI18n();

const schema = computed(() => getConnectionSchema(props.kind)!);
const isEdit = computed(() => !!props.modelValue?._id);
const model = reactive<any>({
  ...props.modelValue,
  labels: [...(props.modelValue?.labels || [])],
  metadata: { ...(props.modelValue?.metadata || {}) },
});
if (typeof model.metadata.defaultModel !== 'string') delete model.metadata.defaultModel;
for (const [path, value] of Object.entries(getSchemaDefaults(schema.value))) {
  if (!getPath(model, path)) setPath(model, path, value);
}
const typedSecrets = reactive<Record<string, string>>({});
const errors = ref<Record<string, string>>({});
const rootRef = ref<{ $el: HTMLElement } | null>(null);

const fieldValue = (field: ConnectionField) => getPath(model, field.path) ?? '';
const clearError = (path: string) => {
  if (errors.value[path]) {
    const { [path]: _cleared, ...rest } = errors.value;
    errors.value = rest;
  }
};
const setField = (field: ConnectionField, value: string) => {
  setPath(model, field.path, value);
  clearError(field.path);
};
const setSecret = (field: ConnectionField, value: string) => {
  typedSecrets[field.path] = value;
  clearError(field.path);
};
const officialEndpoint = computed(() => {
  const custom = schema.value.customEndpoint;
  return !custom || custom.isOfficial(getPath(model, custom.urlPath));
});
const placeholderFor = (field: ConnectionField) => {
  if (field.type !== 'secret') return field.placeholder;
  if (!officialEndpoint.value) return t('Optional for this endpoint');
  return isEdit.value ? t('Saved - leave empty to keep') : field.placeholder;
};
const inputType = (field: ConnectionField) => (field.type === 'email' ? 'email' : 'text');

function submitForm() {
  errors.value = validateConnection(schema.value, model, typedSecrets, isEdit.value);
  const firstProblem = Object.keys(errors.value)[0];
  if (firstProblem) {
    nextTick(() => {
      const el = rootRef.value?.$el.querySelector<HTMLElement>(`[data-field="${firstProblem}"] input`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el?.focus({ preventScroll: true });
    });
    return;
  }
  emit('submit', buildConnectionPayload(schema.value, props.kind, model, typedSecrets));
}

const getAuthenticationOverride = () => buildAuthenticationOverride(schema.value, typedSecrets);
const getStatusFormModel = () => ({ metadata: { ...model.metadata } });

defineExpose({ submitForm, getAuthenticationOverride, getStatusFormModel });
</script>

<template>
  <el-form ref="rootRef" class="connection-fields" label-position="top" novalidate @submit.prevent="submitForm">
    <section class="group" :aria-label="$t('Connection section basics')">
      <ConnectionIdentity
        v-model:name="model.name"
        v-model:labels="model.labels"
        :error="errors.name"
        @edited="clearError('name')"
      />
      <el-form-item
        v-for="field in schema.basics"
        :key="field.path"
        :label="$t(field.label)"
        :required="field.required"
        :error="errors[field.path] ? $t(errors[field.path]) : ''"
        :data-field="field.path"
      >
        <el-radio-group
          v-if="field.type === 'choice'"
          :model-value="fieldValue(field)"
          @update:model-value="setField(field, $event as string)"
        >
          <el-radio v-for="option in field.options" :key="option.value" :value="option.value">
            {{ $t(option.label) }}
          </el-radio>
        </el-radio-group>
        <el-select
          v-else-if="field.type === 'model'"
          :model-value="fieldValue(field)"
          filterable
          allow-create
          default-first-option
          size="large"
          @update:model-value="setField(field, $event as string)"
        >
          <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value">
            <span class="model-option">
              <span>{{ option.label }}</span>
              <small v-if="option.description">{{ option.description }}</small>
            </span>
          </el-option>
        </el-select>
        <el-input
          v-else
          :model-value="fieldValue(field)"
          :type="inputType(field)"
          :dir="field.ltr ? 'ltr' : 'auto'"
          :placeholder="field.placeholder"
          size="large"
          @update:model-value="setField(field, $event)"
        />
        <p v-if="field.hint" class="hint">{{ $t(field.hint) }}</p>
        <p v-if="field.warnOn && fieldValue(field) === field.warnOn.value" class="warn" role="status">
          <font-awesome-icon :icon="['fas', 'triangle-exclamation']" aria-hidden="true" />
          {{ $t(field.warnOn.text) }}
        </p>
      </el-form-item>
    </section>

    <section v-if="schema.credentials.length" class="group" :aria-label="$t('Connection section authentication')">
      <el-form-item
        v-for="field in schema.credentials"
        :key="field.path"
        :label="$t(field.label)"
        :required="field.required && !isEdit && officialEndpoint"
        :error="errors[field.path] ? $t(errors[field.path]) : ''"
        :data-field="field.path"
      >
        <el-input
          :model-value="typedSecrets[field.path] ?? ''"
          type="password"
          show-password
          dir="ltr"
          autocomplete="new-password"
          size="large"
          :placeholder="placeholderFor(field)"
          @update:model-value="setSecret(field, $event)"
        />
      </el-form-item>
      <el-link
        v-if="schema.help"
        class="help"
        type="primary"
        :href="schema.help.url"
        target="_blank"
        rel="noopener"
        :underline="false"
      >
        {{ $t(schema.help.label) }}
        <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" aria-hidden="true" />
      </el-link>
    </section>
    <el-collapse v-if="schema.apiPaths" class="reference">
      <el-collapse-item name="ref" :title="$t('Connection API reference')">
        <p class="hint">{{ $t('Connection API reference hint') }}</p>
        <ul class="paths">
          <li v-for="path in schema.apiPaths" :key="path">
            <code dir="ltr">/api/ai/sources/{{ modelValue?._id || 'sourceId' }}/{{ path }}</code>
          </li>
        </ul>
      </el-collapse-item>
    </el-collapse>
  </el-form>
</template>

<style scoped>
.group + .group {
  margin-block-start: 8px;
  padding-block-start: 20px;
  border-block-start: 1px solid var(--el-border-color-lighter);
}

.hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.model-option {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.model-option small {
  color: var(--el-text-color-secondary);
}

.reference {
  margin-block-start: 12px;
  border: none;
}

.paths {
  margin: 0;
  padding-inline-start: 18px;
}

.paths code {
  font-size: 12px;
  overflow-wrap: anywhere;
}

.warn {
  display: flex;
  gap: 6px;
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-color-warning-dark-2);
}

.help {
  font-size: 13px;
}

.help :deep(.el-link__inner) {
  gap: 6px;
}
</style>
