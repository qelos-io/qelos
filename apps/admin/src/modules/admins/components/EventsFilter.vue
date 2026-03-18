<template>
  <div class="events-filter">
    <el-button
      v-if="isMobile"
      class="filters-trigger"
      @click="filterVisible = !filterVisible"
    >
      {{ filterVisible ? $t('Hide filters') : $t('Filters') }}{{ activeFiltersCount ? ` (${activeFiltersCount})` : '' }}
    </el-button>

    <el-collapse-transition>
      <div v-show="!isMobile || filterVisible" class="events-filter-panel">
        <div class="events-filter-row">
          <el-select
            v-model="selectedKind"
            clearable
            :placeholder="$t('Filter by kind')"
            :loading="filterOptionsLoading"
            @change="updateQuery"
            class="filter-select"
          >
            <el-option
              v-for="k in uniqueKinds"
              :key="k"
              :label="k"
              :value="k"
            />
          </el-select>

          <el-select
            v-model="selectedEventName"
            clearable
            :placeholder="$t('Filter by event name')"
            :loading="filterOptionsLoading"
            @change="updateQuery"
            class="filter-select"
          >
            <el-option
              v-for="name in uniqueEventNames"
              :key="name"
              :label="name"
              :value="name"
            />
          </el-select>

          <el-select
            v-model="selectedSource"
            clearable
            :placeholder="$t('Filter by source')"
            :loading="filterOptionsLoading"
            @change="updateQuery"
            class="filter-select"
          >
            <el-option
              v-for="src in uniqueSources"
              :key="src"
              :label="src"
              :value="src"
            />
          </el-select>
        </div>

        <div class="events-filter-row date-row">
          <el-select
            v-model="selectedPeriod"
            :placeholder="$t('Period')"
            @change="onPeriodChange"
            class="filter-select period-select"
          >
            <el-option :label="$t('Last Day')" value="last-day" />
            <el-option :label="$t('Last Week')" value="last-week" />
            <el-option :label="$t('Last Month')" value="last-month" />
            <el-option :label="$t('Last Year')" value="last-year" />
            <el-option :label="$t('All Time')" value="all-time" />
            <el-option :label="$t('Custom range')" value="custom" />
          </el-select>

          <template v-if="selectedPeriod === 'custom'">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              :range-separator="$t('to')"
              :start-placeholder="$t('From')"
              :end-placeholder="$t('To')"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              @change="onDateRangeChange"
              class="filter-date-range"
            />
          </template>
          <span v-else class="date-range-label">{{ dateRangeLabel }}</span>
        </div>
      </div>
    </el-collapse-transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const props = withDefaults(
  defineProps<{
    uniqueKinds: string[];
    uniqueEventNames: string[];
    uniqueSources: string[];
    filterOptionsLoading?: boolean;
    period?: string;
    from?: string;
    to?: string;
  }>(),
  { filterOptionsLoading: false }
);

const MOBILE_BREAKPOINT = 768;
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);
const filterVisible = ref(!isMobile.value);

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
    if (!isMobile.value) filterVisible.value = true;
  });
}

const selectedKind = ref<string | undefined>((route.query.kind as string) || undefined);
const selectedEventName = ref<string | undefined>((route.query.eventName as string) || undefined);
const selectedSource = ref<string | undefined>((route.query.source as string) || undefined);
const selectedPeriod = ref<string>((route.query.from && route.query.to) ? 'custom' : ((route.query.period as string) || 'last-week'));
const dateRange = ref<[string, string] | null>(
  props.from && props.to ? [props.from, props.to] : null
);

const activeFiltersCount = computed(() => {
  let n = 0;
  if (selectedKind.value) n++;
  if (selectedEventName.value) n++;
  if (selectedSource.value) n++;
  if (selectedPeriod.value && selectedPeriod.value !== 'last-week') n++;
  return n;
});

const periodLabels: Record<string, string> = {
  'last-day': 'Last 24 hours',
  'last-week': 'Last 7 days',
  'last-month': 'Last 30 days',
  'last-year': 'Last year',
  'all-time': 'All time',
  'custom': 'Custom range',
};

const dateRangeLabel = computed(() => {
  if (selectedPeriod.value === 'custom' && props.from && props.to) {
    return `${props.from} – ${props.to}`;
  }
  return periodLabels[selectedPeriod.value] || selectedPeriod.value || '';
});

watch(
  () => [route.query, props.from, props.to] as const,
  ([newQuery, from, to]) => {
    selectedKind.value = (newQuery as Record<string, string>).kind || undefined;
    selectedEventName.value = (newQuery as Record<string, string>).eventName || undefined;
    selectedSource.value = (newQuery as Record<string, string>).source || undefined;
    const q = newQuery as Record<string, string>;
    if (from && to) {
      selectedPeriod.value = 'custom';
      dateRange.value = [from, to];
    } else {
      selectedPeriod.value = q.period || 'last-week';
      dateRange.value = null;
    }
  },
  { immediate: true }
);

function onPeriodChange() {
  if (selectedPeriod.value !== 'custom') {
    dateRange.value = null;
    updateQuery();
  }
}

function onDateRangeChange(range: [string, string] | null) {
  if (!range || range.length !== 2) return;
  router.push({
    name: 'log',
    query: {
      ...route.query,
      period: undefined,
      from: range[0],
      to: range[1],
      page: undefined,
    },
  });
}

function updateQuery() {
  const isCustom = selectedPeriod.value === 'custom';
  router.push({
    name: 'log',
    query: {
      ...route.query,
      kind: selectedKind.value || undefined,
      eventName: selectedEventName.value || undefined,
      source: selectedSource.value || undefined,
      period: isCustom ? undefined : selectedPeriod.value,
      from: isCustom ? (route.query.from as string) || undefined : undefined,
      to: isCustom ? (route.query.to as string) || undefined : undefined,
      page: undefined,
    },
  });
}
</script>

<style scoped lang="scss">
.events-filter {
  width: 100%;
}

.filters-trigger {
  width: 100%;
  margin-bottom: 8px;
}

.events-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.events-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-select {
  min-width: 140px;
  flex: 1 1 140px;
  max-width: 200px;
}

.period-select {
  max-width: 160px;
}

.filter-date-range {
  flex: 1 1 220px;
  min-width: 180px;
}

.date-row {
  flex-wrap: wrap;
}

.date-range-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .events-filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-select,
  .filter-date-range {
    max-width: none;
    width: 100%;
  }

  .period-select {
    max-width: none;
  }
}
</style>
