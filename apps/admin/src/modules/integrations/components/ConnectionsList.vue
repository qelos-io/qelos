<script setup lang="ts">
import IntegrationSourceFormModal from '@/modules/integrations/components/IntegrationSourceFormModal.vue';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import integrationSourcesService from '@/services/apis/integration-sources-service';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { computed, ref } from 'vue';
import { IntegrationSourceKind } from '@qelos/global-types';
import { useRouter } from 'vue-router';

const kinds = useIntegrationKinds();
const integrationSourcesStore = useIntegrationSourcesStore();
const router = useRouter();

const formVisible = ref(false);
const selectedKind = ref<IntegrationSourceKind | string>('');
const editingIntegration = ref<any>(null);

const resetFormState = () => {
  formVisible.value = false;
  editingIntegration.value = null;
  selectedKind.value = '';
};

const getDefaultMetadata = (kind: IntegrationSourceKind) => {
  if (kind === IntegrationSourceKind.LinkedIn) {
    return { scope: 'openid email profile' };
  }
  if (kind === IntegrationSourceKind.Facebook) {
    return { scope: 'openid email public_profile' };
  }
  if (kind === IntegrationSourceKind.Google || kind === IntegrationSourceKind.GitHub) {
    return { scope: 'openid email profile' };
  }
  if (kind === IntegrationSourceKind.Gemini) {
    return { defaultModel: 'gemini-1.5-pro-latest' };
  }
  return {};
};

const openCreateForm = (kind: IntegrationSourceKind) => {
  selectedKind.value = kind;
  editingIntegration.value = {
    kind,
    name: '',
    labels: [],
    metadata: getDefaultMetadata(kind),
    authentication: {}
  };
  formVisible.value = true;
};

const { submit: saveConnection } = useSubmitting(
  async (formData: any) => {
    const savedData = await integrationSourcesService.create(formData);
    await integrationSourcesStore.retry();
    return savedData;
  },
  {
    success: 'Connection created successfully',
    error: 'Failed to save connection'
  },
  resetFormState
);

const handleCloseForm = () => {
  resetFormState();
};

// Count sources by kind
const sourcesCount = computed<Record<string, number>>(() => {
  if (!integrationSourcesStore.groupedSources) return {};
  const counts = {};
  for (const [kind, sources] of Object.entries(integrationSourcesStore.groupedSources)) {
    counts[kind] = sources?.length || 0;
  }
  return counts;
});

type KindOption = {
  logo?: string;
  name: string;
  kind: IntegrationSourceKind;
};

const kindOptions = computed<KindOption[]>(() => Object.values(kinds) as KindOption[]);

const sortedKindOptions = computed<KindOption[]>(() =>
  [...kindOptions.value].sort((a, b) => a.name.localeCompare(b.name))
);

const activeKinds = computed(() =>
  sortedKindOptions.value
    .map((kind) => ({
      ...kind,
      sources: sourcesCount.value[kind.kind] || 0
    }))
    .filter((kind) => kind.sources > 0)
);

const totalConnections = computed(() =>
  activeKinds.value.reduce((sum, kind) => sum + kind.sources, 0)
);

const providersWithConnections = computed(() => activeKinds.value.length);

const navigateToKind = (kind: IntegrationSourceKind) => {
  router.push({ name: 'integrations-sources', params: { kind } });
};

const addMenuKinds = computed(() => sortedKindOptions.value);

const handlePrimaryAddClick = (kind?: IntegrationSourceKind) => {
  const targetKind = kind ?? addMenuKinds.value[0]?.kind;
  if (!targetKind) return;
  openCreateForm(targetKind);
};
</script>

