<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { EntityIdentifierMechanism, IBlueprint } from '@qelos/global-types';
import Monaco from '@/modules/users/components/Monaco.vue';
import { getKeyFromName } from '@/modules/core/utils/texts';
import PropertiesSection from './PropertiesSection.vue';
import AccessSection from './AccessSection.vue';
import AutomationSection from './AutomationSection.vue';
import LimitsSection from './LimitsSection.vue';
import SettingsSection from './SettingsSection.vue';
import { summarizeBlueprint, validateBlueprint, type EditorIssue } from '../../services/blueprint-editor';

type Section = 'properties' | 'access' | 'automation' | 'limits' | 'settings' | 'json';
const SECTIONS: Section[] = ['properties', 'access', 'automation', 'limits', 'settings', 'json'];

const props = defineProps<{
  blueprint: Partial<IBlueprint>;
  submitting?: boolean;
  loading?: boolean;
  /** persists the blueprint; resolves with a truthy value when it was saved */
  save: (blueprint: Partial<IBlueprint>) => Promise<unknown>;
}>();
const emit = defineEmits<{ saved: [result: any] }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const edit = reactive<Partial<IBlueprint>>({});
const baseline = ref('');
const justSaved = ref(false);
const identifierEdited = ref(false);
const identifierError = ref('');
let savedTimer: ReturnType<typeof setTimeout> | undefined;

function defaults(blueprint: Partial<IBlueprint>): Partial<IBlueprint> {
  return {
    name: '',
    description: '',
    entityIdentifierMechanism: EntityIdentifierMechanism.OBJECT_ID,
    properties: {},
    relations: [],
    permissions: [],
    limitations: [],
    updateMapping: {},
    ...blueprint,
    dispatchers: { create: false, update: false, delete: false, ...(blueprint.dispatchers || {}) },
  };
}

function load(blueprint: Partial<IBlueprint>) {
  Object.keys(edit).forEach((key) => delete (edit as Record<string, unknown>)[key]);
  Object.assign(edit, defaults(JSON.parse(JSON.stringify(blueprint || {}))));
  baseline.value = snapshot();
}

const snapshot = () => JSON.stringify(edit);
const isNew = computed(() => !props.blueprint?._id);
const dirty = computed(() => snapshot() !== baseline.value);

load(props.blueprint);
watch(() => props.blueprint, (value) => load(value));

// a new blueprint's identifier follows its name until it is edited by hand
watch(() => edit.name, (name) => {
  if (isNew.value && !identifierEdited.value && name?.trim()) edit.identifier = getKeyFromName(name);
});

const section = computed<Section>({
  get: () => {
    const value = route.query.section?.toString() as Section;
    return SECTIONS.includes(value) ? value : 'properties';
  },
  set: (value) => {
    router.replace({ query: { ...route.query, section: value } });
  },
});

const counts = computed(() => summarizeBlueprint(edit));
const rail = computed<{ key: Section; label: string; count?: number }[]>(() => [
  { key: 'properties', label: t('Properties'), count: counts.value.properties },
  { key: 'access', label: t('Access'), count: counts.value.rules },
  { key: 'automation', label: t('Automation'), count: counts.value.calculated + counts.value.events },
  { key: 'limits', label: t('Limits'), count: counts.value.limits },
  { key: 'settings', label: t('Settings') },
  { key: 'json', label: t('JSON') },
]);

const json = ref('');
watch(section, (value) => {
  if (value === 'json') json.value = JSON.stringify(edit, null, 2);
  document.getElementById('blueprint-panel')?.scrollTo?.({ top: 0 });
}, { immediate: true });
function applyJson(value: string) {
  json.value = value;
  try {
    Object.assign(edit, JSON.parse(value));
  } catch {
    /* the editor keeps showing the invalid text until it parses */
  }
}

function flag(issue: EditorIssue) {
  ElMessage.warning(t(issue.message));
  section.value = issue.section as Section;
  if (issue.section === 'settings' && /identifier/i.test(issue.message)) identifierError.value = issue.message;
}

async function submit(): Promise<boolean> {
  if (props.submitting) return false;
  identifierError.value = '';
  const [issue] = validateBlueprint(edit, isNew.value);
  if (issue) {
    flag(issue);
    return false;
  }
  const result = await props.save(JSON.parse(JSON.stringify(edit)));
  if (!result) return false;
  baseline.value = snapshot();
  justSaved.value = true;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (justSaved.value = false), 2500);
  emit('saved', result);
  return true;
}

function discard() {
  load(props.blueprint);
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    submit();
  }
}
const warnUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) event.preventDefault();
};
onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('beforeunload', warnUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('beforeunload', warnUnload);
  clearTimeout(savedTimer);
});
onBeforeRouteLeave(async () => {
  if (!dirty.value || props.submitting) return true;
  try {
    await ElMessageBox.confirm(t('You have unsaved changes. Leave without saving?'), t('Unsaved changes'), {
      type: 'warning',
      confirmButtonText: t('Leave'),
      cancelButtonText: t('Stay'),
    });
    return true;
  } catch {
    return false;
  }
});
</script>

