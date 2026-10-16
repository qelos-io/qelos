<script setup lang="ts">
import { computed, ref } from 'vue';
import { CRUDOperation, IBlueprint, PermissionScope } from '@qelos/global-types';
import { useBlueprintsStore } from '../../store/blueprints';
import { collectVocabulary, groupPermissions, ruleMatchesNobody } from '../../services/blueprint-editor';

const props = defineProps<{ blueprint: Partial<IBlueprint> }>();

const store = useBlueprintsStore();
const vocabulary = computed(() => collectVocabulary([...(store.blueprints || []), props.blueprint]));
const groups = computed(() => groupPermissions(props.blueprint.permissions));
const open = ref<number | null>(null);

const OPERATION_LABELS: Record<string, string> = {
  [CRUDOperation.CREATE]: 'Create',
  [CRUDOperation.READ]: 'Read',
  [CRUDOperation.UPDATE]: 'Update',
  [CRUDOperation.DELETE]: 'Delete',
};
const SCOPES = [
  { value: PermissionScope.USER, label: 'Their own entities' },
  { value: PermissionScope.WORKSPACE, label: "Their workspace's entities" },
  { value: PermissionScope.TENANT, label: 'Every entity' },
];
const scopeLabel = (scope?: string) => SCOPES.find((item) => item.value === (scope || PermissionScope.USER))?.label || '';

type Rule = NonNullable<IBlueprint['permissions']>[number];

function addRule(operation: CRUDOperation) {
  const permissions = [...(props.blueprint.permissions || [])];
  permissions.push({
    operation,
    scope: props.blueprint.permissionScope || PermissionScope.USER,
    guest: false,
    roleBased: ['admin', 'user'],
    workspaceRoleBased: [],
    workspaceLabelsBased: ['*'],
  } as Rule);
  props.blueprint.permissions = permissions;
  open.value = permissions.length - 1;
}

function removeRule(index: number) {
  props.blueprint.permissions = (props.blueprint.permissions || []).filter((_, i) => i !== index);
  open.value = null;
}

function patchRule(index: number, changes: Partial<Rule>) {
  props.blueprint.permissions = (props.blueprint.permissions || []).map((rule, i) => (i === index ? { ...rule, ...changes } : rule));
}

function who(rule: Partial<Rule>): string[] {
  if (rule.guest) return ['Anyone, even signed out'];
  return [];
}
</script>