<template>
  <section class="connections-panel">
    <header class="panel-header">
      <div class="panel-copy">
        <p class="panel-title">{{ $t('Connected providers') }}</p>
        <p class="panel-meta" v-if="activeKinds.length">
          {{ $t('{providers} providers · {connections} total', {
            providers: providersWithConnections,
            connections: totalConnections
          }) }}
        </p>
        <p class="panel-meta" v-else>
          {{ $t('No active connections yet') }}
        </p>
      </div>
      <div class="panel-actions">
        <el-popover
          v-if="addMenuKinds.length > 1"
          placement="bottom-end"
          trigger="click"
          popper-class="add-connection-pop"
        >
          <div class="popover-list">
            <button
              v-for="kind in addMenuKinds"
              :key="kind.kind"
              type="button"
              class="popover-item"
              @click="handlePrimaryAddClick(kind.kind)"
            >
              <img v-if="kind.logo" :src="kind.logo" class="popover-logo" />
              <span>{{ kind.name }}</span>
            </button>
          </div>
          <template #reference>
            <el-button
              type="primary"
              size="small"
              :disabled="!addMenuKinds.length"
            >
              <el-icon><icon-plus /></el-icon>
              <span>{{ $t('Add connection') }}</span>
            </el-button>
          </template>
        </el-popover>
        <el-button
          v-else
          type="primary"
          size="small"
          :disabled="!addMenuKinds.length"
          @click="() => handlePrimaryAddClick()"
        >
          <el-icon><icon-plus /></el-icon>
          <span>{{ $t('Add connection') }}</span>
        </el-button>
      </div>
    </header>

    <el-empty
      v-if="!activeKinds.length"
      class="connections-empty"
      :description="$t('Start by connecting your first provider')"
    >
      <el-button
        type="primary"
        size="small"
        :disabled="!sortedKindOptions.length"
        @click="() => handlePrimaryAddClick()"
      >
        <el-icon><icon-plus /></el-icon>
        <span>{{ $t('Create connection') }}</span>
      </el-button>
    </el-empty>

    <ul v-else class="connection-chips">
      <li
        v-for="kind in activeKinds"
        :key="kind.kind"
        class="connection-chip"
      >
        <div
          class="chip-main"
          role="button"
          tabindex="0"
          @click="navigateToKind(kind.kind)"
          @keydown.enter.prevent="navigateToKind(kind.kind)"
          @keydown.space.prevent="navigateToKind(kind.kind)"
        >
          <div class="integration-logo-container" aria-hidden="true">
            <img
              v-if="kind.logo"
              :src="kind.logo"
              :alt="kind.name"
              class="integration-logo"
            >
            <p v-else centered class="integration-fallback">
              {{ kind.name.charAt(0) }}
            </p>
          </div>
          <div class="connection-details">
            <span class="integration-name">{{ kind.name }}</span>
            <span class="integration-count">
              {{ $t('{count} connections', { count: kind.sources }) }}
            </span>
          </div>
          <el-tag size="small" type="info">
            {{ $t('{count} active', { count: kind.sources }) }}
          </el-tag>
        </div>
        <div class="chip-actions">
          <el-link
            :underline="false"
            type="info"
            @click.stop="navigateToKind(kind.kind)"
          >
            {{ $t('Manage') }}
          </el-link>
          <span class="divider" aria-hidden="true">·</span>
          <el-link
            :underline="false"
            type="primary"
            @click.stop="openCreateForm(kind.kind)"
          >
            <el-icon><icon-plus /></el-icon>
            {{ $t('Add') }}
          </el-link>
        </div>
      </li>
    </ul>

    <IntegrationSourceFormModal
      v-model:visible="formVisible"
      :editing-integration="editingIntegration"
      :kind="selectedKind"
      @save="saveConnection"
      @close="handleCloseForm"
    />
  </section>
</template>

<style scoped>
.connections-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--el-text-color-primary);
  margin: 0;
}

.panel-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.connections-empty {
  border-radius: var(--border-radius);
  border: 1px dashed var(--el-border-color-lighter);
  padding: 24px;
}

.add-connection-menu {
  min-inline-size: 220px;
}

.dropdown-kind {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dropdown-kind__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-kind .name {
  font-weight: 500;
}

.dropdown-kind .hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.connection-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.connection-chip {
  flex: 1 1 260px;
  min-inline-size: 240px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius) * 1.2);
  background-color: var(--el-bg-color);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.connection-chip:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.chip-main {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  outline: none;
}

.chip-main:focus-visible {
  outline: 2px solid var(--el-color-primary);
  border-radius: calc(var(--border-radius) * 0.8);
}

.integration-logo-container {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background-color: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.integration-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  margin: 0;
}

.integration-fallback {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-regular);
}

.connection-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.integration-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.integration-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.chip-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.chip-actions .divider {
  color: var(--el-text-color-disabled);
}

.popover-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px;
  border-radius: var(--border-radius);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.popover-item:hover {
  background-color: var(--el-fill-color-light);
}

.popover-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 4px;
  margin: 0;
}

.connections-empty {
  border-radius: var(--border-radius);
  border: 1px dashed var(--el-border-color-lighter);
  padding: 24px;
}
</style>
