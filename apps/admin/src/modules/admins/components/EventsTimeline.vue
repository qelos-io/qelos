<template>
  <section v-if="loading || hasData" class="events-timeline" :aria-label="$t('Activity')" :aria-busy="loading">
    <div v-if="loading && !hasData" class="timeline-skeleton" aria-hidden="true">
      <span v-for="(h, i) in SKELETON_HEIGHTS" :key="i" :style="{ blockSize: `${h}%` }" />
    </div>
    <template v-else>
      <div class="timeline-bars" role="list">
        <button
          v-for="bucket in buckets"
          :key="bucket.start"
          type="button"
          role="listitem"
          class="timeline-bar"
          :disabled="!bucket.count"
          :aria-label="bucketLabel(bucket)"
          :title="bucketLabel(bucket)"
          @click="emit('select-range', { from: bucket.start, to: bucket.end })"
        >
          <span class="bar-total" :style="{ blockSize: height(bucket.count) }">
            <span v-if="bucket.errors" class="bar-errors" :style="{ blockSize: `${(bucket.errors / bucket.count) * 100}%` }" />
          </span>
        </button>
      </div>
      <div class="timeline-axis" aria-hidden="true">
        <span>{{ axisLabel(buckets[0]?.start) }}</span>
        <span>{{ axisLabel(buckets[buckets.length - 1]?.end) }}</span>
      </div>
    </template>
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IEventsOverviewBucket } from '@/services/apis/events-service';

const props = defineProps<{ buckets: IEventsOverviewBucket[]; loading?: boolean }>();
const emit = defineEmits<{ (e: 'select-range', range: { from: string; to: string }): void }>();

const { t, locale } = useI18n();

const SKELETON_HEIGHTS = [30, 45, 25, 60, 40, 75, 35, 55, 30, 65, 45, 25, 50, 70, 35, 45, 60, 30, 40, 55, 25, 45, 35, 50];

const max = computed(() => Math.max(1, ...props.buckets.map((b) => b.count)));
const hasData = computed(() => props.buckets.some((b) => b.count > 0));

function height(count: number) {
  if (!count) return '2px';
  return `${Math.max(6, (count / max.value) * 100)}%`;
}

const spanMs = computed(() => {
  const first = props.buckets[0];
  const last = props.buckets[props.buckets.length - 1];
  return first && last ? new Date(last.end).getTime() - new Date(first.start).getTime() : 0;
});

function axisLabel(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  return spanMs.value > 3 * 24 * 3600 * 1000
    ? date.toLocaleDateString(locale.value || undefined, { month: 'short', day: 'numeric' })
    : date.toLocaleString(locale.value || undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function bucketLabel(bucket: IEventsOverviewBucket) {
  const base = `${axisLabel(bucket.start)} – ${axisLabel(bucket.end)}: ${bucket.count.toLocaleString()} ${t('events')}`;
  return bucket.errors ? `${base}, ${bucket.errors.toLocaleString()} ${t('Errors')}` : base;
}
</script>

<style scoped lang="scss">
.events-timeline {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-skeleton {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  block-size: 64px;

  span {
    flex: 1 1 0;
    border-radius: 3px;
    background: var(--el-fill-color);
    animation: timeline-pulse 1.4s ease-in-out infinite;
  }
}

@keyframes timeline-pulse {
  50% {
    opacity: 0.45;
  }
}

.timeline-bars {
  display: flex;
  align-items: stretch;
  gap: 3px;
  block-size: 64px;
}

.timeline-bar {
  flex: 1 1 0;
  min-inline-size: 0;
  display: flex;
  align-items: flex-end;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }

  &:not(:disabled):hover .bar-total {
    background: var(--el-color-primary);
  }
}

.bar-total {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  inline-size: 100%;
  border-radius: 3px;
  background: var(--el-color-primary-light-5);
  overflow: hidden;
  transition: background-color 0.15s ease;
}

.bar-errors {
  display: block;
  background: var(--el-color-danger);
}

.timeline-axis {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .bar-total {
    transition: none;
  }

  .timeline-skeleton span {
    animation: none;
  }
}
</style>
