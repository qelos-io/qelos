<template>
  <div class="events-list">
    <div class="pagination-summary" v-if="total > 0">
      {{ $t('Page') }} {{ (currentPage ?? 0) + 1 }} {{ $t('of') }} {{ totalPages }} · {{ totalDisplay }} {{ $t('events') }}
    </div>

    <el-table
      :data="events"
      v-loading="loading"
      stripe
      style="width: 100%"
      :default-sort="{ prop: 'created', order: 'descending' }"
      class="events-table"
    >
      <el-table-column prop="created" :label="$t('Date')" width="180" sortable>
        <template #default="{ row }">
          {{ formatDate(row.created) }}
        </template>
      </el-table-column>

      <el-table-column prop="kind" :label="$t('Kind')" width="150" sortable>
        <template #default="{ row }">
          <el-tag :type="getKindTagType(row.kind)" size="small">
            {{ row.kind }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="eventName" :label="$t('Event Name')" width="200" sortable />

      <el-table-column prop="source" :label="$t('Source')" width="200" sortable>
        <template #default="{ row }">
          <el-text truncated>{{ row.source }}</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="description" :label="$t('Description')" min-width="250">
        <template #default="{ row }">
          <el-text truncated>{{ row.description }}</el-text>
        </template>
      </el-table-column>

      <el-table-column :label="$t('Actions')" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            text
            @click="viewDetails(row._id)"
          >
            Details
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container" v-if="totalPages > 1">
      <el-pagination
        :current-page="(currentPage ?? 0) + 1"
        :page-size="limit"
        :total="total"
        :layout="paginationLayout"
        @current-change="handlePageChange"
      />
    </div>

    <EventDetailsDrawer
      v-model:visible="drawerVisible"
      :event="selectedEvent"
      :loading="detailLoading"
      :format-date="formatDate"
      :get-kind-tag-type="getKindTagType"
      @close="handleDrawerClose"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import EventDetailsDrawer from './EventDetailsDrawer.vue';
import eventsService, { IEvent } from '@/services/apis/events-service';

const router = useRouter();
const route = useRoute();

const props = withDefaults(
  defineProps<{
    events: IEvent[];
    loading: boolean;
    total?: number;
    totalCapped?: boolean;
    totalPages?: number;
    limit?: number;
    currentPage?: number;
  }>(),
  { total: 0, totalCapped: false, totalPages: 0, limit: 50, currentPage: 0 }
);

const MOBILE_BREAKPOINT = 768;
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);
const paginationLayout = computed(() => (isMobile.value ? 'prev, pager, next' : 'total, prev, pager, next, jumper'));

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
  });
}
const drawerVisible = ref(false);
const selectedEvent = ref<IEvent | null>(null);
const detailLoading = ref(false);
const lastLoadedEventId = ref<string | null>(null);

const totalDisplay = computed(() =>
  props.totalCapped ? `${(props.total ?? 0).toLocaleString()}+` : String(props.total ?? 0)
);

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getKindTagType(kind: string) {
  const typeMap: Record<string, any> = {
    'openai': 'primary',
    'anthropic': 'success',
    'plugin': 'warning',
    'system': 'info',
    'error': 'danger',
  };
  return typeMap[kind] || 'info';
}

function handlePageChange(page: number) {
  router.push({
    query: {
      ...route.query,
      page: String(Math.max(0, page - 1)),
    },
  });
}

function updateRouteEventId(eventId?: string) {
  router.push({
    query: {
      ...route.query,
      eventId: eventId || undefined,
    },
  });
}

function viewDetails(eventId: string) {
  updateRouteEventId(eventId);
}

function handleDrawerClose() {
  if (route.query.eventId) {
    updateRouteEventId();
  }
}

watch(
  () => route.query.eventId as string | undefined,
  async (eventId) => {
    if (!eventId) {
      lastLoadedEventId.value = null;
      drawerVisible.value = false;
      selectedEvent.value = null;
      return;
    }

    drawerVisible.value = true;

    if (lastLoadedEventId.value === eventId && selectedEvent.value) {
      return;
    }

    detailLoading.value = true;
    selectedEvent.value = null;
    lastLoadedEventId.value = eventId;

    try {
      selectedEvent.value = await eventsService.getOne(eventId);
    } finally {
      detailLoading.value = false;
    }
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.events-list {
  margin-block-start: 20px;
}

.pagination-summary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-block-start: 20px;
  padding: 20px 0;
}

@media (max-width: 768px) {
  .events-table {
    font-size: 12px;
  }

  .pagination-container :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
