<template>
  <article v-if="event" v-loading="loading" class="event-panel">
    <el-alert v-if="failed" class="panel-alert" type="warning" show-icon :closable="false" :title="$t('Could not load the full event')" />
    <header class="panel-head">
      <span class="panel-dot" :class="severity" />
      <div class="panel-title">
        <h2 dir="ltr">{{ event.eventName }}</h2>
        <p class="panel-when">
          <time :datetime="String(event.created)">{{ fullDate }}</time>
          <span aria-hidden="true"> · </span>
          <span>{{ relativeDate }}</span>
        </p>
      </div>
      <el-tag size="small" effect="plain" dir="ltr">{{ event.kind }}</el-tag>
    </header>

    <p v-if="event.description" class="panel-lede">{{ event.description }}</p>
    <el-alert v-if="errorMessage" type="error" show-icon :closable="false" :title="errorMessage" class="panel-alert" />

    <dl class="panel-facts">
      <div class="fact">
        <dt>{{ $t('Source') }}</dt>
        <dd>
          <span dir="ltr" class="fact-value">{{ event.source || '-' }}</span>
          <el-button v-if="event.source" text size="small" @click="emit('filter', { source: event.source })">{{ $t('Filter') }}</el-button>
        </dd>
      </div>
      <div v-if="eventUserId" class="fact">
        <dt>{{ $t('User') }}</dt>
        <dd>
          <router-link class="user-link" :to="{ name: 'editUser', params: { userId: eventUserId } }">
            {{ userDisplayName }}
          </router-link>
          <el-button text size="small" @click="emit('filter', { user: eventUserId })">{{ $t('Filter') }}</el-button>
        </dd>
      </div>
      <div v-if="eventWorkspaceId" class="fact">
        <dt>{{ $t('Workspace') }}</dt>
        <dd>
          <router-link class="user-link" dir="ltr" :to="{ name: 'adminEditWorkspace', params: { id: eventWorkspaceId } }">
            {{ eventWorkspaceId }}
          </router-link>
          <el-button text size="small" @click="emit('filter', { workspace: eventWorkspaceId })">{{ $t('Filter') }}</el-button>
        </dd>
      </div>
      <div class="fact">
        <dt>{{ $t('Event ID') }}</dt>
        <dd>
          <span dir="ltr" class="fact-value mono">{{ event._id }}</span>
          <el-button text size="small" :aria-label="$t('Copy')" @click="copy(event._id)">
            <el-icon><DocumentCopy /></el-icon>
          </el-button>
        </dd>
      </div>
    </dl>

    <section v-if="related.length" class="panel-section">
      <h3>{{ $t('Same user, nearby') }}</h3>
      <ul class="related-list">
        <li v-for="item in related" :key="item._id">
          <button type="button" class="related-item" @click="emit('select', item._id)">
            <span class="panel-dot small" :class="severityOf(item)" />
            <time>{{ timeOf(item.created) }}</time>
            <span dir="ltr" class="related-name">{{ item.eventName }}</span>
          </button>
        </li>
      </ul>
    </section>

    <div
      v-if="isPaymentsEvent && paymentsMetadata"
      class="metadata-section"
    >
      <div class="section-header">
        <h3>{{ $t("Payment Details") }}</h3>
        <el-tag v-if="paymentsMetadata.providerKind" size="small" type="warning">
          {{ paymentsMetadata.providerKind }}
        </el-tag>
      </div>
      <div class="metadata-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item
            v-if="paymentsMetadata.providerKind"
            :label="$t('Provider')"
          >
            {{ paymentsMetadata.providerKind }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="paymentsMetadata.operation"
            :label="$t('Operation')"
          >
            {{ paymentsMetadata.operation }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="paymentsMetadata.code"
            :label="$t('Code')"
          >
            {{ paymentsMetadata.code }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="paymentsDocsUrl"
            :label="$t('Documentation')"
          >
            <a
              :href="paymentsDocsUrl"
              target="_blank"
              rel="noopener"
              class="docs-link"
            >
              {{ $t("View troubleshooting guide") }}
            </a>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="paymentsErrorMessage"
            :label="$t('Error')"
          >
            {{ paymentsErrorMessage }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="paymentsMetadata.subscriptionId"
            :label="$t('Subscription')"
          >
            {{ paymentsMetadata.subscriptionId }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="paymentsMetadata.externalSubscriptionId"
            :label="$t('External Subscription')"
          >
            {{ paymentsMetadata.externalSubscriptionId }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="paymentsMetadata.planId"
            :label="$t('Plan')"
          >
            {{ paymentsMetadata.planId }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="paymentsMetadata.externalEventId"
            :label="$t('External Event')"
          >
            {{ paymentsMetadata.externalEventId }}
          </el-descriptions-item>
        </el-descriptions>

        <div
          v-if="paymentsMetadata.error && typeof paymentsMetadata.error === 'object'"
          class="metadata-subsection"
        >
          <h4>{{ $t("Error Details") }}</h4>
          <pre dir="ltr">{{
            JSON.stringify(paymentsMetadata.error, null, 2)
          }}</pre>
        </div>

        <div
          v-if="paymentsMetadata.providerResponse"
          class="metadata-subsection"
        >
          <h4>{{ $t("Provider Response") }}</h4>
          <pre dir="ltr">{{
            JSON.stringify(paymentsMetadata.providerResponse, null, 2)
          }}</pre>
        </div>
      </div>
    </div>

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
            <pre dir="ltr">{{
              JSON.stringify(blueprintEntity.metadata, null, 2)
            }}</pre>
          </div>
        </div>
      </div>
    </div>

    <section v-if="event.metadata" class="panel-section">
      <div class="section-header">
        <h3>{{ $t('Metadata') }}</h3>
        <el-button text size="small" @click="copy(metadataJson)">
          <el-icon><DocumentCopy /></el-icon>
          {{ $t('Copy') }}
        </el-button>
      </div>
      <pre dir="ltr" class="metadata-content">{{ metadataJson }}</pre>
    </section>
  </article>
  <el-empty v-else :description="$t('Select an event to view details')" :image-size="72" />
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { DocumentCopy } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import type { IEvent } from "@/services/apis/events-service";
import type { IUser } from "@/modules/core/store/types/user";
import usersService from "@/services/apis/users-service";
import sdk from "@/services/sdk";
import { getEventUserId, getEventWorkspaceId } from "../services/event-export";
import {
  formatRelative,
  getEventErrorMessage,
  getEventSeverity,
} from "../services/event-presentation";

const props = defineProps<{
  event: IEvent | null;
  loading?: boolean;
  /** the complete event could not be loaded; what the feed had is shown */
  failed?: boolean;
  related?: IEvent[];
}>();

const emit = defineEmits<{
  (e: "select", id: string): void;
  (e: "filter", patch: Record<string, string>): void;
}>();

const { t, locale } = useI18n();

const related = computed(() => props.related ?? []);
const severity = computed(() => (props.event ? getEventSeverity(props.event) : "normal"));
const severityOf = getEventSeverity;
const errorMessage = computed(() => (props.event ? getEventErrorMessage(props.event) : ""));
const fullDate = computed(() =>
  props.event
    ? new Date(props.event.created).toLocaleString(locale.value || undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : "",
);
const relativeDate = computed(() =>
  props.event ? formatRelative(props.event.created, new Date(), locale.value || undefined) : "",
);
const metadataJson = computed(() => JSON.stringify(props.event?.metadata ?? null, null, 2));

function timeOf(created: Date | string) {
  return new Date(created).toLocaleTimeString(locale.value || undefined);
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t("Copied"));
  } catch {
    ElMessage.error(t("Could not copy"));
  }
}

const userDetails = ref<IUser | null>(null);
const userDetailsLoading = ref(false);
let lastRequestedUserId: string | null = null;

const blueprintEntity = ref<any | null>(null);
const blueprintEntityLoading = ref(false);
const blueprintEntityError = ref<string | null>(null);
let lastBlueprintRequestKey: string | null = null;
const eventUserId = computed(() => (props.event ? getEventUserId(props.event) : ""));
const eventWorkspaceId = computed(() => (props.event ? getEventWorkspaceId(props.event) : ""));

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

const isPaymentsEvent = computed(() => {
  return props.event?.source?.startsWith("payments") ?? false;
});

const paymentsMetadata = computed(() => {
  const metadata = props.event?.metadata;
  if (!metadata || typeof metadata !== "object" || !isPaymentsEvent.value) {
    return null;
  }

  return metadata as Record<string, unknown>;
});

const paymentsErrorMessage = computed(() => {
  const error = paymentsMetadata.value?.error;
  if (!error || typeof error !== "object") {
    return "";
  }

  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : "";
});

const paymentsDocsUrl = computed(() => {
  const docsUrl = paymentsMetadata.value?.docsUrl;
  return typeof docsUrl === "string" && docsUrl ? docsUrl : "";
});

watch(
  () => eventUserId.value,
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
  if (!eventUserId.value) {
    return "";
  }

  const user = userDetails.value;
  if (!user || userDetailsLoading.value) {
    return eventUserId.value;
  }

  return user.firstName
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email || eventUserId.value;
});

</script>

<style scoped lang="scss">
.event-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.panel-dot {
  flex: none;
  inline-size: 10px;
  block-size: 10px;
  margin-block-start: 9px;
  border-radius: 50%;
  background: var(--el-color-success);

  &.error {
    background: var(--el-color-danger);
    box-shadow: 0 0 0 3px var(--el-color-danger-light-8);
  }

  &.small {
    inline-size: 8px;
    block-size: 8px;
    margin: 0;
    background: var(--el-border-color);

    &.error {
      background: var(--el-color-danger);
      box-shadow: none;
    }
  }
}

.panel-title {
  flex: 1;
  min-inline-size: 0;

  h2 {
    margin: 0;
    font-size: 18px;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
}

.panel-when {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.panel-lede {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.panel-facts {
  margin: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  overflow: hidden;
}

.fact {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 12px;

  & + .fact {
    border-block-start: 1px solid var(--el-border-color-extra-light);
  }

  dt {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  dd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-inline-size: 0;
    margin: 0;
  }
}

.fact-value {
  min-inline-size: 0;
  overflow-wrap: anywhere;

  &.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.related-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.related-item {
  display: flex;
  align-items: center;
  gap: 10px;
  inline-size: 100%;
  min-block-size: 36px;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
  }

  time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-variant-numeric: tabular-nums;
  }
}

.related-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metadata-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

pre.metadata-content,
.metadata-subsection pre {
  max-block-size: 420px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.metadata-section h3,
.metadata-subsection h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.user-link,
.docs-link {
  color: var(--el-color-primary);
  font-weight: 500;
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover {
    text-decoration: underline;
  }
}

.metadata-subsection {
  margin-block-start: 12px;
}

:deep(.el-descriptions__cell) {
  overflow-wrap: anywhere;
}
</style>
