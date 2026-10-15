<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import type { IPlugin } from '@/services/types/plugin';
import APIsTab from '../plugin-form/APIsTab.vue';
import HooksEventsTab from '../plugin-form/HooksEventsTab.vue';
import SummaryTab from '../plugin-form/SummaryTab.vue';
import ConnectionSection from './ConnectionSection.vue';
import PagesSection from './PagesSection.vue';
import { isPluginSection, summarizePlugin, type PluginSection } from '../../services/plugin-effects';

type EditorSection = PluginSection | 'json';

const props = defineProps<{
  plugin?: Partial<IPlugin>;
  submitting?: boolean;
  /** persists the plugin; resolves with a truthy value when it was saved */
  save: (plugin: Partial<IPlugin>) => Promise<unknown>;
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const edit = reactive<Partial<IPlugin>>({
  name: '',
  description: '',
  subscribedEvents: [],
  injectables: [],
  microFrontends: [],
  navBarGroups: [],
  ...(JSON.parse(JSON.stringify(props.plugin || {})) as Partial<IPlugin>),
});
provide('plugin', edit);
provide('edit', edit);

const isNew = computed(() => !props.plugin?._id);
const snapshot = () => JSON.stringify(edit);
const baseline = ref(snapshot());
const dirty = computed(() => snapshot() !== baseline.value);
const justSaved = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | undefined;

const section = computed<EditorSection>({
  get: () => {
    const value = route.query.section?.toString();
    return value === 'json' || isPluginSection(value) ? (value as EditorSection) : 'ui';
  },
  set: (value) => {
    router.replace({ query: { ...route.query, section: value } });
  },
});

const effects = computed(() => summarizePlugin(edit));
const rail = computed<{ key: EditorSection; label: string; count?: number }[]>(() => [
  { key: 'ui', label: t('Pages & components'), count: effects.value.sections.ui },
  { key: 'endpoints', label: t('Endpoints'), count: effects.value.sections.endpoints },
  { key: 'events', label: t('Events'), count: effects.value.sections.events },
  { key: 'connection', label: t('Connection') },
  { key: 'json', label: t('JSON') },
]);

async function submit(): Promise<boolean> {
  if (props.submitting) return false;
  if (!edit.name?.trim()) {
    ElMessage.warning(t('Give the plugin a name first'));
    document.getElementById('plugin-name')?.focus();
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (edit as any).__v;
  const result = await props.save(JSON.parse(JSON.stringify(edit)));
  if (!result) return false;
  baseline.value = snapshot();
  justSaved.value = true;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (justSaved.value = false), 2500);
  return true;
}

function discard() {
  Object.keys(edit).forEach((key) => delete (edit as Record<string, unknown>)[key]);
  Object.assign(edit, JSON.parse(baseline.value));
}

const refreshing = ref(false);
async function refreshFromManifest() {
  if (!edit.manifestUrl) return;
  refreshing.value = true;
  try {
    const response = await fetch(edit.manifestUrl);
    if (!response.ok) throw new Error(`${response.status}`);
    const manifest = await response.json();
    Object.assign(edit, manifest);
    const absolute = (value?: string) => (value && !value.startsWith('http') ? new URL(value, manifest.appUrl).href : value);
    edit.manifestUrl = absolute(edit.manifestUrl) as string;
    edit.callbackUrl = absolute(edit.callbackUrl);
    edit.registerUrl = absolute(edit.registerUrl) as string;
    if (!edit.apiPath && manifest.name) edit.apiPath = manifest.name.toLowerCase().replace(/\s+/g, '-');
    await submit();
  } catch (error) {
    console.error('Error fetching manifest:', error);
    ElMessage.error(t('Could not load the manifest'));
  } finally {
    refreshing.value = false;
  }
}

function applyJson(value: string) {
  try {
    Object.assign(edit, JSON.parse(value));
  } catch {
    /* the editor keeps showing the invalid text until it parses */
  }
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

watch(section, () => document.getElementById('plugin-panel')?.scrollTo?.({ top: 0 }));
</script>

<template>
  <div class="editor">
    <header class="head">
      <el-button text class="back" @click="router.push({ name: 'plugins' })">
        <el-icon class="dir-icon"><ArrowLeft /></el-icon>
        <span>{{ $t('Plugins') }}</span>
      </el-button>
      <input id="plugin-name" v-model="edit.name" class="name" dir="auto" :placeholder="$t('Plugin name')" :aria-label="$t('Plugin name')" maxlength="80" autocomplete="off" />
      <input v-model="edit.description" class="description" dir="auto" :placeholder="$t('What does this plugin do?')" :aria-label="$t('Plugin description')" autocomplete="off" />
    </header>

    <div class="layout">
      <nav class="rail" :aria-label="$t('Plugin sections')">
        <button v-for="item in rail" :key="item.key" type="button" class="rail-item" :class="{ on: section === item.key }" :aria-current="section === item.key ? 'page' : undefined" @click="section = item.key">
          <span>{{ item.label }}</span>
          <span v-if="item.count" class="count">{{ item.count }}</span>
        </button>
      </nav>

      <main id="plugin-panel" class="panel">
        <PagesSection v-if="section === 'ui'" :plugin="edit" :dirty="dirty" />
        <section v-else-if="section === 'endpoints'" aria-labelledby="ep-title" class="legacy">
          <h2 id="ep-title">{{ $t('Endpoints') }}</h2>
          <p class="lead" dir="auto">{{ $t('Requests to your app at the API path are forwarded to the plugin server, with the token added.') }}</p>
          <APIsTab :plugin="edit" />
        </section>
        <section v-else-if="section === 'events'" aria-labelledby="ev-title" class="legacy">
          <h2 id="ev-title">{{ $t('Events') }}</h2>
          <p class="lead" dir="auto">{{ $t('The plugin is called when these events happen in your app.') }}</p>
          <HooksEventsTab :plugin="edit" />
        </section>
        <ConnectionSection v-else-if="section === 'connection'" :plugin="edit" :refreshing="refreshing" @refresh="refreshFromManifest" />
        <section v-else class="legacy">
          <h2>{{ $t('JSON') }}</h2>
          <p class="lead" dir="auto">{{ $t('The raw plugin configuration. Changes here are part of the unsaved changes.') }}</p>
          <SummaryTab :plugin="edit" @update-json="applyJson" />
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
      <el-button type="primary" :loading="submitting" :disabled="!dirty && !isNew" @click="submit">{{ isNew ? $t('Create plugin') : $t('Save changes') }}</el-button>
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
  flex: 0 0 224px;
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

  .legacy h2 {
    margin: 0;
    padding: 0;
    font-size: 1.15rem;
  }

  .lead {
    margin: 4px 0 16px;
    padding: 0;
    max-inline-size: 60ch;
    color: var(--el-text-color-secondary);
    text-align: start;
  }

  :deep(.tab-content) {
    padding: 0;
    block-size: auto;
    overflow: visible;
  }

  :deep(.settings-card) {
    box-shadow: none;
  }

  /* the sections above already carry the title */
  :deep(.settings-card > .el-card__header) {
    display: none;
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
