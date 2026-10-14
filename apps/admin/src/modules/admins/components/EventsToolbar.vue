<template>
  <section class="events-toolbar" :aria-label="$t('Filters')">
    <div class="toolbar-row">
      <el-input
        v-model="searchText"
        class="toolbar-search"
        clearable
        dir="ltr"
        :prefix-icon="Search"
        :placeholder="$t('Search events')"
        :aria-label="$t('Search events')"
        @input="queueSearch"
        @clear="applySearch"
        @keydown.enter="applySearch"
      />

      <el-segmented
        class="toolbar-period"
        :model-value="periodValue"
        :options="periodOptions"
        :aria-label="$t('Period')"
        @change="onPeriodChange"
      />

      <el-popover trigger="click" placement="bottom-end" :width="320">
        <template #reference>
          <el-button class="toolbar-more" :aria-label="$t('More filters')">
            <el-icon><Filter /></el-icon>
            <span class="more-label">{{ $t('Filters') }}</span>
            <el-badge v-if="moreCount" :value="moreCount" type="primary" class="more-badge" />
          </el-button>
        </template>
        <div class="more-form">
          <label class="more-field">
            <span>{{ $t('Event Name') }}</span>
            <el-select
              :model-value="filters.eventName"
              clearable
              filterable
              :loading="optionsLoading"
              :placeholder="$t('Any')"
              @update:model-value="(v) => emit('change', { eventName: v || undefined })"
            >
              <el-option v-for="name in options.eventNames" :key="name" :label="name" :value="name" />
            </el-select>
          </label>
          <label class="more-field">
            <span>{{ $t('Source') }}</span>
            <el-select
              :model-value="filters.source"
              clearable
              filterable
              :loading="optionsLoading"
              :placeholder="$t('Any')"
              @update:model-value="(v) => emit('change', { source: v || undefined })"
            >
              <el-option v-for="src in options.sources" :key="src" :label="src" :value="src" />
            </el-select>
          </label>
          <label class="more-field">
            <span>{{ $t('User') }}</span>
            <el-input v-model="userText" clearable dir="ltr" :placeholder="$t('User ID')" @change="applyIdentity" @clear="applyIdentity" />
          </label>
          <label class="more-field">
            <span>{{ $t('Workspace') }}</span>
            <el-input v-model="workspaceText" clearable dir="ltr" :placeholder="$t('Workspace ID')" @change="applyIdentity" @clear="applyIdentity" />
          </label>
        </div>
      </el-popover>
    </div>

    <div v-if="rangeVisible || isCustom" class="range-row">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        :range-separator="$t('to')"
        :start-placeholder="$t('From')"
        :end-placeholder="$t('To')"
        :aria-label="$t('Custom')"
        @change="onDateRangeChange"
      />
    </div>

    <div class="scope-row" role="group" :aria-label="$t('Kind')">
      <button
        type="button"
        class="scope-chip"
        :class="{ active: !filters.kind }"
        :aria-pressed="!filters.kind"
        @click="emit('change', { kind: undefined })"
      >
        {{ $t('All') }}
        <span v-if="allCount" class="scope-count">{{ allCount }}</span>
      </button>
      <button
        v-for="item in kinds"
        :key="item.kind"
        type="button"
        class="scope-chip"
        :class="{ active: filters.kind === item.kind, danger: item.errors > 0 }"
        :aria-pressed="filters.kind === item.kind"
        @click="emit('change', { kind: filters.kind === item.kind ? undefined : item.kind })"
      >
        <span class="scope-name" dir="ltr">{{ item.kind }}</span>
        <span v-if="item.count !== undefined" class="scope-count">{{ item.count.toLocaleString() }}</span>
        <span v-if="item.errors" class="scope-errors" :title="$t('Errors')">{{ item.errors.toLocaleString() }}</span>
      </button>
    </div>

    <div v-if="chips.length" class="chips-row">
      <el-tag v-for="chip in chips" :key="chip.key" closable effect="plain" @close="emit('change', { [chip.key]: undefined })">
        <span class="chip-key">{{ chip.label }}</span>
        <span dir="ltr">{{ chip.value }}</span>
      </el-tag>
      <el-button text size="small" @click="emit('clear')">{{ $t('Clear filters') }}</el-button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Filter, Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import type { IEventsFilterOptions } from '@/services/apis/events-service';
