<template>
  <div class="events-list">
    <div class="pagination-summary" v-if="total > 0">
      {{ $t('Page') }} {{ (currentPage ?? 0) + 1 }} {{ $t('of') }} {{ totalPages }} · {{ totalDisplay }} {{ $t('events') }}
    </div>

    <div class="events-list-actions" v-if="events.length">
      <el-button size="small" @click="downloadExport('csv')">
        {{ $t('Export CSV') }}
      </el-button>
      <el-button size="small" @click="downloadExport('json')">
        {{ $t('Export JSON') }}
      </el-button>
    </div>

    <el-table
      ref="tableRef"
      :data="events"
      v-loading="loading"
      row-key="_id"
      stripe
      style="width: 100%"
      :default-sort="{ prop: 'created', order: 'descending' }"
      class="events-table"
      @row-click="toggleEventDetails"
    >
      <el-table-column type="expand" width="48">
        <template #default="{ row }">
          <div class="event-expanded-details">
            <pre dir="ltr">{{ formatEventDetails(row) }}</pre>
          </div>
        </template>
      </el-table-column>

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
          <el-text truncated>{{ row.source || '-' }}</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="user" :label="$t('User')" min-width="170">
        <template #default="{ row }">
          <el-text truncated dir="ltr">{{ getEventUserLabel(row) || '-' }}</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="workspace" :label="$t('Workspace')" min-width="170">
        <template #default="{ row }">
          <el-text truncated dir="ltr">{{ getEventWorkspaceLabel(row) || '-' }}</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="metadata" :label="$t('Metadata')" min-width="260">
        <template #default="{ row }">
          <el-text truncated dir="ltr">{{ getMetadataPreview(row) || '-' }}</el-text>
        </template>
      </el-table-column>

      <el-table-column :label="$t('Actions')" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            text
            @click.stop="viewDetails(row._id)"
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
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import EventDetailsDrawer from './EventDetailsDrawer.vue';
import eventsService, { IEvent } from '@/services/apis/events-service';
import {
  createEventsExport,
  EventsExportFormat,
  getEventUserId,
  getEventWorkspaceId,
} from '../services/event-export';

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
const tableRef = ref<any>(null);

if (typeof window !== 'undefined') {
  window.addEventListener('resize', updateIsMobile);
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateIsMobile);
  }
});

function updateIsMobile() {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
  }
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
  const typeMap: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    'openai': 'primary',
    'anthropic': 'success',
    'plugin': 'warning',
    'system': 'info',
    'error': 'danger',
  };
  return typeMap[kind] || 'info';
}

function getEventUserLabel(event: IEvent) {
  if (!event.user || typeof event.user === 'string') {
    return getEventUserId(event);
  }

  return event.user.username || event.user.email || event.user._id || '';
}

function getEventWorkspaceLabel(event: IEvent) {
  if (!event.workspace || typeof event.workspace === 'string') {
    return getEventWorkspaceId(event);
  }

  return event.workspace.name || event.workspace._id || '';
}

function getMetadataPreview(event: IEvent) {
  const metadata = event.metadata;
  if (!metadata) {
    return '';
  }

  if (typeof metadata !== 'object') {
    return String(metadata);
  }

  const entries = Object.entries(metadata).slice(0, 4);
  return entries.map(([key, value]) => `${key}: ${formatMetadataPreviewValue(value)}`).join(', ');
}

function formatMetadataPreviewValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatEventDetails(event: IEvent) {
  return JSON.stringify({
    ...event,
    user: getEventUserLabel(event) || event.user,
    workspace: getEventWorkspaceLabel(event) || event.workspace,
    metadata: event.metadata,
  }, null, 2);
}

function toggleEventDetails(row: IEvent) {
  tableRef.value?.toggleRowExpansion(row);
}

function downloadExport(format: EventsExportFormat) {
  const file = createEventsExport(props.events, format);
  const blob = new Blob([file.content], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  link.href = url;
  link.download = `events-${timestamp}.${file.extension}`;
  link.click();
  URL.revokeObjectURL(url);

  ElMessage.success(`Exported ${props.events.length} events as ${format.toUpperCase()}`);
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

.events-list-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-block-end: 8px;
}

.events-table :deep(.el-table__row) {
  cursor: pointer;
}

.event-expanded-details {
  padding: 12px 16px;
  background: var(--negative-color);
  border: 1px solid var(--el-border-color, #e4e7ed);
  border-radius: 4px;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.6;
    color: var(--main-color);
  }
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
