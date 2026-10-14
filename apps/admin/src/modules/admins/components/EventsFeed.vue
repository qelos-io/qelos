<template>
  <div class="events-feed" :aria-busy="loading">
    <div v-if="loading && !events.length" class="feed-loading">
      <el-skeleton v-for="n in 6" :key="n" animated :rows="1" class="feed-skeleton" />
    </div>

    <el-result v-else-if="error" icon="error" :title="$t('Could not load events')">
      <template #extra>
        <el-button type="primary" @click="emit('retry')">{{ $t('Try again') }}</el-button>
      </template>
    </el-result>

    <el-empty v-else-if="!events.length" :image-size="80" :description="emptyText">
      <el-button v-if="hasFilters" @click="emit('clear')">{{ $t('Clear filters') }}</el-button>
      <el-button v-else-if="canWiden" @click="emit('widen')">{{ $t('Show all time') }}</el-button>
    </el-empty>

    <div
      v-else
      class="feed-list"
      role="listbox"
      :aria-label="$t('Events')"
      tabindex="-1"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
    >
      <template v-for="group in groups" :key="group.key">
        <h3 class="day-heading">{{ dayLabel(group.date) }}</h3>
        <button
          v-for="event in group.items"
          :key="event._id"
          :id="`event-${event._id}`"
          type="button"
          role="option"
          class="feed-row"
          :class="{ selected: event._id === selectedId, error: severity(event) === 'error' }"
          :aria-selected="event._id === selectedId"
          @click="emit('select', event._id)"
        >
          <span class="row-dot" :title="severity(event) === 'error' ? $t('Errors') : ''" />
          <time class="row-time" :datetime="String(event.created)">{{ timeLabel(event.created) }}</time>
          <span class="row-main">
            <span class="row-title">
              <span class="row-name" dir="ltr">{{ event.eventName }}</span>
              <span class="row-kind" dir="ltr">{{ event.kind }}</span>
            </span>
            <span v-if="summary(event)" class="row-summary">{{ summary(event) }}</span>
            <span v-if="facts(event).length" class="row-facts" dir="ltr">
              <span v-for="fact in facts(event)" :key="fact">{{ fact }}</span>
            </span>
          </span>
          <span class="row-user" dir="ltr">{{ userLabel(event) }}</span>
        </button>
      </template>

      <div class="feed-more">
        <el-button v-if="hasMore" :loading="loadingMore" @click="emit('load-more')">
          {{ $t('Load more') }}
        </el-button>
        <span v-else class="feed-end">{{ $t('End of events') }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IEvent } from '@/services/apis/events-service';
import {
  getDayLabel,
  getEventFacts,
  getEventSeverity,
  getEventSummary,
  getEventUserLabel,
  groupEventsByDay,
} from '../services/event-presentation';

const props = defineProps<{
  events: IEvent[];
  selectedId?: string;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  error?: boolean;
  hasFilters?: boolean;
  canWiden?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'load-more'): void;
  (e: 'clear'): void;
  (e: 'widen'): void;
  (e: 'retry'): void;
}>();

const { t, locale } = useI18n();

const groups = computed(() => groupEventsByDay(props.events));
const emptyText = computed(() => (props.hasFilters ? t('No events match the current filters') : t('No events in this period')));

const severity = getEventSeverity;
const summary = getEventSummary;
const facts = (event: IEvent) => getEventFacts(event);
const userLabel = getEventUserLabel;

function dayLabel(date: Date) {
  return getDayLabel(date, new Date(), locale.value || undefined, { today: t('Today'), yesterday: t('Yesterday') });
}

function timeLabel(created: Date | string) {
  return new Date(created).toLocaleTimeString(locale.value || undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function move(step: number) {
  const index = props.events.findIndex((event) => event._id === props.selectedId);
  const next = props.events[Math.min(props.events.length - 1, Math.max(0, index + step))];
  if (!next) return;
  emit('select', next._id);
  await nextTick();
  document.getElementById(`event-${next._id}`)?.focus({ preventScroll: false });
}
</script>

<style scoped lang="scss">
.events-feed {
  min-inline-size: 0;
}

.feed-loading {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feed-skeleton {
  padding: 16px;
  border-radius: 8px;
  background: var(--el-bg-color);
}

.feed-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
  overflow: hidden;
}

.day-heading {
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  margin: 0;
  padding: 10px 16px;
  background: var(--el-fill-color-light);
  border-block-end: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--el-text-color-secondary);
}

.feed-row {
  display: grid;
  grid-template-columns: 10px 84px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  inline-size: 100%;
  padding: 12px 16px;
  border: 0;
  border-block-end: 1px solid var(--el-border-color-extra-light);
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: background-color 0.12s ease;

  &:hover {
    background: var(--el-fill-color-lighter);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }

  &.selected {
    background: var(--el-color-primary-light-9);
    box-shadow: inset 3px 0 0 var(--el-color-primary);
  }
}

[dir='rtl'] .feed-row.selected {
  box-shadow: inset -3px 0 0 var(--el-color-primary);
}

.row-dot {
  inline-size: 8px;
  block-size: 8px;
  margin-block-start: 6px;
  border-radius: 50%;
  background: var(--el-border-color);
}

.feed-row.error .row-dot {
  background: var(--el-color-danger);
  box-shadow: 0 0 0 3px var(--el-color-danger-light-8);
}

.row-time {
  padding-block-start: 1px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-inline-size: 0;
}

.row-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-inline-size: 0;
}

.row-name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-row.error .row-name {
  color: var(--el-color-danger);
}

.row-kind {
  flex: none;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.row-summary {
  overflow: hidden;
  font-size: 13px;
  color: var(--el-text-color-regular);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block-start: 2px;

  span {
    padding: 1px 8px;
    border-radius: 10px;
    background: var(--el-fill-color);
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.row-user {
  max-inline-size: 140px;
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-more {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.feed-end {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .feed-row {
    grid-template-columns: 10px minmax(0, 1fr);
    padding-block: 14px;
  }

  .row-time {
    grid-column: 2;
    grid-row: 1;
  }

  .row-dot {
    grid-row: 1;
    grid-column: 1;
  }

  .row-main {
    grid-column: 2;
  }

  .row-user {
    grid-column: 2;
    max-inline-size: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .feed-row {
    transition: none;
  }
}
</style>
