<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import { ArrowLeft, Setting } from '@element-plus/icons-vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import IconSelector from '@/modules/core/components/forms/IconSelector.vue';
import { useViewport } from '@/modules/core/compositions/viewport';
import type { IMicroFrontend } from '@/services/types/plugin';
import { clearPreview, editingState, setPreview } from '../../compositions/page-editing';
import { completeRequirements, validateStructure } from '../../services/validate-structure';
import RequirementsEditor from './RequirementsEditor.vue';

const props = defineProps<{ pageName: string; mfe: IMicroFrontend; submitting: boolean }>();
const emit = defineEmits<{
  (e: 'save', payload: { structure: string; requirements: any[]; settings: Partial<IMicroFrontend> }): void;
  (e: 'close'): void;
}>();

const { t } = useI18n();
const router = useRouter();
const { width } = useViewport();

const DOCK_MIN_WIDTH = 1000;
const docked = computed(() => width.value >= DOCK_MIN_WIDTH);
const panelWidth = computed(() => (docked.value ? Math.min(760, Math.round(width.value * 0.52)) : width.value));

type Section = 'html' | 'data' | 'page';
const section = ref<Section>('html');
/** narrow screens: the editor and the live page take turns */
const showingPreview = ref(false);
const iconsOpen = ref(false);

const draft = reactive({
  structure: props.mfe.structure || '',
  requirements: (props.mfe.requirements || []).map((req) => ({ ...JSON.parse(JSON.stringify(req)), _id: undefined })) as any[],
  active: props.mfe.active,
  iconName: props.mfe.route?.iconName || '',
  searchQuery: !!props.mfe.searchQuery,
  searchPlaceholder: props.mfe.searchPlaceholder || '',
});

const snapshot = () => JSON.stringify(draft);
const baseline = ref(snapshot());
const dirty = computed(() => snapshot() !== baseline.value);
const error = computed(() => validateStructure(draft.structure));
const justSaved = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | undefined;

/* the page beside the editor shows the draft with its real data */
let previewTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => [draft.structure, draft.requirements],
  () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      if (validateStructure(draft.structure)) return;
      setPreview(draft.structure, completeRequirements(JSON.parse(JSON.stringify(draft.requirements))));
    }, 500);
  },
  { deep: true },
);

watch(
  [panelWidth, docked, showingPreview],
  () => {
    editingState.reserve = docked.value ? panelWidth.value : 0;
  },
  { immediate: true },
);

function save() {
  if (props.submitting) return;
  if (error.value) return;
  const settings: Partial<IMicroFrontend> = {
    active: draft.active,
    roles: props.mfe.roles,
    workspaceRoles: props.mfe.workspaceRoles,
    workspaceLabels: props.mfe.workspaceLabels,
    route: { ...props.mfe.route, iconName: draft.iconName },
    searchQuery: draft.searchQuery,
    searchPlaceholder: draft.searchPlaceholder,
  };
  emit('save', { structure: draft.structure, requirements: JSON.parse(JSON.stringify(draft.requirements)), settings });
}

watch(
  () => props.submitting,
  (now, before) => {
    if (before && !now) {
      baseline.value = snapshot();
      justSaved.value = true;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => (justSaved.value = false), 2500);
    }
  },
);

function discard() {
  Object.assign(draft, {
    structure: props.mfe.structure || '',
    requirements: JSON.parse(baseline.value).requirements,
    active: JSON.parse(baseline.value).active,
    iconName: JSON.parse(baseline.value).iconName,
    searchQuery: JSON.parse(baseline.value).searchQuery,
    searchPlaceholder: JSON.parse(baseline.value).searchPlaceholder,
  });
  Object.assign(draft, JSON.parse(baseline.value));
}

async function confirmLeave(): Promise<boolean> {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(t('You have unsaved changes. Leave without saving?'), t('Unsaved changes'), { type: 'warning', confirmButtonText: t('Leave'), cancelButtonText: t('Stay') });
    return true;
  } catch {
    return false;
  }
}

async function close() {
  if (await confirmLeave()) emit('close');
}

async function openPluginSettings() {
  const pluginId = props.mfe.pluginId || (props.mfe as any).pluginId;
  if (!pluginId || !(await confirmLeave())) return;
  emit('close');
  router.push({ name: 'editPlugin', params: { pluginId }, query: { section: 'ui' } });
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    save();
  }
}
const warnUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) event.preventDefault();
};

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('beforeunload', warnUnload);
  setPreview(draft.structure, completeRequirements(JSON.parse(JSON.stringify(draft.requirements))));
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('beforeunload', warnUnload);
  clearTimeout(previewTimer);
  clearTimeout(savedTimer);
  clearPreview();
  editingState.reserve = 0;
});
onBeforeRouteLeave(async () => (props.submitting ? true : confirmLeave()));
</script>

