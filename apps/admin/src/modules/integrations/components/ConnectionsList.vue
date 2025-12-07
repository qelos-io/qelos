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

const navigateToKind = (kind: IntegrationSourceKind) => {
  router.push({ name: 'integrations-sources', params: { kind } });
};

const handleAddCommand = (kind: IntegrationSourceKind | string) => {
  if (!kind) return;
  openCreateForm(kind as IntegrationSourceKind);
};

const handlePrimaryAddClick = () => {
  if (!sortedKindOptions.value.length) return;
  openCreateForm(sortedKindOptions.value[0].kind);
};
</script>

<template>
  <section class="connections-panel">
    <header class="panel-header">
      <div class="panel-copy">
        <p class="panel-title">{{ $t('Connected providers') }}</p>
        <p class="panel-meta" v-if="activeKinds.length">
          {{ $t('{count} active', { count: totalConnections }) }}
        </p>
        <p class="panel-meta" v-else>
          {{ $t('No active connections yet') }}
        </p>
      </div>

      <el-dropdown
        trigger="click"
        placement="bottom-end"
        @command="handleAddCommand"
      >
        <el-button
          type="primary"
          size="small"
          :disabled="!sortedKindOptions.length"
        >
          <el-icon><icon-plus /></el-icon>
          <span>{{ $t('Add connection') }}</span>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu class="add-connection-menu">
            <el-dropdown-item
              v-for="kind in sortedKindOptions"
              :key="kind.kind"
              :command="kind.kind"
            >
              <div class="dropdown-kind">
                <img
                  v-if="kind.logo"
                  :src="kind.logo"
                  :alt="kind.name"
                  class="integration-logo"
                >
                <div class="dropdown-kind__copy">
                  <span class="name">{{ kind.name }}</span>
                  <span class="hint">{{ $t('Create new connection') }}</span>
                </div>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
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
        @click="handlePrimaryAddClick"
      >
        <el-icon><icon-plus /></el-icon>
        <span>{{ $t('Create connection') }}</span>
      </el-button>
    </el-empty>

    <div v-else class="connections-list">
      <button
        v-for="kind in activeKinds"
        :key="kind.kind"
        type="button"
        class="connection-item"
        @click="navigateToKind(kind.kind)"
      >
        <div class="integration-logo-container" aria-hidden="true">
          <img
            v-if="kind.logo"
            :src="kind.logo"
            :alt="kind.name"
            class="integration-logo"
          >
          <p
            v-else
            centered
            class="integration-fallback"
          >
            {{ kind.name.charAt(0) }}
          </p>
        </div>
        <div class="connection-details">
          <span class="integration-name">{{ kind.name }}</span>
          <span class="integration-count">
            {{ $t('{count} connections', { count: kind.sources }) }}
          </span>
        </div>
        <el-button
          class="add-inline-btn"
          link
          size="small"
          type="primary"
          @click.stop="openCreateForm(kind.kind)"
        >
          <el-icon><icon-plus /></el-icon>
          {{ $t('Add') }}
        </el-button>
      </button>
    </div>

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

.connections-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.connection-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--border-radius);
  border: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
  text-align: left;
}

.connection-item:hover {
  border-color: var(--el-color-primary-light-5);
  background-color: var(--el-color-primary-light-9);
  transform: translateY(-1px);
}

.connection-item:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.integration-logo-container {
  width: 44px;
  height: 44px;
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

.add-inline-btn {
  margin-inline-start: auto;
}

.add-connection-menu {
  min-width: 220px;
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

.connections-empty {
  border-radius: var(--border-radius);
  border: 1px dashed var(--el-border-color-lighter);
  padding: 24px;
}

.connection-item {
  border: none;
  background: var(--el-bg-color);
}
</style>
