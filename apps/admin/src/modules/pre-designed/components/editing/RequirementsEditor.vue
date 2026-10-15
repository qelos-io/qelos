<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowDown, ArrowUp, Delete, Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import Monaco from '@/modules/users/components/Monaco.vue';
import BlueprintRequirement from '@/pre-designed/editor/components/BlueprintRequirement.vue';
import CrudRequirement from '@/pre-designed/editor/components/CrudRequirement.vue';
import DataRequirement from '@/pre-designed/editor/components/DataRequirement.vue';
import HttpRequirement from '@/pre-designed/editor/components/HttpRequirement.vue';
import { useScreenRequirementsStore } from '../../compositions/screen-requirements';
import { duplicateKeys, requirementType } from '../../services/validate-structure';

type Row = Record<string, any>;
const rows = defineModel<Row[]>({ required: true });

const { t } = useI18n();
const live = useScreenRequirementsStore();
const open = ref<number | null>(null);
const jsonMode = ref(false);
const jsonText = ref('');

const TYPES = [
  { value: 'fromBlueprint', label: 'Blueprint', hint: 'Entities of a blueprint', make: () => ({ fromBlueprint: { name: '' } }) },
  { value: 'fromCrud', label: 'Resource', hint: 'A resource of a plugin', make: () => ({ fromCrud: { name: '' } }) },
  { value: 'fromHTTP', label: 'HTTP request', hint: 'Any API address', make: () => ({ fromHTTP: { uri: '' } }) },
  { value: 'fromData', label: 'Fixed data', hint: 'Values you type here', make: () => ({ fromData: {} }) },
] as const;

const duplicates = computed(() => duplicateKeys(rows.value));
const labelOf = (row: Row) => TYPES.find((type) => type.value === requirementType(row))?.label || '';

function summary(row: Row) {
  if (row.fromBlueprint?.name) return row.fromBlueprint.name;
  if (row.fromCrud?.name) return row.fromCrud.name;
  if (row.fromHTTP?.uri) return row.fromHTTP.uri;
  return '';
}

function add(type: (typeof TYPES)[number]['value']) {
  const made = TYPES.find((item) => item.value === type)!.make();
  rows.value.push({ key: '', ...made });
  open.value = rows.value.length - 1;
}

function remove(index: number) {
  rows.value.splice(index, 1);
  if (open.value === index) open.value = null;
}

function move(index: number, by: -1 | 1) {
  const target = index + by;
  if (target < 0 || target >= rows.value.length) return;
  const [item] = rows.value.splice(index, 1);
  rows.value.splice(target, 0, item);
  if (open.value === index) open.value = target;
}

function changeType(row: Row, type: string) {
  const data = row[requirementType(row)];
  delete row[requirementType(row)];
  row[type] = data;
}

const json = (value: unknown) => JSON.stringify(value, null, 2);
const updateRowJson = (row: Row, key: string, value: string) => {
  try {
    row[key] = JSON.parse(value);
  } catch {
    /* typing: keep the last valid value */
  }
};
const clearIfEmpty = (value: unknown, target: Row, key: string) => {
  if (value === '') delete target[key];
};
/** what the page really received for this requirement */
const liveResult = (row: Row) => (row.key ? (live.requirements as Record<string, unknown> | undefined)?.[row.key] : undefined);

function toggleJson() {
  if (!jsonMode.value) {
    jsonText.value = json(rows.value);
    jsonMode.value = true;
    return;
  }
  try {
    rows.value = JSON.parse(jsonText.value);
    jsonMode.value = false;
  } catch {
    ElMessage.error(t('Invalid JSON format'));
  }
}
</script>