<template>
  <section aria-labelledby="access-title">
    <header class="head">
      <h2 id="access-title">{{ $t('Access') }}</h2>
      <p class="lead" dir="auto">{{ $t('Admins can always do everything. These rules decide what everyone else can do with entities of this blueprint.') }}</p>
    </header>

    <el-form-item :label="$t('Default scope')" class="scope">
      <el-select :model-value="blueprint.permissionScope || PermissionScope.USER" @update:model-value="blueprint.permissionScope = $event">
        <el-option v-for="scope in SCOPES" :key="scope.value" :label="$t(scope.label)" :value="scope.value" />
      </el-select>
      <p class="hint">{{ $t('Whose entities a new rule reaches unless you change it on the rule.') }}</p>
    </el-form-item>

    <div v-for="group in groups" :key="group.operation" class="group">
      <div class="group-head">
        <h3>{{ $t(OPERATION_LABELS[group.operation]) }}</h3>
        <el-button text size="small" @click="addRule(group.operation)">{{ $t('Add rule') }}</el-button>
      </div>

      <p v-if="!group.rules.length" class="none">{{ $t('Only admins can do this.') }}</p>

      <ul v-else class="rules">
        <li v-for="{ permission, index } in group.rules" :key="index" class="rule" :class="{ open: open === index }">
          <button type="button" class="summary" :aria-expanded="open === index" @click="open = open === index ? null : index">
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="chev" aria-hidden="true" />
            <span class="chips">
              <el-tag v-for="item in who(permission)" :key="item" size="small" type="warning" effect="plain">{{ $t(item) }}</el-tag>
              <template v-if="!permission.guest">
                <el-tag v-for="role in permission.roleBased" :key="'r' + role" size="small" effect="plain">{{ role === '*' ? $t('Any role') : role }}</el-tag>
                <el-tag v-for="role in permission.workspaceRoleBased" :key="'w' + role" size="small" type="success" effect="plain">{{ $t('Workspace {role}', { role: role === '*' ? $t('any role') : role }) }}</el-tag>
                <el-tag v-if="ruleMatchesNobody(permission)" size="small" type="danger" effect="plain">{{ $t('Matches no one') }}</el-tag>
              </template>
              <span class="scope-text">{{ $t(scopeLabel(permission.scope)) }}</span>
            </span>
          </button>
          <el-button text circle class="del" :aria-label="$t('Remove rule')" @click="removeRule(index)">
            <font-awesome-icon :icon="['fas', 'trash-can']" />
          </el-button>

          <div v-if="open === index" class="body">
            <el-form-item class="guest">
              <el-switch :model-value="permission.guest" @update:model-value="patchRule(index, { guest: !!$event })" />
              <span class="guest-label">
                <strong>{{ $t('Guests') }}</strong>
                <small>{{ $t('People who are not signed in. Roles below no longer matter.') }}</small>
              </span>
            </el-form-item>
            <template v-if="!permission.guest">
              <el-form-item :label="$t('Reaches')">
                <el-select :model-value="permission.scope || PermissionScope.USER" @update:model-value="patchRule(index, { scope: $event })">
                  <el-option v-for="scope in SCOPES" :key="scope.value" :label="$t(scope.label)" :value="scope.value" />
                </el-select>
              </el-form-item>
              <el-form-item :label="$t('Roles')">
                <el-select :model-value="permission.roleBased || []" multiple filterable allow-create default-first-option :reserve-keyword="false" :placeholder="$t('Pick or type a role')" @update:model-value="patchRule(index, { roleBased: $event })">
                  <el-option v-for="role in vocabulary.roles" :key="role" :label="role" :value="role" />
                  <el-option label="*" value="*" />
                </el-select>
                <p class="hint">{{ $t('Anyone with one of these roles. Use * for every role.') }}</p>
              </el-form-item>
              <el-form-item :label="$t('Workspace roles')">
                <el-select :model-value="permission.workspaceRoleBased || []" multiple filterable allow-create default-first-option :reserve-keyword="false" :placeholder="$t('Pick or type a workspace role')" @update:model-value="patchRule(index, { workspaceRoleBased: $event })">
                  <el-option v-for="role in vocabulary.workspaceRoles" :key="role" :label="role" :value="role" />
                  <el-option label="*" value="*" />
                </el-select>
                <p class="hint">{{ $t('Or anyone with one of these roles inside their active workspace.') }}</p>
              </el-form-item>
              <el-form-item :label="$t('Only for workspaces labeled')">
                <el-select :model-value="permission.workspaceLabelsBased || []" multiple filterable allow-create default-first-option :reserve-keyword="false" :placeholder="$t('Any workspace')" @update:model-value="patchRule(index, { workspaceLabelsBased: $event })">
                  <el-option v-for="label in vocabulary.workspaceLabels" :key="label" :label="label === '*' ? $t('Any label (*)') : label" :value="label" />
                </el-select>
              </el-form-item>
            </template>
          </div>
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

.lead {
  margin: 4px 0 0;
  max-inline-size: 62ch;
  color: var(--el-text-color-secondary);
}

.scope {
  max-inline-size: 360px;
  margin-block-end: 20px;
}

.hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.group + .group {
  margin-block-start: 18px;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block-end: 6px;
  border-block-end: 1px solid var(--el-border-color-lighter);
}

h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.none {
  margin: 10px 0 0;
  color: var(--el-text-color-secondary);
}

.rules {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.rule {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));
}

.rule.open {
  border-color: var(--el-border-color);
}

.summary {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-inline-size: 0;
  padding: 10px 8px 10px 14px;
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

.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.scope-text {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.del {
  margin-inline-end: 8px;
  color: var(--el-text-color-secondary);
}

.del:hover {
  color: var(--el-color-danger);
}

.body {
  flex-basis: 100%;
  padding: 16px 18px 6px 38px;
  border-block-start: 1px solid var(--el-border-color-extra-light);
}

.body :deep(.el-form-item) {
  margin-block-end: 14px;
}

.guest :deep(.el-form-item__content) {
  gap: 10px;
  flex-wrap: nowrap;
}

.guest-label {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.guest-label small {
  color: var(--el-text-color-secondary);
}

@media (max-width: 640px) {
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
