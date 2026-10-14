<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IEvent } from '@/services/apis/events-service';
import { formatRelative, getEventSeverity, getEventSummary } from '@/modules/admins/services/event-presentation';

const props = defineProps<{
  data: IEvent[];
  platform: IEvent[];
  loadingData: boolean;
  loadingPlatform: boolean;
  blueprintLabel: (identifier: string) => string;
}>();

const { t, locale } = useI18n();
const tab = ref<'data' | 'platform'>('data');
const now = new Date();

const rows = computed(() =>
  (tab.value === 'data' ? props.data : props.platform).map((event: any) => ({
    id: event._id,
    when: formatRelative(event.created, now, locale.value || undefined),
    title: tab.value === 'data' ? `${props.blueprintLabel(event.kind)} · ${event.eventName}` : `${event.kind} · ${event.eventName}`,
    sub: tab.value === 'data' ? getEventSummary(event) : [event.source, getEventSummary(event)].filter(Boolean).join(' · '),
    error: getEventSeverity(event) === 'error',
  })),
);
const loading = computed(() => (tab.value === 'data' ? props.loadingData : props.loadingPlatform));
</script>

<template>
  <section class="card" :aria-label="$t('Activity')">
    <header class="head">
      <h2>{{ $t('Activity') }}</h2>
      <el-segmented
        v-model="tab"
        size="small"
        :options="[
          { label: t('Your data'), value: 'data' },
          { label: t('Platform'), value: 'platform' },
        ]"
        :aria-label="$t('Activity type')"
      />
    </header>

    <el-skeleton v-if="loading && !rows.length" :rows="4" animated class="pad" />
    <ul v-else-if="rows.length" class="feed">
      <li v-for="row in rows" :key="row.id" class="row" :class="{ error: row.error }">
        <span class="marker" aria-hidden="true" />
        <div class="text">
          <p class="title" dir="auto">{{ row.title }}</p>
          <p v-if="row.sub" class="sub" dir="auto">{{ row.sub }}</p>
        </div>
        <time class="when">{{ row.when }}</time>
      </li>
    </ul>
    <p v-else class="empty">{{ tab === 'data' ? $t('No changes to your data in the last week.') : $t('No platform events in the last week.') }}</p>

    <footer class="foot">
      <router-link :to="{ name: 'log' }">{{ $t('See everything in the events log') }}</router-link>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.card {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 8px;

  h2 {
    margin: 0;
    font-size: 1rem;
  }
}

.pad {
  padding: 8px 16px 16px;
}

.feed {
  margin: 0;
  padding: 0 8px;
  list-style: none;
}

.row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 8px;
  border-block-start: 1px solid var(--el-border-color-extra-light);

  &:first-child {
    border-block-start: 0;
  }
}

.marker {
  flex: none;
  inline-size: 8px;
  block-size: 8px;
  margin-block-start: 7px;
  border-radius: 50%;
  background: var(--el-color-primary-light-5);
}

.error .marker {
  background: var(--el-color-danger);
}

.text {
  flex: 1;
  min-inline-size: 0;
}

.title,
.sub {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title {
  color: var(--el-text-color-primary);
  font-size: 0.92rem;
}

.sub {
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
}

.when {
  flex: none;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  white-space: nowrap;
}

.empty {
  margin: 0;
  padding: 24px 16px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.foot {
  padding: 10px 16px 14px;
  border-block-start: 1px solid var(--el-border-color-extra-light);
  font-size: 0.88rem;

  a {
    color: var(--el-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
