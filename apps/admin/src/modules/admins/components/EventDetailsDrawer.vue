<template>
  <el-drawer
    v-model="visible"
    :title="$t('Event Details')"
    size="50%"
    direction="rtl"
    @close="emit('close')"
  >
    <div v-loading="loading" class="event-details">
      <template v-if="event">
        <el-descriptions :column="1" border>
          <el-descriptions-item :label="$t('Date')">
            {{ formatDate(event.created) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('Kind')">
            <el-tag :type="getKindTagType(event.kind)">
              {{ event.kind }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('Event Name')">
            {{ event.eventName }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('Source')">
            {{ event.source }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('Description')">
            {{ event.description }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('User')" v-if="event.user">
            <router-link
              class="user-link"
              :to="{ name: 'editUser', params: { userId: event.user } }"
            >
              {{ userDisplayName }}
            </router-link>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('Workspace')" v-if="event.metadata?.workspace">
            <router-link
              class="user-link"
              :to="{ name: 'editWorkspace', params: { workspaceId: event.metadata.workspace } }"
            >
              {{ event.metadata.workspace }}
            </router-link>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="event.metadata" class="metadata-section">
          <h3>{{ $t('Metadata') }}</h3>
          <pre class="metadata-content">{{ JSON.stringify(event.metadata, null, 2) }}</pre>
        </div>
      </template>
      <div v-else class="event-details__empty">
        <el-empty :description="$t('Select an event to view details')" />
      </div>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import type { IEvent } from '@/services/apis/events-service';
import type { IUser } from '@/modules/core/store/types/user';
import usersService from '@/services/apis/users-service';

const visible = defineModel<boolean>('visible');

type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger';

const props = defineProps<{
  event: IEvent | null;
  loading: boolean;
  formatDate: (date: Date | string) => string;
  getKindTagType: (kind: string) => TagType;
}>();

const emit = defineEmits<{ (event: 'close'): void }>();

const userDetails = ref<IUser | null>(null);
const userDetailsLoading = ref(false);
let lastRequestedUserId: string | null = null;

watch(
  () => props.event?.user,
  async (userId) => {
    lastRequestedUserId = userId ?? null;

    if (!userId) {
      userDetails.value = null;
      userDetailsLoading.value = false;
      return;
    }

    userDetailsLoading.value = true;

    try {
      const user = await usersService.getOne(userId);
      if (lastRequestedUserId === userId) {
        userDetails.value = user;
      }
    } catch (error) {
      if (lastRequestedUserId === userId) {
        userDetails.value = null;
      }
    } finally {
      if (lastRequestedUserId === userId) {
        userDetailsLoading.value = false;
      }
    }
  },
  { immediate: true },
);

const userDisplayName = computed(() => {
  if (!props.event?.user) {
    return '';
  }

  const user = userDetails.value;
  if (!user || userDetailsLoading.value) {
    return props.event.user;
  }

  return user.firstName ? `${user.firstName} ${user.lastName}` : user.username || user.email || props.event.user;
});
</script>

<style scoped lang="scss">
.event-details {
  padding: 20px;

  &__empty {
    padding: 40px 0;
    text-align: center;
    color: #909399;
  }

  .metadata-section {
    margin-top: 30px;

    h3 {
      margin-block-end: 15px;
      font-size: 16px;
      font-weight: 600;
    }

    .metadata-content {
      background-color: #f5f7fa;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.6;
    }
  }

  .user-link {
    color: var(--el-color-primary);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-width: 768px) {
  :deep(.el-drawer) {
    width: 90% !important;
  }
}
</style>
