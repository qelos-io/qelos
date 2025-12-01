<script setup lang="ts">
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import IntegrationSourceFormModal from '@/modules/integrations/components/IntegrationSourceFormModal.vue';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import integrationSourcesService from '@/services/apis/integration-sources-service';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { computed, ref } from 'vue';
import { IntegrationSourceKind } from '@qelos/global-types';

const kinds = useIntegrationKinds();
const integrationSourcesStore = useIntegrationSourcesStore();

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
const sourcesCount = computed(() => {
  if (!integrationSourcesStore.groupedSources) return {};
  const counts = {};
  for (const [kind, sources] of Object.entries(integrationSourcesStore.groupedSources)) {
    counts[kind] = sources?.length || 0;
  }
  return counts;
});
</script>

<template>
  <div>
    <p>{{ $t('Choose any provider to manage connections') }}:</p>
    
    <div class="blocks-list">
      <el-tooltip 
        v-for="(kind, key) in kinds" 
        :key="kind.kind"
        :content="kind.name"
        placement="top"
        :effect="'light'"
        :enterable="false"
      >
        <BlockItem 
          class="source" 
          @click="$router.push({ name: 'integrations-sources', params: { kind: kind.kind } })">
          <div class="integration-logo-container">
            <img v-if="kind.logo" :src="kind.logo" :alt="kind.name" class="integration-logo">
            <p centered v-else class="large">{{ kind.name }}</p>
            <el-badge v-if="sourcesCount[kind.kind] && sourcesCount[kind.kind] > 0" :value="sourcesCount[kind.kind]" class="source-count-badge" type="primary" />
          </div>
          <div class="integration-name">{{ kind.name }}</div>
          <el-button
            class="add-source-btn"
            type="primary"
            size="small"
            circle
            aria-label="Add connection"
            @click.stop="openCreateForm(key)"
          >
            <el-icon><icon-plus /></el-icon>
          </el-button>
        </BlockItem>
      </el-tooltip>
    </div>

    <IntegrationSourceFormModal
      v-model:visible="formVisible"
      :editing-integration="editingIntegration"
      :kind="selectedKind"
      @save="saveConnection"
      @close="handleCloseForm"
    />
  </div>
</template>

<style scoped>
.blocks-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-content: flex-start;
  gap: 0px;
  margin-block-start: 20px;
}

.source {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  width: 86px;
  height: 86px;
}

.source:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

:is(.source) :deep(.el-card__body) {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.integration-logo-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-block-start: 12px;
  height: 60px;
  width: 100%;
}

.integration-logo {
  max-width: 100%;
  max-height: 60px;
  border-radius: var(--border-radius);
  margin: 0;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.integration-name {
  margin-block-start: 12px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.large {
  font-size: 26px;
}

.source-count-badge {
  position: absolute;
  inset-block-start: -8px;
  inset-inline-end: -8px;
}

.add-source-btn {
  position: absolute;
  inset-block-end: 8px;
  inset-inline-start: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.source:hover .add-source-btn,
.add-source-btn:focus-visible {
  opacity: 1;
  pointer-events: auto;
}
</style>
