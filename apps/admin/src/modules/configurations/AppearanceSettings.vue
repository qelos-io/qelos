<script lang="ts" setup>
import AppPageHead from '@/modules/core/components/layout/AppPageHead.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { useViewport } from '@/modules/core/compositions/viewport';
import { useThemeDraft } from './compositions/theme-draft';
import { isHttpUrl, themeChecks, type AppearanceArea } from './services/appearance';
import ThemePresets from './components/appearance/ThemePresets.vue';
import ThemePreview from './components/appearance/ThemePreview.vue';
import BrandPanel from './components/appearance/BrandPanel.vue';
import ColorsPanel from './components/appearance/ColorsPanel.vue';
import TypePanel from './components/appearance/TypePanel.vue';
import ShapePanel from './components/appearance/ShapePanel.vue';
import LayoutPanel from './components/appearance/LayoutPanel.vue';
import AdvancedPanel from './components/appearance/AdvancedPanel.vue';

const { t } = useI18n();
const { loaded } = useAppConfiguration();
const { width } = useViewport();
const { draft, areas, dirty, previewVariables, publishing, discard, applyPreset, setFont, publish } = useThemeDraft();

const TABS: { key: AppearanceArea; label: string }[] = [
  { key: 'colors', label: 'Colors' },
  { key: 'type', label: 'Typography' },
  { key: 'shape', label: 'Shape' },
  { key: 'layout', label: 'Layout' },
  { key: 'brand', label: 'Brand' },
  { key: 'advanced', label: 'Advanced' },
];
const tab = ref<AppearanceArea>('colors');

// on a phone the preview opens in a drawer, where a phone-sized preview is the one that fits
const device = ref<'desktop' | 'phone'>(width.value < 640 ? 'phone' : 'desktop');
const isWide = computed(() => width.value >= 1100);
const previewOpen = ref(false);

const invalidUrls = computed(() => [draft.value.logoUrl, draft.value.smallLogoUrl, draft.value.themeStylesUrl, draft.value.scriptUrl].some((url) => !isHttpUrl(url)));
const unreadable = computed(() => themeChecks(draft.value.colorsPalette).filter((check) => !check.pass).length);

const AREA_LABELS: Record<AppearanceArea, string> = {
  brand: 'Brand',
  colors: 'Colors',
  type: 'Typography',
  shape: 'Shape',
  layout: 'Layout',
  advanced: 'Advanced',
};

async function confirmPublish() {
  if (invalidUrls.value) {
    ElMessage.error(t('Fix the invalid addresses before publishing'));
    tab.value = isHttpUrl(draft.value.logoUrl) && isHttpUrl(draft.value.smallLogoUrl) ? 'advanced' : 'brand';
    return;
  }
  const changed = areas.value.map((area) => t(AREA_LABELS[area])).join(', ');
  const warning = unreadable.value ? ` ${t('Hard-to-read color pairs: {count}.', { count: unreadable.value })}` : '';
  try {
    await ElMessageBox.confirm(
      `${t('Publishing changes how the application looks for everyone who uses it.')} ${t('Changed: {areas}.', { areas: changed })}${warning}`,
      t('Publish this theme?'),
      { type: unreadable.value ? 'warning' : 'info', confirmButtonText: t('Publish theme'), cancelButtonText: t('Keep editing') },
    );
  } catch {
    return;
  }
  try {
    await publish();
    ElMessage.success(t('Theme published'));
  } catch {
    ElMessage.error(t('Could not publish the theme'));
  }
}

onBeforeRouteLeave(async () => {
  if (!dirty.value || publishing.value) return true;
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

const warnUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) event.preventDefault();
};
onMounted(() => window.addEventListener('beforeunload', warnUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnUnload));
</script>

