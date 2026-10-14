<script lang="ts" setup>
import { computed, nextTick, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { isAdmin } from '@/modules/core/store/auth';
import { useAdminAssistantStore } from '@/modules/admins/store/admin-assistant';
import { filterNavItems, type NavItem, type NavSection } from '../../services/navigation-model';
import { useNavSections } from '../../compositions/navigation';
import { isPaletteOpen, openCreatePage, togglePalette } from '../../store/shell';
import NavIcon from './NavIcon.vue';

const { t } = useI18n();
const router = useRouter();
const assistant = useAdminAssistantStore();
const sections = useNavSections();

const query = ref('');
const active = ref(0);
const input = ref<HTMLInputElement>();
const list = ref<HTMLElement>();

// the palette also knows a few things that are not pages
const searchable = computed<NavSection[]>(() => {
  const extra: NavItem[] = [{ key: 'profile', label: t('Update profile'), to: '/users/me', icon: { fa: 'user' }, origin: 'core' }];
  if (isAdmin.value) extra.unshift({ key: 'assistant', label: t('AI Chat'), action: 'assistant', icon: { fa: 'wand-magic-sparkles' }, origin: 'core' });
  return [...sections.value, { key: 'more', label: t('Account'), items: extra }];
});

const rows = computed(() => filterNavItems(searchable.value, query.value));

// rows grouped by section for display, with one running index for the keyboard
const groups = computed(() => {
  const result: { key: string; label: string; rows: { item: NavItem; index: number }[] }[] = [];
  rows.value.forEach(({ item, section, sectionKey }, index) => {
    const last = result[result.length - 1];
    if (last && last.key === sectionKey) last.rows.push({ item, index });
    else result.push({ key: sectionKey, label: section, rows: [{ item, index }] });
  });
  return result;
});

watch(query, () => (active.value = 0));
watch(isPaletteOpen, async (open) => {
  if (!open) return;
  query.value = '';
  active.value = 0;
  await nextTick();
  input.value?.focus(); // already mounted when reopened; the first open focuses from the dialog's @opened
});

function choose(item: NavItem) {
  isPaletteOpen.value = false;
  if (item.action === 'create-page') openCreatePage();
  else if (item.action === 'assistant') assistant.toggle();
  else if (item.to) router.push(item.to);
}

function scrollActiveIntoView() {
  nextTick(() => list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
}

function onKeydown(event: KeyboardEvent) {
  const count = rows.value.length;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    active.value = count ? (active.value + 1) % count : 0;
    scrollActiveIntoView();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    active.value = count ? (active.value - 1 + count) % count : 0;
    scrollActiveIntoView();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const row = rows.value[active.value];
    if (row) choose(row.item);
  }
}

function onGlobalKey(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    togglePalette();
  }
}
onMounted(() => window.addEventListener('keydown', onGlobalKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey));
</script>

<template>
  <el-dialog
    v-model="isPaletteOpen"
    class="palette-dialog"
    :show-close="false"
    :width="'min(580px, 94vw)'"
    top="10vh"
    append-to-body
    @opened="input?.focus()"
    :aria-label="$t('Go to…')"
  >
    <template #header><span class="sr-only">{{ $t('Go to…') }}</span></template>
    <div class="box" @keydown="onKeydown">
      <div class="field">
        <font-awesome-icon :icon="['fas', 'magnifying-glass']" class="field-icon" aria-hidden="true" />
        <input
          ref="input"
          v-model="query"
          class="field-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          :aria-activedescendant="rows.length ? `palette-opt-${active}` : undefined"
          :placeholder="$t('Search pages and actions…')"
          :aria-label="$t('Search pages and actions…')"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="esc">Esc</kbd>
      </div>

      <div id="palette-list" ref="list" class="results" role="listbox" :aria-label="$t('Results')">
        <template v-if="groups.length">
          <div v-for="group in groups" :key="group.key" class="group" role="group" :aria-label="group.label || undefined">
            <p v-if="group.label" class="group-label">{{ group.label }}</p>
            <button
              v-for="{ item, index } in group.rows"
              :id="`palette-opt-${index}`"
              :key="item.key"
              type="button"
              class="option"
              role="option"
              tabindex="-1"
              :aria-selected="index === active"
              :class="{ active: index === active }"
              @mousemove="active = index"
              @click="choose(item)"
            >
              <NavIcon :icon="item.icon" class="option-icon" />
              <span class="option-label">{{ item.label }}</span>
              <font-awesome-icon v-if="index === active" :icon="['fas', 'arrow-turn-down']" class="option-enter" aria-hidden="true" />
            </button>
          </div>
        </template>
        <p v-else class="empty" role="status">{{ $t('Nothing matches') }} “{{ query }}”</p>
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss">
.palette-dialog.el-dialog {
  padding: 0;
  overflow: hidden;
  border-radius: calc(var(--border-radius, 6px) + 8px);

  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    padding: 0;
  }
}
</style>

<style scoped lang="scss">
.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  block-size: 56px;
  border-block-end: 1px solid var(--el-border-color-lighter);
}

.field-icon {
  color: var(--el-text-color-secondary);
}

.field-input {
  flex: 1;
  min-inline-size: 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  font-size: 1.05rem;

  &::placeholder {
    color: var(--el-text-color-placeholder);
  }

  &:focus {
    outline: none;
  }
}

.esc {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font: inherit;
  font-size: 0.72rem;
}

.results {
  max-block-size: min(420px, 60vh);
  padding: 8px;
  overflow-y: auto;
}

.group + .group {
  margin-block-start: 6px;
}

.group-label {
  margin: 6px 0 2px;
  padding-inline: 10px;
  color: var(--el-text-color-secondary);
  font-size: 0.78rem;
  font-weight: 600;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  inline-size: 100%;
  min-block-size: 44px;
  padding: 0 10px;
  border: 0;
  border-radius: calc(var(--border-radius, 6px) + 1px);
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &.active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.option-icon {
  flex: none;
  inline-size: 20px;
  color: var(--el-text-color-secondary);
}

.active .option-icon {
  color: inherit;
}

.option-label {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-enter {
  flex: none;
  font-size: 0.8rem;
  opacity: 0.7;
}

.empty {
  margin: 0;
  padding: 28px 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

@media (max-width: 639px) {
  .field {
    block-size: 52px;
  }

  .esc {
    display: none;
  }
}
</style>
