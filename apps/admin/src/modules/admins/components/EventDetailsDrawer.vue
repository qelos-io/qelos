<template>
  <el-dialog
    class="event-details-dialog"
    v-model="visible"
    :title="$t('Event Details')"
    :width="isMobile ? '100%' : '720px'"
    :fullscreen="isMobile"
    :close-on-click-modal="false"
    append-to-body
    destroy-on-close
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
          <el-descriptions-item
            :label="$t('Workspace')"
            v-if="event.metadata?.workspace"
          >
            <router-link
              class="user-link"
              :to="{
                name: 'editWorkspace',
                params: { workspaceId: event.metadata.workspace },
              }"
            >
              {{ event.metadata.workspace }}
            </router-link>
          </el-descriptions-item>
        </el-descriptions>

        <div
          v-if="
            isBlueprintEntityEvent &&
            (blueprintEntityLoading || blueprintEntity || blueprintEntityError)
          "
          class="metadata-section"
        >
          <div class="section-header">
            <h3>{{ $t("Blueprint Entity") }}</h3>
            <el-tag size="small" type="info">
              {{ blueprintIdentifiers?.blueprintId }} /
              {{ blueprintIdentifiers?.entityId }}
            </el-tag>
          </div>
          <div class="metadata-content">
            <el-skeleton v-if="blueprintEntityLoading" :rows="3" animated />
            <el-alert
              v-else-if="blueprintEntityError"
              :title="blueprintEntityError"
              type="error"
              show-icon
              :closable="false"
            />
            <div v-else-if="blueprintEntity" class="entity-details">
              <el-descriptions :column="1" border>
                <el-descriptions-item :label="$t('Identifier')">
                  {{ blueprintEntity.identifier }}
                </el-descriptions-item>
                <el-descriptions-item :label="$t('Created')">
                  {{ formatDate(blueprintEntity.created) }}
                </el-descriptions-item>
                <el-descriptions-item :label="$t('Updated')">
                  {{ formatDate(blueprintEntity.updated) }}
                </el-descriptions-item>
                <el-descriptions-item
                  :label="$t('User')"
                  v-if="blueprintEntity.user"
                >
                  {{ blueprintEntity.user }}
                </el-descriptions-item>
                <el-descriptions-item
                  :label="$t('Workspace')"
                  v-if="blueprintEntity.workspace"
                >
                  {{ blueprintEntity.workspace }}
                </el-descriptions-item>
              </el-descriptions>

              <div v-if="blueprintEntity.metadata" class="metadata-subsection">
                <h4>{{ $t("Entity Data") }}</h4>
                <pre>{{
                  JSON.stringify(blueprintEntity.metadata, null, 2)
                }}</pre>
              </div>
            </div>
          </div>
        </div>

        <div v-if="event.metadata" class="metadata-section">
          <h3>{{ $t("Metadata") }}</h3>
          <pre class="metadata-content">{{
            JSON.stringify(event.metadata, null, 2)
          }}</pre>
        </div>
      </template>
      <div v-else class="event-details__empty">
        <el-empty :description="$t('Select an event to view details')" />
      </div>
    </div>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { IEvent } from "@/services/apis/events-service";
import type { IUser } from "@/modules/core/store/types/user";
import usersService from "@/services/apis/users-service";
import sdk from "@/services/sdk";

const visible = defineModel<boolean>("visible");

type TagType = "primary" | "success" | "warning" | "info" | "danger";

const props = defineProps<{
  event: IEvent | null;
  loading: boolean;
  formatDate: (date: Date | string) => string;
  getKindTagType: (kind: string) => TagType;
}>();

const emit = defineEmits<{ (event: "close"): void }>();

const userDetails = ref<IUser | null>(null);
const userDetailsLoading = ref(false);
let lastRequestedUserId: string | null = null;

const blueprintEntity = ref<any | null>(null);
const blueprintEntityLoading = ref(false);
const blueprintEntityError = ref<string | null>(null);
let lastBlueprintRequestKey: string | null = null;
const isMobile = ref(false);

const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

onMounted(() => {
  updateIsMobile();
  window.addEventListener("resize", updateIsMobile);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateIsMobile);
});

const blueprintIdentifiers = computed(() => {
  const metadata = props.event?.metadata;
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const blueprintId = metadata.blueprint || metadata.blueprintId;
  const entityId = metadata.entity || metadata.entityId || metadata.identifier;

  if (!blueprintId || !entityId) {
    return null;
  }

  return {
    blueprintId,
    entityId,
  };
});

const isBlueprintEntityEvent = computed(() => {
  if (!props.event || props.event.source !== "blueprints") {
    return false;
  }

  const normalizedEventName = props.event.eventName?.toLowerCase() || "";
  return (
    ["create", "update"].includes(normalizedEventName) &&
    !!blueprintIdentifiers.value
  );
});

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
  { immediate: true }
);

watch(
  () => [
    props.event?._id,
    blueprintIdentifiers.value?.blueprintId,
    blueprintIdentifiers.value?.entityId,
    isBlueprintEntityEvent.value,
  ],
  async ([eventId, blueprintId, entityId, shouldFetch]) => {
    if (!shouldFetch || !blueprintId || !entityId) {
      blueprintEntity.value = null;
      blueprintEntityError.value = null;
      blueprintEntityLoading.value = false;
      lastBlueprintRequestKey = null;
      return;
    }

    const requestKey = `${eventId || "unknown"}:${blueprintId}:${entityId}`;
    lastBlueprintRequestKey = requestKey;
    blueprintEntityLoading.value = true;
    blueprintEntityError.value = null;

    try {
      const entity = await sdk.blueprints
        .entitiesOf(blueprintId)
        .getEntity(entityId, { query: { bypassAdmin: "" } });
      if (lastBlueprintRequestKey === requestKey) {
        blueprintEntity.value = entity;
      }
    } catch (error: any) {
      if (lastBlueprintRequestKey === requestKey) {
        blueprintEntity.value = null;
        blueprintEntityError.value =
          error?.message || "Failed to load blueprint entity";
      }
    } finally {
      if (lastBlueprintRequestKey === requestKey) {
        blueprintEntityLoading.value = false;
      }
    }
  },
  { immediate: true }
);

const userDisplayName = computed(() => {
  if (!props.event?.user) {
    return "";
  }

  const user = userDetails.value;
  if (!user || userDetailsLoading.value) {
    return props.event.user;
  }

  return user.firstName
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email || props.event.user;
});
</script>

<style scoped lang="scss">
.event-details-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.event-details {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;

  &__empty {
    padding: 40px 0;
    text-align: center;
    color: #909399;
  }

  .metadata-section {
    margin-top: 24px;
    padding: 15px;
    border-radius: 4px;
    background: var(--el-color-info-light-9, #f5f7fa);
    border: 1px solid var(--el-border-color, #e4e7ed);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .metadata-content {
    font-size: 12px;
    line-height: 1.6;
    overflow-x: auto;
  }

  .entity-details {
    .el-descriptions {
      margin-bottom: 12px;
    }
  }

  .metadata-subsection {
    margin-top: 16px;
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

@media (max-width: 768px) {
  .event-details {
    max-height: calc(100vh - 120px);
  }
}
</style>