<template>
  <aside v-show="docked || !showingPreview" class="code ql-edit-ui" :style="{ inlineSize: panelWidth + 'px' }" :aria-label="$t('Code editor')">
    <header>
      <el-button text :icon="ArrowLeft" class="back" @click="close">{{ $t('Back to the page') }}</el-button>
      <h2 dir="auto">{{ pageName }}</h2>
      <el-button v-if="!docked" size="small" @click="showingPreview = true">{{ $t('Preview') }}</el-button>
    </header>

    <el-radio-group v-model="section" class="tabs">
      <el-radio-button value="html">{{ $t('HTML') }}</el-radio-button>
      <el-radio-button value="data">{{ $t('Data') }}<span v-if="draft.requirements.length" class="count">{{ draft.requirements.length }}</span></el-radio-button>
      <el-radio-button value="page">{{ $t('Page') }}</el-radio-button>
    </el-radio-group>

    <div class="body">
      <template v-if="section === 'html'">
        <Monaco v-model="draft.structure" language="html" height="calc(100dvh - 250px)" />
        <p v-if="error" class="error" role="alert">{{ $t(error.key, error.params || {}) }}</p>
        <p v-else class="hint">{{ $t('The page on the left updates as you type.') }}</p>
      </template>

      <RequirementsEditor v-else-if="section === 'data'" v-model="draft.requirements" />

      <el-form v-else label-position="top" class="settings" @submit.prevent>
        <el-form-item :label="$t('Active')">
          <el-switch v-model="draft.active" />
          <span class="note">{{ draft.active ? $t('Visible to the people allowed') : $t('Hidden from everyone') }}</span>
        </el-form-item>
        <el-form-item :label="$t('Icon')" class="icon-field">
          <div class="icon-row">
            <code dir="ltr">{{ draft.iconName || '—' }}</code>
            <el-button text @click="iconsOpen = !iconsOpen">{{ iconsOpen ? $t('Done') : $t('Choose icon') }}</el-button>
          </div>
          <IconSelector v-if="iconsOpen" v-model="draft.iconName" title="" class="icon-picker" />
        </el-form-item>
        <el-form-item :label="$t('Search box in the header')">
          <el-switch v-model="draft.searchQuery" />
        </el-form-item>
        <el-form-item v-if="draft.searchQuery" :label="$t('Search placeholder')">
          <el-input v-model="draft.searchPlaceholder" dir="auto" />
        </el-form-item>
        <el-button text :icon="Setting" class="plugin-link" @click="openPluginSettings">{{ $t('Address, menu link and who can see the page') }}</el-button>
      </el-form>
    </div>

    <footer :class="{ dirty }" role="region" :aria-label="$t('Save changes')">
      <p class="state" role="status">
        <template v-if="error"><span class="dot err" aria-hidden="true" />{{ $t('Fix the HTML to save') }}</template>
        <template v-else-if="dirty"><span class="dot" aria-hidden="true" />{{ $t('Unsaved changes') }}</template>
        <template v-else-if="justSaved"><font-awesome-icon :icon="['fas', 'check']" class="ok" aria-hidden="true" />{{ $t('All changes saved') }}</template>
        <template v-else>{{ $t('No changes yet') }}</template>
      </p>
      <el-button :disabled="!dirty || submitting" @click="discard">{{ $t('Discard') }}</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!dirty || !!error" @click="save">{{ $t('Save changes') }}</el-button>
    </footer>
  </aside>

  <el-button v-if="!docked && showingPreview" class="to-code ql-edit-ui" type="primary" round @click="showingPreview = false">{{ $t('Back to the code') }}</el-button>
</template>

<style scoped lang="scss">
.code {
  position: fixed;
  inset-block: 0;
  inset-inline-end: 0;
  z-index: 1700;
  display: flex;
  flex-direction: column;
  max-inline-size: 100vw;
  border-inline-start: 1px solid var(--el-border-color-lighter);
  background: var(--surface, var(--el-bg-color));
  box-shadow: -8px 0 24px rgb(0 0 0 / 0.08);
}

header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 6px;

  h2 {
    flex: 1;
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-size: 1rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.back {
  margin-inline-start: -8px;
}

[dir='rtl'] .back :deep(.el-icon) {
  transform: scaleX(-1);
}

.tabs {
  align-self: flex-start;
  margin: 4px 14px 10px;
}

.count {
  margin-inline-start: 6px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.25);
  font-size: 0.75rem;
}

.body {
  flex: 1;
  min-block-size: 0;
  padding: 0 14px 14px;
  overflow-y: auto;
}

.error,
.hint {
  margin: 8px 0 0;
  padding: 0;
  font-size: 0.85rem;
  text-align: start;
}

.error {
  color: var(--el-color-danger);
}

.hint,
.note {
  color: var(--el-text-color-secondary);
}

.note {
  margin-inline-start: 10px;
  font-size: 0.85rem;
}

.settings {
  display: flex;
  flex-direction: column;
  align-items: stretch;

  .icon-field :deep(.el-form-item__content) {
    flex-direction: column;
    align-items: stretch;
  }
}

.plugin-link {
  align-self: flex-start;
  margin-inline-start: -12px;
}

.icon-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-picker {
  margin-block-start: 8px;
}

footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-block-start: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 -6px 16px rgb(0 0 0 / 0.05);
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

  &.err {
    background: var(--el-color-danger);
  }
}

.ok {
  color: var(--el-color-success);
}

.to-code {
  position: fixed;
  inset-block-end: 72px;
  inset-inline-end: 16px;
  z-index: 1700;
}
</style>