<template>
  <div class="editor">
    <header class="head">
      <el-button text class="back" @click="router.push({ name: 'blueprints' })">
        <el-icon class="dir-icon"><ArrowLeft /></el-icon>
        <span>{{ $t('Blueprints') }}</span>
      </el-button>
      <input id="blueprint-name" v-model="edit.name" class="name" dir="auto" :placeholder="$t('Blueprint name')" :aria-label="$t('Blueprint name')" maxlength="80" autocomplete="off" />
      <input v-model="edit.description" class="description" dir="auto" :placeholder="$t('What does one entity of this blueprint stand for?')" :aria-label="$t('Blueprint description')" autocomplete="off" />
      <code v-if="edit.identifier" class="identifier" dir="ltr">{{ edit.identifier }}</code>
    </header>

    <div class="layout">
      <nav class="rail" :aria-label="$t('Blueprint sections')">
        <button v-for="item in rail" :key="item.key" type="button" class="rail-item" :class="{ on: section === item.key }" :aria-current="section === item.key ? 'page' : undefined" @click="section = item.key">
          <span>{{ item.label }}</span>
          <span v-if="item.count" class="count">{{ item.count }}</span>
        </button>
      </nav>

      <main id="blueprint-panel" class="panel">
        <PropertiesSection v-if="section === 'properties'" :blueprint="edit" :loading="loading" />
        <AccessSection v-else-if="section === 'access'" :blueprint="edit" />
        <AutomationSection v-else-if="section === 'automation'" :blueprint="edit" />
        <LimitsSection v-else-if="section === 'limits'" :blueprint="edit" />
        <SettingsSection v-else-if="section === 'settings'" :blueprint="edit" :is-new="isNew" :identifier-error="identifierError" @identifier-edited="identifierEdited = true" />
        <section v-else aria-labelledby="json-title">
          <h2 id="json-title">{{ $t('JSON') }}</h2>
          <p class="lead" dir="auto">{{ $t('The raw blueprint. Changes here are part of the unsaved changes.') }}</p>
          <Monaco :model-value="json" language="json" height="480px" @update:model-value="applyJson" />
        </section>
      </main>
    </div>

    <div class="savebar" :class="{ dirty }" role="region" :aria-label="$t('Save changes')">
      <p class="state" role="status">
        <template v-if="dirty"><span class="dot" aria-hidden="true" />{{ $t('Unsaved changes') }}</template>
        <template v-else-if="justSaved"><font-awesome-icon :icon="['fas', 'check']" class="ok" aria-hidden="true" />{{ $t('All changes saved') }}</template>
        <template v-else-if="isNew">{{ $t('Not created yet') }}</template>
        <template v-else>{{ $t('No changes yet') }}</template>
      </p>
      <el-button :disabled="!dirty || submitting" @click="discard">{{ $t('Discard') }}</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!dirty && !isNew" @click="submit">{{ isNew ? $t('Create blueprint') : $t('Save changes') }}</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor {
  display: flex;
  flex-direction: column;
  min-block-size: 100%;
}

.head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px 20px 8px;
}

.back {
  margin-inline-start: -10px;
  padding-inline: 10px;
  gap: 4px;
  color: var(--el-text-color-secondary);
}

.name,
.description {
  inline-size: 100%;
  max-inline-size: 720px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: var(--el-border-color-lighter);
  }

  &:focus {
    outline: none;
    border-color: var(--el-color-primary);
    background: var(--surface, var(--el-bg-color));
  }
}

.name {
  padding: 2px 8px;
  margin-inline-start: -8px;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
}

.name::placeholder,
.description::placeholder {
  color: var(--el-text-color-placeholder);
  font-weight: 400;
}

.description {
  padding: 2px 8px;
  margin-inline-start: -8px;
  color: var(--el-text-color-secondary);
}

.identifier {
  margin-block-start: 4px;
  padding: 1px 8px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
}

.layout {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 24px;
  padding: 8px 20px 24px;
}

.rail {
  position: sticky;
  inset-block-start: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 0 0 200px;
}

.rail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.on {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.count {
  min-inline-size: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font-size: 0.78rem;
  line-height: 20px;
  text-align: center;
}

.on .count {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
}

.panel {
  flex: 1;
  min-inline-size: 0;
  max-inline-size: 960px;

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1.15rem;
    font-weight: 600;
    text-align: start;
  }

  .lead {
    margin: 4px 0 16px;
    max-inline-size: 60ch;
    color: var(--el-text-color-secondary);
  }
}

.savebar {
  position: sticky;
  inset-block-end: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-block-start: 1px solid var(--el-border-color-lighter);
  background: var(--surface, var(--el-bg-color));
  box-shadow: 0 -6px 16px rgb(0 0 0 / 0.06);
}

.state {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.dirty .state {
  color: var(--el-text-color-primary);
}

.dot {
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: var(--el-color-warning);
}

.ok {
  color: var(--el-color-success);
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

@media (max-width: 800px) {
  .layout {
    flex-direction: column;
    gap: 12px;
    padding-inline: 14px;
  }

  .head {
    padding-inline: 14px;
  }

  .rail {
    position: static;
    flex-direction: row;
    flex-basis: auto;
    inline-size: 100%;
    overflow-x: auto;
    padding-block-end: 4px;
    scrollbar-width: none;
  }

  .rail-item {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .savebar {
    padding-inline: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .name,
  .description {
    transition: none;
  }
}
</style>
