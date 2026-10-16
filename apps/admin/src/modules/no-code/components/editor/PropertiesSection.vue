<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { BlueprintPropertyType, IBlueprint } from '@qelos/global-types';
import PropertyPanel from './PropertyPanel.vue';
import {
  describeProperty,
  getPropertyLink,
  propertyRows,
  removeProperty,
  uniquePropertyKey,
} from '../../services/blueprint-editor';
import { useBlueprintsStore } from '../../store/blueprints';

const props = defineProps<{ blueprint: Partial<IBlueprint>; loading?: boolean }>();

const { t } = useI18n();
const blueprints = useBlueprintsStore();

const rows = computed(() => propertyRows(props.blueprint.properties));
const open = ref<string | null>(null);
/** keys added in this visit whose key still follows the title */
const following = ref(new Set<string>());

const nameOf = (identifier: string) => blueprints.blueprints?.find((item) => item.identifier === identifier)?.name || identifier;

function toggle(key: string) {
  open.value = open.value === key ? null : key;
}

async function add() {
  const key = uniquePropertyKey(props.blueprint.properties, 'property');
  props.blueprint.properties = {
    ...props.blueprint.properties,
    [key]: { title: '', type: BlueprintPropertyType.STRING, description: '', required: false },
  };
  following.value.add(key);
  open.value = key;
  await nextTick();
  document.querySelector<HTMLInputElement>(`#prop-${key} .panel input`)?.focus();
  document.getElementById(`prop-${key}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function remove(key: string) {
  const title = props.blueprint.properties?.[key]?.title || key;
  try {
    await ElMessageBox.confirm(t('Remove "{title}"? Its links, calculation and limits go with it. Data already saved on entities is not deleted.', { title }), t('Remove property'), {
      type: 'warning',
      confirmButtonText: t('Remove'),
      cancelButtonText: t('Cancel'),
    });
  } catch {
    return;
  }
  Object.assign(props.blueprint, removeProperty(props.blueprint, key));
  following.value.delete(key);
  if (open.value === key) open.value = null;
}

function onRenamed(oldKey: string, newKey: string) {
  if (open.value === oldKey) open.value = newKey;
  if (following.value.delete(oldKey)) following.value.add(newKey);
}
</script>

<template>
  <section aria-labelledby="props-title">
    <header class="head">
      <div>
        <h2 id="props-title">{{ $t('Properties') }}</h2>
        <p class="lead" dir="auto">{{ $t('The fields every entity of this blueprint carries. Each entity also gets an id, a title and its creator automatically.') }}</p>
      </div>
      <el-button type="primary" @click="add">{{ $t('Add property') }}</el-button>
    </header>

    <el-skeleton v-if="loading" animated :rows="4" />

    <div v-else-if="!rows.length" class="empty">
      <p>{{ $t('No properties yet.') }}</p>
      <el-button type="primary" plain @click="add">{{ $t('Add the first property') }}</el-button>
    </div>

    <ul v-else class="rows">
      <!-- keyed by position: a key rename must not re-create the row, or the title input loses focus on every keystroke -->
      <li v-for="(row, position) in rows" :id="`prop-${row.key}`" :key="position" class="row" :class="{ open: open === row.key }">
        <div class="line">
          <button type="button" class="summary" :aria-expanded="open === row.key" :aria-controls="`prop-panel-${row.key}`" @click="toggle(row.key)">
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="chev" aria-hidden="true" />
            <span class="name">
              <strong dir="auto">{{ row.title || $t('Untitled property') }}</strong>
              <code dir="ltr">{{ row.key }}</code>
            </span>
            <span class="chips">
              <el-tag size="small" type="info" effect="plain">{{ $t(describeProperty(row).typeLabel) }}</el-tag>
              <el-tag v-for="fact in describeProperty(row).facts" :key="fact" size="small" type="info" effect="plain" dir="auto">{{ fact === 'List' ? $t('A list of values') : fact }}</el-tag>
              <el-tag v-if="getPropertyLink(blueprint, row.key)" size="small" effect="plain">{{ $t('Links to {name}', { name: nameOf(getPropertyLink(blueprint, row.key) as string) }) }}</el-tag>
              <el-tag v-if="row.required" size="small" type="warning" effect="plain">{{ $t('Required') }}</el-tag>
            </span>
          </button>
          <el-button text circle class="del" :aria-label="$t('Remove {title}', { title: row.title || row.key })" @click="remove(row.key)">
            <font-awesome-icon :icon="['fas', 'trash-can']" />
          </el-button>
        </div>
        <div v-if="open === row.key" :id="`prop-panel-${row.key}`" class="body">
          <PropertyPanel
            :blueprint="blueprint"
            :property-key="row.key"
            :follow-title="following.has(row.key)"
            @renamed="onRenamed(row.key, $event)"
            @key-edited="following.delete(row.key)"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-block-end: 16px;
}

h2 {
  margin: 0;
  padding: 0;
  font-size: 1.15rem;
  font-weight: 600;
  text-align: start;
}

.lead {
  margin: 4px 0 0;
  max-inline-size: 62ch;
  color: var(--el-text-color-secondary);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 24px;
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;
  color: var(--el-text-color-secondary);
}

.empty p {
  margin: 0;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));
  transition: border-color 0.15s ease;
}

.row:hover,
.row.open {
  border-color: var(--el-border-color);
}

.line {
  display: flex;
  align-items: center;
}

.summary {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-inline-size: 0;
  padding: 12px 8px 12px 14px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.summary:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}

.chev {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--el-text-color-secondary);
  transition: transform 0.15s ease;
}

[dir='rtl'] .chev {
  transform: scaleX(-1);
}

.open .chev {
  transform: rotate(90deg);
}

.name {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  flex: 0 1 220px;
}

.name strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name code {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-inline-size: 0;
}

.del {
  flex-shrink: 0;
  margin-inline-end: 8px;
  color: var(--el-text-color-secondary);
}

.del:hover {
  color: var(--el-color-danger);
}

.body {
  padding: 4px 18px 18px 38px;
  border-block-start: 1px solid var(--el-border-color-extra-light);
  padding-block-start: 16px;
}

@media (max-width: 640px) {
  .head {
    flex-direction: column;
  }

  .summary {
    flex-wrap: wrap;
  }

  .name {
    flex-basis: calc(100% - 32px);
  }

  .body {
    padding-inline-start: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chev,
  .row {
    transition: none;
  }
}
</style>
