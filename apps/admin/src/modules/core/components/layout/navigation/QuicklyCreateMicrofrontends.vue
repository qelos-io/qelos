<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DataAnalysis, Document, Grid, List, Odometer } from '@element-plus/icons-vue';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { useCreatePlugin } from '@/modules/plugins/compositions/manage-plugin';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useQuickBoilerplate } from '@/modules/core/compositions/quick-boilerplate';
import { useNotifications } from '@/modules/core/compositions/notifications';
import { useViewport } from '@/modules/core/compositions/viewport';
import { isEditingEnabled } from '@/modules/core/store/auth';
import pluginsService from '@/services/apis/plugins-service';
import { PAGE_STARTS, buildNewPage, pageAddress, validateNewPage, type PageLink, type PageStart } from '@/modules/plugins/services/new-page';

const open = defineModel<boolean>({ default: false });

const { t } = useI18n();
const router = useRouter();
const store = usePluginsList();
const blueprintsStore = useBlueprintsStore();
const { blueprints } = storeToRefs(blueprintsStore);
const { savePlugin } = useCreatePlugin();
const { error } = useNotifications();
const { isCompact } = useViewport();

const form = reactive({ name: '', target: 'new', link: 'top' as PageLink, start: 'blank' as PageStart, blueprint: '' });
const submitted = ref(false);
const saving = ref(false);

const START_ICONS = { blank: Document, table: List, grid: Grid, 'table-stats': DataAnalysis, dashboard: Odometer } as const;
const START_COPY: Record<PageStart, { title: string; text: string }> = {
  blank: { title: 'Blank', text: 'Start empty and design it on the page' },
  table: { title: 'Table', text: 'Rows of your data' },
  grid: { title: 'Grid', text: 'Cards of your data' },
  'table-stats': { title: 'Table + stats', text: 'Rows with totals on top' },
  dashboard: { title: 'Dashboard', text: 'Stats and highlights' },
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  Object.assign(form, { name: '', target: 'new', link: 'top', start: 'blank', blueprint: '' });
  submitted.value = false;
});

const reservedPaths = () => router.getRoutes().filter((r) => !r.meta?.mfe && !r.meta?.mfeUrl).map((r) => r.path).filter((p) => p.length > 1 && !p.startsWith('/:'));
const errors = computed(() => validateNewPage(form, store.plugins || [], reservedPaths()));
const shown = (field: 'name' | 'address' | 'blueprint') => (submitted.value && errors.value[field] ? t(errors.value[field]!) : undefined);
const address = computed(() => pageAddress(form.name));

const blueprintId = computed(() => (form.start === 'blank' ? '' : form.blueprint));
const { getBoilerPlate } = useQuickBoilerplate({
  blueprintIdentifier: blueprintId as any,
  pageName: computed(() => form.name.trim()) as any,
  boilerplateType: computed(() => form.start) as any,
});

async function submit() {
  submitted.value = true;
  if (Object.keys(errors.value).length || saving.value) return;
  saving.value = true;
  try {
    const boilerplate = await getBoilerPlate();
    const page = buildNewPage({ name: form.name, link: form.link, structure: boilerplate.structure, requirements: boilerplate.requirements });
    if (form.target === 'new') {
      const created = await savePlugin({ name: form.name.trim(), microFrontends: [page] });
      if (!created) return;
    } else {
      // the list's plugins carry runtime fields added by the navigation, so start from a fresh copy
      const plugin = await pluginsService.getOne(form.target);
      await pluginsService.update(plugin._id, { ...plugin, microFrontends: [...(plugin.microFrontends || []), page] });
    }
    await store.retry();
    blueprintsStore.retry();
    open.value = false;
    isEditingEnabled.value = true;
    router.push('/' + page.route!.path);
  } catch (e) {
    console.error(e);
    error(t('Could not create the page'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="open" :title="$t('New page')" width="620px" :fullscreen="isCompact" class="new-page" append-to-body align-center>
    <el-form label-position="top" class="form" @submit.prevent="submit">
      <el-form-item :label="$t('Page name')" :error="shown('name') || shown('address')">
        <el-input v-model="form.name" dir="auto" maxlength="80" autofocus :placeholder="$t('Sales report')" />
        <p v-if="address" class="hint" dir="ltr">{{ $t('Address') }}: /{{ address }}</p>
      </el-form-item>

      <el-form-item :label="$t('Add to')">
        <el-select v-model="form.target" class="target">
          <el-option value="new" :label="$t('A new plugin')" />
          <el-option v-for="plugin in store.plugins" :key="plugin._id" :value="plugin._id" :label="plugin.name" />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('Link in the menu')">
        <el-radio-group v-model="form.link">
          <el-radio-button :value="false">{{ $t('No link') }}</el-radio-button>
          <el-radio-button value="top">{{ $t('Top') }}</el-radio-button>
          <el-radio-button value="bottom">{{ $t('Bottom') }}</el-radio-button>
          <el-radio-button value="user-dropdown">{{ $t('User menu') }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <fieldset class="starts">
        <legend>{{ $t('Start with') }}</legend>
        <div class="start-grid" role="radiogroup">
          <button v-for="start in PAGE_STARTS" :key="start" type="button" role="radio" :aria-checked="form.start === start" class="start" :class="{ on: form.start === start }" @click="form.start = start">
            <el-icon aria-hidden="true"><component :is="START_ICONS[start]" /></el-icon>
            <strong>{{ $t(START_COPY[start].title) }}</strong>
            <span>{{ $t(START_COPY[start].text) }}</span>
          </button>
        </div>
      </fieldset>

      <el-form-item v-if="form.start !== 'blank'" :label="$t('Data to show')" :error="shown('blueprint')">
        <el-select v-model="form.blueprint" filterable :placeholder="$t('Choose a blueprint')">
          <el-option v-for="blueprint in blueprints" :key="blueprint.identifier" :value="blueprint.identifier" :label="blueprint.name" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="footer">
        <el-button :disabled="saving" @click="open = false">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="submit">{{ $t('Create page') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.form :deep(.el-form-item) {
  margin-block-end: 24px;
}

.target {
  inline-size: 100%;
}

.hint {
  inline-size: 100%;
  margin: 4px 0 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
}

.starts {
  min-inline-size: 0;
  margin: 0 0 18px;
  padding: 0;
  border: 0;

  legend {
    padding: 0 0 8px;
    color: var(--el-text-color-regular);
    font-size: var(--el-form-label-font-size, 14px);
  }
}

.start-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.start {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  .el-icon {
    margin-block-end: 4px;
    font-size: 18px;
    color: var(--el-color-primary);
  }

  span {
    color: var(--el-text-color-secondary);
    font-size: 0.82rem;
  }

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &.on {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (prefers-reduced-motion: reduce) {
  .start {
    transition: none;
  }
}
</style>
