<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import { ArrowDown, Delete, Document, EditPen, Files, Grid, Plus, Setting, View } from '@element-plus/icons-vue';
import { isEditingEnabled } from '@/modules/core/store/auth';
import type { IMicroFrontend, IPlugin } from '@/services/types/plugin';
import NavigationGroupsTab from '../plugin-form/NavigationGroupsTab.vue';
import InjectablesTab from '../plugin-form/InjectablesTab.vue';
import MfeSettingsDrawer from './MfeSettingsDrawer.vue';
import { canEditLive, mfeKind, mfeLiveEditHref, mfePageHref, mfeSource, newMicroFrontend, type MfeKind } from '../../services/plugin-effects';

const props = defineProps<{
  plugin: Partial<IPlugin>;
  /** unsaved edits: a page that was not saved yet does not exist for the live editor */
  dirty: boolean;
}>();

const { t } = useI18n();
const router = useRouter();
const selected = ref<number | null>(null);

const mfes = computed(() => props.plugin.microFrontends || []);
const drawerOpen = computed({
  get: () => selected.value !== null,
  set: (value: boolean) => {
    if (!value) selected.value = null;
  },
});
const selectedMfe = computed(() => (selected.value === null ? undefined : mfes.value[selected.value]));

const KIND_ICON = { page: Document, component: Grid, modal: Files, unplaced: Document } as const;
const KIND_LABEL: Record<MfeKind, string> = { page: 'Page', component: 'Component', modal: 'Modal', unplaced: 'Page' };

function add(kind: Exclude<MfeKind, 'unplaced'>) {
  props.plugin.microFrontends ||= [];
  const base = t(KIND_LABEL[kind]);
  props.plugin.microFrontends.push(newMicroFrontend(kind, `${base} ${mfes.value.length + 1}`));
  selected.value = mfes.value.length - 1;
}

async function remove(index: number) {
  try {
    await ElMessageBox.confirm(t('Remove "{name}" from this plugin?', { name: mfes.value[index].name }), t('Remove'), { type: 'warning' });
  } catch {
    return;
  }
  props.plugin.microFrontends!.splice(index, 1);
}

function where(mfe: IMicroFrontend) {
  switch (mfeKind(mfe)) {
    case 'page':
      return mfe.route?.path ? '/' + mfe.route.path.replace(/^\/+/, '') : t('No address yet');
    case 'component':
      return mfe.global?.position || '';
    case 'modal':
      return mfe.modal?.name || '';
    default:
      return '';
  }
}

function editLive(mfe: IMicroFrontend) {
  const to = mfeLiveEditHref(mfe);
  if (!to) return;
  isEditingEnabled.value = true;
  router.push(to);
}

const canView = (mfe: IMicroFrontend) => !!mfePageHref(mfe) && mfe.active !== false;
</script>

<template>
  <div class="pages">
    <section aria-labelledby="mfe-title">
      <header class="head">
        <div>
          <h2 id="mfe-title">{{ $t('Pages & components') }}</h2>
          <p dir="auto">{{ $t('What this plugin shows inside your app. Pages get their own address and can be designed right on the page.') }}</p>
        </div>
        <el-dropdown trigger="click" @command="add">
          <el-button type="primary" :icon="Plus">{{ $t('Add') }}<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="page" :icon="Document">{{ $t('Page') }}</el-dropdown-item>
              <el-dropdown-item command="component" :icon="Grid">{{ $t('Component') }}</el-dropdown-item>
              <el-dropdown-item command="modal" :icon="Files">{{ $t('Modal') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>

      <div v-if="!mfes.length" class="empty">
        <p>{{ $t('No pages or components yet.') }}</p>
        <el-button :icon="Plus" @click="add('page')">{{ $t('Add a page') }}</el-button>
      </div>

      <ul v-else class="list">
        <li v-for="(mfe, index) in mfes" :key="mfe._id || index" class="item" :class="{ off: mfe.active === false }">
          <el-icon class="kind" aria-hidden="true"><component :is="KIND_ICON[mfeKind(mfe)]" /></el-icon>
          <button type="button" class="info" :aria-label="`${$t('Settings')}: ${mfe.name}`" @click="selected = index">
            <span class="name" dir="auto">{{ mfe.name || $t('Untitled') }}</span>
            <span class="meta">
              <span>{{ $t(KIND_LABEL[mfeKind(mfe)]) }}</span>
              <span dir="ltr" class="where">{{ where(mfe) }}</span>
              <el-tag size="small" effect="plain" type="info">{{ mfeSource(mfe) === 'url' ? $t('External app') : $t('Built in Qelos') }}</el-tag>
              <el-tag v-if="mfe.guest" size="small" effect="plain" type="warning">{{ $t('Guests') }}</el-tag>
              <el-tag v-if="mfe.active === false" size="small" effect="plain">{{ $t('Hidden') }}</el-tag>
            </span>
          </button>
          <div class="actions">
            <el-tooltip :disabled="!dirty" :content="$t('Save the plugin first')" placement="top">
              <span>
                <el-button v-if="canEditLive(mfe)" type="primary" plain :icon="EditPen" :disabled="dirty || mfe.active === false" @click="editLive(mfe)">{{ $t('Edit page') }}</el-button>
              </span>
            </el-tooltip>
            <el-button v-if="canView(mfe)" text circle :icon="View" :aria-label="`${$t('Open page')}: ${mfe.name}`" :disabled="dirty" @click="router.push(mfePageHref(mfe)!)" />
            <el-button text circle :icon="Setting" :aria-label="`${$t('Settings')}: ${mfe.name}`" @click="selected = index" />
            <el-button text circle :icon="Delete" :aria-label="`${$t('Remove')}: ${mfe.name}`" @click="remove(index)" />
          </div>
        </li>
      </ul>
    </section>

    <section class="more" aria-labelledby="inj-title">
      <h2 id="inj-title">{{ $t('Custom HTML & styles') }}</h2>
      <InjectablesTab :plugin="plugin" />
    </section>

    <section class="more" aria-labelledby="nav-title">
      <h2 id="nav-title">{{ $t('Navigation groups') }}</h2>
      <NavigationGroupsTab :plugin="plugin" />
    </section>

    <MfeSettingsDrawer v-if="selectedMfe" v-model="drawerOpen" :mfe="selectedMfe" :plugin="plugin" />
  </div>
</template>

<style scoped lang="scss">
.pages {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-block-end: 12px;

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1.15rem;
  }

  p {
    margin: 2px 0 0;
    padding: 0;
    max-inline-size: 60ch;
    color: var(--el-text-color-secondary);
    text-align: start;
  }
}

.more h2 {
  margin: 0 0 8px;
  padding: 0;
  font-size: 1.15rem;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 24px;
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;

  p {
    margin: 0;
    padding: 0;
    color: var(--el-text-color-secondary);
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));

  &.off {
    opacity: 0.7;
  }
}

.kind {
  flex-shrink: 0;
  font-size: 1.25rem;
  color: var(--el-color-primary);
}

.info {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-inline-size: 0;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

.name {
  font-weight: 600;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.where {
  unicode-bidi: plaintext;
}

.actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .head {
    flex-direction: column;
  }

  .item {
    flex-wrap: wrap;
  }

  .info {
    flex-basis: calc(100% - 40px);
  }

  .actions {
    inline-size: 100%;
    justify-content: flex-end;
  }
}
</style>
