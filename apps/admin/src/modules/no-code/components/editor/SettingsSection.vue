<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { EntityIdentifierMechanism, IBlueprint } from '@qelos/global-types';

const props = defineProps<{ blueprint: Partial<IBlueprint>; isNew: boolean; identifierError?: string }>();
const emit = defineEmits<{ identifierEdited: [] }>();

const { t } = useI18n();

const base = computed(() => `/api/blueprints/${props.blueprint.identifier || 'identifier'}/entities`);
const endpoints = computed(() => [
  { label: 'List', method: 'GET', path: base.value },
  { label: 'Create', method: 'POST', path: base.value },
  { label: 'Get one', method: 'GET', path: `${base.value}/:id` },
  { label: 'Update', method: 'PUT', path: `${base.value}/:id` },
  { label: 'Delete', method: 'DELETE', path: `${base.value}/:id` },
]);

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('Copied'));
  } catch {
    ElMessage.warning(t('Could not copy'));
  }
}

function onIdentifier(value: string) {
  props.blueprint.identifier = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
  emit('identifierEdited');
}
</script>

<template>
  <section aria-labelledby="settings-title">
    <header class="head">
      <h2 id="settings-title">{{ $t('Settings') }}</h2>
    </header>

    <el-form-item :label="$t('Identifier')" :error="identifierError ? $t(identifierError) : ''" class="field">
      <el-input v-if="isNew" :model-value="blueprint.identifier" dir="ltr" class="mono" @update:model-value="onIdentifier" />
      <div v-else class="fixed">
        <code dir="ltr">{{ blueprint.identifier }}</code>
        <el-button text size="small" @click="copy(blueprint.identifier || '')">{{ $t('Copy') }}</el-button>
      </div>
      <p class="hint">{{ isNew ? $t('Used in API calls and links. Lowercase letters, numbers and underscores. It cannot change after the blueprint is created.') : $t('Used in API calls and links. It cannot change after the blueprint is created.') }}</p>
    </el-form-item>

    <el-form-item :label="$t('Entity ids')" class="field">
      <el-select :model-value="blueprint.entityIdentifierMechanism" @update:model-value="blueprint.entityIdentifierMechanism = $event">
        <el-option :label="$t('Object ID (MongoDB)')" :value="EntityIdentifierMechanism.OBJECT_ID" />
        <el-option :label="$t('GUID')" :value="EntityIdentifierMechanism.GUID" />
      </el-select>
      <p class="hint">{{ $t('How the id of each new entity is generated.') }}</p>
    </el-form-item>

    <div class="api">
      <h3>{{ $t('API') }}</h3>
      <ul>
        <li v-for="endpoint in endpoints" :key="endpoint.label + endpoint.method">
          <span class="label">{{ $t(endpoint.label) }}</span>
          <code dir="ltr"><b>{{ endpoint.method }}</b> {{ endpoint.path }}</code>
          <el-button text circle size="small" :aria-label="$t('Copy {what}', { what: endpoint.path })" @click="copy(endpoint.path)">
            <font-awesome-icon :icon="['far', 'copy']" />
          </el-button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.head {
  margin-block-end: 16px;
}

h2 {
  margin: 0;
  padding: 0;
  font-size: 1.15rem;
  font-weight: 600;
  text-align: start;
}

h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  padding-block-end: 8px;
  border-block-end: 1px solid var(--el-border-color-lighter);
}

.field {
  max-inline-size: 460px;
}

.mono :deep(input),
code {
  font-family: var(--el-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.9em;
}

.fixed {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint {
  flex-basis: 100%;
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.api {
  margin-block-start: 28px;
}

.api ul {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.api li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-block: 6px;
}

.label {
  flex: 0 0 76px;
  color: var(--el-text-color-secondary);
}

.api code {
  flex: 1;
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.api b {
  display: inline-block;
  min-inline-size: 52px;
  color: var(--el-color-primary);
}
</style>
