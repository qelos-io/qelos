<script setup lang="ts">
import { computed, ref } from 'vue';
import { IBlueprint, IBlueprintLimitation, PermissionScope } from '@qelos/global-types';
import { useI18n } from 'vue-i18n';
import { useBlueprintsStore } from '../../store/blueprints';
import { collectVocabulary } from '../../services/blueprint-editor';

const props = defineProps<{ blueprint: Partial<IBlueprint> }>();

const { t } = useI18n();
const store = useBlueprintsStore();
const vocabulary = computed(() => collectVocabulary([...(store.blueprints || []), props.blueprint]));
const limits = computed(() => props.blueprint.limitations || []);
const propertyOptions = computed(() => Object.entries(props.blueprint.properties || {}).map(([key, property]) => ({ key, title: property.title || key })));
const open = ref<number | null>(null);

const SCOPES = [
  { value: PermissionScope.USER, label: 'Each user' },
  { value: PermissionScope.WORKSPACE, label: 'Each workspace' },
  { value: PermissionScope.TENANT, label: 'The whole application' },
];

function sentence(limit: IBlueprintLimitation): string {
  const scope = t(SCOPES.find((item) => item.value === limit.scope)?.label || 'Each user');
  return t('{scope}: at most {count} entities', { scope, count: limit.value });
}

function details(limit: IBlueprintLimitation): string[] {
  const list: string[] = [];
  const titles = (limit.properties || []).map((key) => props.blueprint.properties?.[key]?.title || key).join(', ');
  if (titles) list.push(t('Same {properties}', { properties: titles }));
  if (limit.roles?.length) list.push(t('Roles: {roles}', { roles: limit.roles.join(', ') }));
  if (limit.workspaceLabels?.length) list.push(t('Workspaces: {labels}', { labels: limit.workspaceLabels.join(', ') }));
  return list;
}

function write(next: IBlueprintLimitation[]) {
  props.blueprint.limitations = next;
}

function add() {
  write([
    ...limits.value,
    { scope: props.blueprint.permissionScope || PermissionScope.USER, value: 1, roles: [], workspaceLabels: [], properties: [] },
  ]);
  open.value = limits.value.length - 1;
}

function patch(index: number, changes: Partial<IBlueprintLimitation>) {
  write(limits.value.map((limit, i) => (i === index ? { ...limit, ...changes } : limit)));
}

function remove(index: number) {
  write(limits.value.filter((_, i) => i !== index));
  open.value = null;
}
</script>

<template>
  <section aria-labelledby="limits-title">
    <header class="head">
      <div>
        <h2 id="limits-title">{{ $t('Limits') }}</h2>
        <p class="lead" dir="auto">{{ $t('Cap how many entities people can create, for example one profile per user.') }}</p>
      </div>
      <el-button type="primary" plain @click="add">{{ $t('Add limit') }}</el-button>
    </header>

    <p v-if="!limits.length" class="none">{{ $t('No limits. Anyone allowed to create entities can create as many as they like.') }}</p>

    <ul v-else class="rows">
      <li v-for="(limit, index) in limits" :key="index" class="row" :class="{ open: open === index }">
        <div class="line">
          <button type="button" class="summary" :aria-expanded="open === index" @click="open = open === index ? null : index">
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="chev" aria-hidden="true" />
            <span dir="auto" class="sentence">{{ sentence(limit) }}</span>
            <span class="chips">
              <el-tag v-for="detail in details(limit)" :key="detail" size="small" type="info" effect="plain" dir="auto">{{ detail }}</el-tag>
            </span>
          </button>
          <el-button text circle class="del" :aria-label="$t('Remove limit')" @click="remove(index)">
            <font-awesome-icon :icon="['fas', 'trash-can']" />
          </el-button>
        </div>
        <div v-if="open === index" class="body">
          <div class="grid">
            <el-form-item :label="$t('Counted for')">
              <el-select :model-value="limit.scope" @update:model-value="patch(index, { scope: $event })">
                <el-option v-for="scope in SCOPES" :key="scope.value" :label="$t(scope.label)" :value="scope.value" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('At most')">
              <el-input :model-value="limit.value" type="number" min="1" dir="ltr" @update:model-value="patch(index, { value: Math.max(1, Number($event) || 1) })" />
            </el-form-item>
            <el-form-item :label="$t('Only entities sharing the same')" class="span">
              <el-select :model-value="limit.properties || []" multiple filterable :placeholder="$t('Leave empty to count every entity')" @update:model-value="patch(index, { properties: $event })">
                <el-option v-for="option in propertyOptions" :key="option.key" :label="option.title" :value="option.key" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('For roles')">
              <el-select :model-value="limit.roles || []" multiple filterable allow-create default-first-option :reserve-keyword="false" :placeholder="$t('All roles')" @update:model-value="patch(index, { roles: $event })">
                <el-option v-for="role in vocabulary.roles" :key="role" :label="role" :value="role" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('In workspaces labeled')">
              <el-select :model-value="limit.workspaceLabels || []" multiple filterable allow-create default-first-option :reserve-keyword="false" :placeholder="$t('All workspaces')" @update:model-value="patch(index, { workspaceLabels: $event })">
                <el-option v-for="label in vocabulary.workspaceLabels.filter((item) => item !== '*')" :key="label" :label="label" :value="label" />
              </el-select>
            </el-form-item>
          </div>
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

.none {
  margin: 0;
  color: var(--el-text-color-secondary);
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
}

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

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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

.del {
  margin-inline-end: 8px;
  color: var(--el-text-color-secondary);
}

.del:hover {
  color: var(--el-color-danger);
}

.body {
  padding: 16px 18px 6px 38px;
  border-block-start: 1px solid var(--el-border-color-extra-light);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 0 16px;
}

.grid :deep(.el-form-item) {
  margin-block-end: 14px;
}

.span {
  grid-column: 1 / -1;
}

@media (max-width: 640px) {
  .head {
    flex-direction: column;
  }

  .grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .body {
    padding-inline-start: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chev {
    transition: none;
  }
}
</style>
