<template>
  <div ref="page" class="events-page">
    <AppPageHead :title="$t('Events')">
      <template #subtitle>
        <span class="page-summary" aria-live="polite">
          <template v-if="loading && !events.length">{{ $t('Loading') }}…</template>
          <template v-else>
            <span class="summary-total">{{ totalLabel }} {{ $t('events') }}</span>
            <span v-if="overview.errors" class="summary-errors">
              <button type="button" class="errors-link" @click="focusErrors">
                {{ overview.errors.toLocaleString() }} {{ $t('Errors') }}
              </button>
            </span>
          </template>
        </span>
      </template>
      <template #actions>
        <el-dropdown trigger="click" :disabled="!events.length" @command="downloadExport">
          <el-button :disabled="!events.length">
            <el-icon><Download /></el-icon>
            <span class="export-label action-label">{{ $t('Export') }}</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="csv">{{ $t('Export CSV') }}</el-dropdown-item>
              <el-dropdown-item command="json">{{ $t('Export JSON') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </AppPageHead>

    <EventsToolbar
      :filters="filters"
      :kinds="kinds"
      :all-count="allCount"
      :options="filterOptions"
      @change="setFilters"
      @clear="clearFilters"
    />

    <EventsTimeline
      :buckets="overview.buckets"
      :loading="overviewLoading"
      @select-range="(range) => setFilters({ ...range, period: undefined })"
    />

    <div class="workspace">
      <EventsFeed
        :events="events"
        :selected-id="selectedId"
        :loading="loading"
        :loading-more="loadingMore"
        :has-more="hasMore"
        :error="error"
        :has-filters="activeFilterKeys.length > 0 || !!filters.from"
        :can-widen="filters.period !== 'all-time' && !filters.from"
        @select="selectEvent"
        @load-more="loadMore"
        @clear="clearFilters"
        @widen="setFilters({ period: 'all-time' })"
        @retry="reload"
      />

      <aside v-if="!isCompact" class="detail-pane" :aria-label="$t('Event Details')">
        <EventDetailPanel
          :event="selectedEvent"
          :loading="detailLoading"
          :failed="detailFailed"
          :related="related"
          @select="selectEvent"
          @filter="setFilters"
        />
      </aside>
    </div>

    <el-drawer
      v-if="isCompact"
      :model-value="!!selectedId"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? '88%' : '480px'"
      :title="$t('Event Details')"
      append-to-body
      @close="selectEvent()"
    >
      <EventDetailPanel
        :event="selectedEvent"
        :loading="detailLoading || !selectedEvent"
        :failed="detailFailed"
        :related="related"
        @select="selectEvent"
        @filter="onCompactFilter"
      />
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import AppPageHead from '@/modules/core/components/layout/AppPageHead.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import EventsToolbar from './components/EventsToolbar.vue';
import EventsTimeline from './components/EventsTimeline.vue';
import EventsFeed from './components/EventsFeed.vue';
import EventDetailPanel from './components/EventDetailPanel.vue';
import { useEventsFeed } from './compositions/events';
import { createEventsExport, EventsExportFormat, getEventUserId } from './services/event-export';
import { getRelatedEvents } from './services/event-presentation';

const { t } = useI18n();

const {
  filters,
  activeFilterKeys,
  events,
  total,
  totalCapped,
  loading,
  loadingMore,
  hasMore,
  error,
  overview,
  overviewLoading,
  filterOptions,
  selectedId,
  selectedEvent,
  detailLoading,
  detailFailed,
  selectEvent,
  setFilters,
  clearFilters,
  loadMore,
  reload,
} = useEventsFeed();

const totalLabel = computed(() => `${total.value.toLocaleString()}${totalCapped.value ? '+' : ''}`);
// per-kind counts come from the overview; fall back to plain kind chips when it is unavailable
const kinds = computed(() =>
  overview.value.kinds.length
    ? overview.value.kinds
    : filterOptions.value.kinds.map((kind) => ({ kind, count: undefined, errors: 0 })),
);
const allCount = computed(() =>
  overview.value.kinds.length ? overview.value.kinds.reduce((sum, item) => sum + item.count, 0).toLocaleString() : '',
);
const related = computed(() =>
  selectedEvent.value ? getRelatedEvents(selectedEvent.value, events.value, getEventUserId) : [],
);

// The detail pane lives beside the feed when the page has room for both, and in a drawer / bottom sheet otherwise.
// It follows the width of the page itself, not of the window, so a wide sidebar does not change the answer by surprise.
const SPLIT_MIN_WIDTH = 860;
const PHONE_MAX_WIDTH = 640;
const page = ref<HTMLElement>();
const isCompact = ref(false);
const isPhone = ref(false);
let observer: ResizeObserver | undefined;

function syncWidth(width: number) {
  isCompact.value = width < SPLIT_MIN_WIDTH;
  isPhone.value = width < PHONE_MAX_WIDTH;
}

onMounted(() => {
  if (!page.value) return;
  const style = getComputedStyle(page.value);
  syncWidth(page.value.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd));
  observer = new ResizeObserver(([entry]) => syncWidth(entry.contentRect.width));
  observer.observe(page.value);
});

onBeforeUnmount(() => observer?.disconnect());

function onCompactFilter(patch: Record<string, string>) {
  selectEvent();
  setFilters(patch);
}

function focusErrors() {
  const first = events.value.find((event) => /error|fail|exception|denied|timeout|invalid/i.test(`${event.kind} ${event.eventName}`));
  if (first) {
    selectEvent(first._id);
    document.getElementById(`event-${first._id}`)?.scrollIntoView({ block: 'center' });
  } else {
    // errors exist in the period but are not in the loaded page yet
    ElMessage.info(t('Load more events to reach the errors'));
  }
}

function downloadExport(format: EventsExportFormat) {
  const file = createEventsExport(events.value, format);
  const url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `events-${new Date().toISOString().replace(/[:.]/g, '-')}.${file.extension}`;
  link.click();
  URL.revokeObjectURL(url);
  ElMessage.success(`${t('Exported')} ${events.value.length} ${t('events')} (${format.toUpperCase()})`);
}
</script>

<style scoped lang="scss">
.events-page {
  container: events / inline-size;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 20px 28px;
  min-inline-size: 0;
}

/* the count line */
.page-summary {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}

.errors-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--el-color-danger);
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-danger);
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.export-label {
  margin-inline-start: 6px;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
  align-items: start;
  gap: 20px;
}

.detail-pane {
  position: sticky;
  inset-block-start: 16px;
  max-block-size: calc(100vh - 32px);
  padding: 20px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
}

@container events (max-width: 859px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  .events-page {
    padding: 12px;
    gap: 16px;
  }

  .export-label {
    display: none;
  }
}
</style>