import type { EventsFilters } from '../compositions/events';

const props = defineProps<{
  filters: EventsFilters;
  kinds: { kind: string; count?: number; errors: number }[];
  allCount: number | string;
  options: IEventsFilterOptions;
  optionsLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'change', patch: Record<string, string | undefined>): void;
  (e: 'clear'): void;
}>();

const { t } = useI18n();

const searchText = ref(props.filters.search ?? '');
const userText = ref(props.filters.user ?? '');
const workspaceText = ref(props.filters.workspace ?? '');
let searchTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => [props.filters.search, props.filters.user, props.filters.workspace],
  ([search, user, workspace]) => {
    searchText.value = search ?? '';
    userText.value = user ?? '';
    workspaceText.value = workspace ?? '';
  },
);

function applySearch() {
  clearTimeout(searchTimer);
  emit('change', { search: searchText.value.trim() || undefined });
}

function queueSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applySearch, 400);
}

function applyIdentity() {
  emit('change', {
    user: userText.value.trim() || undefined,
    workspace: workspaceText.value.trim() || undefined,
  });
}

onBeforeUnmount(() => clearTimeout(searchTimer));

const periodOptions = computed(() => [
  { label: t('24h'), value: 'last-day' },
  { label: t('7d'), value: 'last-week' },
  { label: t('30d'), value: 'last-month' },
  { label: t('1y'), value: 'last-year' },
  { label: t('All'), value: 'all-time' },
  { label: t('Custom'), value: 'custom' },
]);

const isCustom = computed(() => !!(props.filters.from || props.filters.to));
const periodValue = computed(() => (isCustom.value ? 'custom' : props.filters.period || 'last-week'));

const rangeVisible = ref(false);
const dateRange = ref<[string, string] | null>(null);

function toLocalDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

watch(
  () => [props.filters.from, props.filters.to],
  ([from, to]) => {
    dateRange.value = from && to ? [toLocalDate(from), toLocalDate(to)] : null;
  },
  { immediate: true },
);

function onPeriodChange(value: string | number | boolean) {
  if (value === 'custom') {
    rangeVisible.value = true;
    return;
  }
  rangeVisible.value = false;
  emit('change', { period: String(value), from: undefined, to: undefined });
}

function onDateRangeChange(range: [string, string] | null) {
  if (!range) return;
  emit('change', {
    period: undefined,
    from: new Date(`${range[0]}T00:00:00`).toISOString(),
    to: new Date(`${range[1]}T23:59:59.999`).toISOString(),
  });
}

const moreCount = computed(
  () => (['eventName', 'source', 'user', 'workspace'] as const).filter((key) => props.filters[key]).length,
);

const CHIP_LABELS: Record<string, string> = {
  eventName: 'Event Name',
  source: 'Source',
  user: 'User',
  workspace: 'Workspace',
  search: 'Search',
};

const chips = computed(() =>
  Object.keys(CHIP_LABELS)
    .filter((key) => props.filters[key as keyof EventsFilters])
    .map((key) => ({ key, label: t(CHIP_LABELS[key]), value: props.filters[key as keyof EventsFilters] as string })),
);
</script>

<style scoped lang="scss">
.events-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.toolbar-search {
  flex: 1 1 260px;
  min-width: 0;
}

.toolbar-period {
  max-width: 100%;
}

.range-row :deep(.el-date-editor) {
  max-width: 100%;
}

.more-label {
  margin-inline-start: 6px;
}

.more-badge {
  margin-inline-start: 6px;
}

.more-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.more-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.scope-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-block-end: 2px;
  scrollbar-width: thin;
}

.scope-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding-inline: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 18px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

.scope-count {
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.scope-chip.active .scope-count {
  color: inherit;
}

.scope-errors {
  min-width: 20px;
  padding-inline: 6px;
  border-radius: 10px;
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.chips-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.chip-key {
  margin-inline-end: 6px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .toolbar-period {
    width: 100%;
    overflow-x: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scope-chip {
    transition: none;
  }
}
</style>