<template>
  <section class="data">
    <header>
      <div>
        <h3>{{ $t('Data this page loads') }}</h3>
        <p dir="auto">{{ $t('Each one becomes a name you can use in the HTML, with its result, loading and loaded states.') }}</p>
      </div>
      <div class="buttons">
        <el-button size="small" :type="jsonMode ? 'primary' : 'default'" @click="toggleJson">{{ $t('JSON') }}</el-button>
        <el-dropdown trigger="click" @command="add">
          <el-button size="small" type="primary" :icon="Plus">{{ $t('Add') }}</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="type in TYPES" :key="type.value" :command="type.value">
                <span class="menu-item"><strong>{{ $t(type.label) }}</strong><small>{{ $t(type.hint) }}</small></span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <Monaco v-if="jsonMode" v-model="jsonText" language="json" height="55vh" />

    <template v-else>
      <p v-if="!rows.length" class="empty">{{ $t('This page loads no data yet.') }}</p>
      <ul v-else class="list">
        <li v-for="(row, index) in rows" :key="index" :class="{ open: open === index }">
          <div class="row-head">
            <button type="button" class="toggle" :aria-expanded="open === index" @click="open = open === index ? null : index">
              <span class="key" dir="ltr">{{ row.key || $t('(no name)') }}</span>
              <span class="type">{{ $t(labelOf(row)) }}</span>
              <span v-if="summary(row)" class="summary" dir="ltr">{{ summary(row) }}</span>
              <el-tag v-if="row.key && duplicates.has(row.key)" size="small" type="danger" effect="plain">{{ $t('Used twice') }}</el-tag>
            </button>
            <span class="row-actions">
              <el-button text circle size="small" :icon="ArrowUp" :disabled="index === 0" :aria-label="$t('Move up')" @click="move(index, -1)" />
              <el-button text circle size="small" :icon="ArrowDown" :disabled="index === rows.length - 1" :aria-label="$t('Move down')" @click="move(index, 1)" />
              <el-button text circle size="small" :icon="Delete" :aria-label="$t('Remove')" @click="remove(index)" />
            </span>
          </div>
          <div v-if="open === index" class="row-body">
            <el-form label-position="top" @submit.prevent>
              <div class="two">
                <el-form-item :label="$t('Name in the HTML')">
                  <el-input v-model="row.key" dir="ltr" :placeholder="$t('todos')" />
                </el-form-item>
                <el-form-item :label="$t('Type')">
                  <el-select :model-value="requirementType(row)" @change="changeType(row, $event)">
                    <el-option v-for="type in TYPES" :key="type.value" :value="type.value" :label="$t(type.label)" />
                  </el-select>
                </el-form-item>
              </div>
            </el-form>
            <BlueprintRequirement v-if="row.fromBlueprint" :model-value="row" :json="json" :get-requirement-result="liveResult" :update-row-json="updateRowJson" :clear-if-empty="clearIfEmpty" />
            <CrudRequirement v-else-if="row.fromCrud" :model-value="row" :json="json" :get-requirement-result="liveResult" :clear-if-empty="clearIfEmpty" />
            <HttpRequirement v-else-if="row.fromHTTP" :model-value="row" :json="json" :get-requirement-result="liveResult" :update-row-json="updateRowJson" :clear-if-empty="clearIfEmpty" />
            <DataRequirement v-else-if="row.fromData" :model-value="row" :json="json" :get-requirement-result="liveResult" :update-row-json="updateRowJson" />
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped lang="scss">
header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 12px;

  h3 {
    margin: 0;
    padding: 0;
    font-size: 1rem;
  }

  p {
    margin: 2px 0 0;
    padding: 0;
    color: var(--el-text-color-secondary);
    font-size: 0.85rem;
    text-align: start;
  }
}

.buttons {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.menu-item {
  display: flex;
  flex-direction: column;

  small {
    color: var(--el-text-color-secondary);
  }
}

.empty {
  margin: 8px 0;
  padding: 0;
  color: var(--el-text-color-secondary);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;

    &.open {
      border-color: var(--el-color-primary-light-5);
    }
  }
}

.row-head {
  display: flex;
  align-items: center;
}

.toggle {
  display: flex;
  flex: 1;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-inline-size: 0;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
    border-radius: 10px;
  }
}

.key {
  font-family: var(--el-font-family-mono, ui-monospace, monospace);
  font-weight: 600;
}

.type {
  padding: 0 8px;
  border-radius: 999px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font-size: 0.75rem;
}

.summary {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  flex-shrink: 0;
  padding-inline-end: 4px;
}

.row-body {
  padding: 4px 14px 14px;
  border-block-start: 1px solid var(--el-border-color-lighter);
}

.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-block-start: 10px;
}
</style>