<template>
  <div v-if="loaded" class="appearance">
    <AppPageHead :title="$t('Appearance')" :subtitle="$t('Colors, type, shape and layout for your whole application. Edit freely: nothing changes for your users until you publish.')" />

    <ThemePresets :current-main="draft.colorsPalette.mainColor" :current-bg="draft.colorsPalette.bgColor" @pick="applyPreset" />

    <div class="editor">
      <section class="controls" :aria-label="$t('Theme settings')">
        <el-tabs v-model="tab" class="tabs">
          <el-tab-pane v-for="item in TABS" :key="item.key" :name="item.key">
            <template #label>
              <span class="tab-label">{{ $t(item.label) }}<i v-if="areas.includes(item.key)" class="changed" :title="$t('Changed')" /></span>
            </template>
          </el-tab-pane>
        </el-tabs>

        <div class="panel">
          <ColorsPanel v-if="tab === 'colors'" v-model="draft.colorsPalette" />
          <TypePanel v-else-if="tab === 'type'" v-model="draft" @font="setFont" />
          <ShapePanel v-else-if="tab === 'shape'" v-model="draft" />
          <LayoutPanel v-else-if="tab === 'layout'" v-model="draft" />
          <BrandPanel v-else-if="tab === 'brand'" v-model="draft" />
          <AdvancedPanel v-else v-model="draft" />
        </div>
      </section>

      <aside v-if="isWide" class="preview" :aria-label="$t('Live preview')">
        <div class="preview-head">
          <strong>{{ $t('Live preview') }}</strong>
          <el-segmented v-model="device" size="small" :options="[{ label: $t('Desktop'), value: 'desktop' }, { label: $t('Phone'), value: 'phone' }]" :aria-label="$t('Preview device')" />
        </div>
        <ThemePreview :variables="previewVariables" :draft="draft" :device="device" />
      </aside>
    </div>

    <el-button v-if="!isWide" class="preview-fab" type="primary" round size="large" @click="previewOpen = true">
      <font-awesome-icon :icon="['fas', 'eye']" /> {{ $t('Preview') }}
    </el-button>
    <el-drawer v-if="!isWide" v-model="previewOpen" direction="btt" size="88%" :title="$t('Live preview')">
      <el-segmented v-model="device" size="small" :options="[{ label: $t('Desktop'), value: 'desktop' }, { label: $t('Phone'), value: 'phone' }]" :aria-label="$t('Preview device')" class="drawer-device" />
      <ThemePreview :variables="previewVariables" :draft="draft" :device="device" />
    </el-drawer>

    <div class="savebar" :class="{ dirty }" role="region" :aria-label="$t('Publish theme')">
      <p class="state" role="status">
        <template v-if="dirty"><span class="dot" aria-hidden="true" />{{ $t('Unpublished changes') }}</template>
        <template v-else>{{ $t('Matches what your users see') }}</template>
      </p>
      <el-button :disabled="!dirty || publishing" @click="discard">{{ $t('Discard') }}</el-button>
      <el-button type="primary" :loading="publishing" :disabled="!dirty" @click="confirmPublish">{{ $t('Publish theme') }}</el-button>
    </div>
  </div>
  <el-skeleton v-else :rows="8" animated class="loading" />
</template>

<style scoped lang="scss">
.appearance {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-block-size: 100%;
  padding: 20px 20px 0;
}

.editor {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 20px;
}

@media (min-width: 1100px) {
  .editor {
    grid-template-columns: minmax(380px, 460px) minmax(0, 1fr);
  }
}

.controls,
.preview {
  min-inline-size: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.tabs {
  padding-inline: 12px;

  :deep(.el-tabs__item) {
    padding-inline: 11px;
  }
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.changed {
  inline-size: 7px;
  block-size: 7px;
  border-radius: 50%;
  background: var(--el-color-warning);
}

.panel {
  padding: 4px 18px 20px;
}

.preview {
  position: sticky;
  inset-block-start: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: var(--el-fill-color-light);
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.preview-fab {
  position: fixed;
  inset-block-end: calc(150px + env(safe-area-inset-bottom, 0px));
  inset-inline-end: 16px;
  z-index: 900;
  gap: 8px;
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.25);
}

.drawer-device {
  margin-block-end: 12px;
}

.savebar {
  position: sticky;
  inset-block-end: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-inline: -20px;
  padding: 12px 20px;
  border-block-start: 1px solid var(--el-border-color-lighter);
  background: var(--surface);
  box-shadow: 0 -6px 16px rgb(0 0 0 / 0.06);

  :deep(.el-button.is-disabled) {
    opacity: 0.45;
  }
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

.loading {
  padding: 24px;
}

@media (max-width: 639px) {
  .appearance {
    padding: 12px 12px 0;
  }

  .savebar {
    margin-inline: -12px;
    padding: 10px 12px;
  }

  .state {
    font-size: 0.82rem;
  }
}
</style>
