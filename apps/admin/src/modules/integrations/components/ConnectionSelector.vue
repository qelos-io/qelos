<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus, Search } from '@element-plus/icons-vue';
import { IIntegrationSource, IntegrationSourceKind } from '@qelos/global-types';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useIntegrationSourceDefaults } from '@/modules/integrations/compositions/use-integration-source-defaults';
import IntegrationSourceFormModal from '@/modules/integrations/components/IntegrationSourceFormModal.vue';
import integrationSourcesService from '@/services/apis/integration-sources-service';
import { useSubmitting } from '@/modules/core/compositions/submitting';

const props = withDefaults(defineProps<{
  modelValue?: string | null;
  sectionTitle?: string;
  fieldLabel?: string;
  description?: string;
  placeholder?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  disabled?: boolean;
  clearable?: boolean;
}>(), {
  sectionTitle: 'Connection',
  fieldLabel: '',
  description: '',
  placeholder: '',
  emptyStateTitle: '',
  emptyStateDescription: '',
  disabled: false,
  clearable: true
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null | undefined): void;
  (e: 'change', value: string | null | undefined): void;
}>();

const { t } = useI18n();
const store = useIntegrationSourcesStore();
const kinds = useIntegrationKinds();
const { buildBlankIntegrationSource } = useIntegrationSourceDefaults();

const innerValue = computed<string | undefined>({
  get: () => (props.modelValue === '' ? undefined : props.modelValue ?? undefined),
  set: (value) => {
    emit('update:modelValue', value);
    emit('change', value);
  }
});

const optionGroups = computed(() => {
  const sourceGroups = (store.groupedSources || {}) as Record<string, IIntegrationSource[] | undefined>;

  return Object.entries(sourceGroups)
    .map(([kind, sources]) => {
      const items = (sources || []).slice().sort(sortByName);
      return {
        kind: kind as IntegrationSourceKind,
        displayName: formatKindName(kind),
        logo: kinds[kind as IntegrationSourceKind]?.logo,
        sources: items
      };
    })
    .filter((group) => group.sources.length > 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
});

const selectedSource = computed(() => store.result?.find((source) => source._id === props.modelValue));

const kindOptions = computed(() => Object.values(kinds).sort((a, b) => a.name.localeCompare(b.name)));
const hasKinds = computed(() => kindOptions.value.length > 0);

const createModalVisible = ref(false);
const selectedKind = ref<IntegrationSourceKind | ''>('');
const modalDraft = ref<any>();

const searchTerm = ref('');
const dropdownOpen = ref(false);

const placeholderText = computed(() => props.placeholder || t('Search by name, label, or metadata'));
const resolvedFieldLabel = computed(() => props.fieldLabel || t('Select a connection for this workflow'));
const emptyTitle = computed(() => props.emptyStateTitle || t('No connections match your filters'));
const emptyDescription = computed(() => props.emptyStateDescription || t('Try adjusting the search or create a new connection.'));
const createButtonLabel = computed(() => t('New connection'));

const filteredGroups = computed(() => {
  const normalizedTerm = searchTerm.value.trim().toLowerCase();

  return optionGroups.value
    .map((group) => {
      const matchingSources = group.sources.filter((source) => {
        if (!normalizedTerm) return true;
        const base = `${source.name} ${(source.labels || []).join(' ')} ${Object.values(source.metadata || {}).join(' ')}`;
        return base.toLowerCase().includes(normalizedTerm);
      });

      return {
        ...group,
        sources: matchingSources
      };
    })
    .filter((group) => group.sources.length > 0);
});

const totalMatches = computed(() => filteredGroups.value.reduce((sum, group) => sum + group.sources.length, 0));
const noResults = computed(() => !store.loading && totalMatches.value === 0);

const startCreate = (kind?: IntegrationSourceKind) => {
  const fallback = kind || kindOptions.value[0]?.kind;
  if (!fallback) return;

  selectedKind.value = fallback;
  modalDraft.value = buildBlankIntegrationSource(fallback);
  createModalVisible.value = true;
  dropdownOpen.value = false;
};

const onCreateCommand = (kind: IntegrationSourceKind) => {
  startCreate(kind);
};

const clearFilters = () => {
  searchTerm.value = '';
};

const isSelected = (sourceId: string) => innerValue.value === sourceId;

const clearSelection = () => {
  innerValue.value = undefined;
  dropdownOpen.value = false;
};

const handleSelect = (sourceId: string) => {
  innerValue.value = sourceId;
  dropdownOpen.value = false;
};

const handleVisibilityChange = (visible: boolean) => {
  dropdownOpen.value = visible;
  if (!visible) {
    searchTerm.value = '';
  }
};

const closeCreateModal = () => {
  createModalVisible.value = false;
  selectedKind.value = '';
  modalDraft.value = undefined;
};

const { submit: saveConnection } = useSubmitting(
  async (formData: any) => {
    const saved = await integrationSourcesService.create(formData);
    await store.retry();
    return saved;
  },
  {
    success: t('Connection created successfully'),
    error: t('Failed to save connection')
  },
  (saved) => {
    closeCreateModal();
    if (saved?._id) {
      emit('update:modelValue', saved._id);
      emit('change', saved._id);
    }
  }
);

function sortByName(a: IIntegrationSource, b: IIntegrationSource) {
  return a.name.localeCompare(b.name);
}

function formatKindName(kind: string) {
  return kinds[kind as IntegrationSourceKind]?.name || capitalize(kind);
}

function capitalize(value: string) {
  if (!value) return '';
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
</script>

<template>
  <div class="connection-selector">
    <div class="connection-selector__head">
      <div>
        <h4>{{ $t(sectionTitle) }}</h4>
        <p class="help-text">{{ $t(description || resolvedFieldLabel) }}</p>
      </div>
      <el-dropdown
        v-if="hasKinds"
        trigger="click"
        @command="onCreateCommand"
        class="connection-selector__create"
      >
        <el-button type="primary" plain size="small">
          <el-icon><Plus /></el-icon>
          {{ createButtonLabel }}
        </el-button>
        <template #dropdown>
          <el-dropdown-menu class="connection-selector__create-menu">
            <el-dropdown-item
              v-for="kind in kindOptions"
              :key="kind.kind"
              :command="kind.kind"
            >
              <div class="connection-selector__create-item">
                <img v-if="kind.logo" :src="kind.logo" :alt="kind.name" class="connection-selector__kind-logo">
                <span>{{ kind.name }}</span>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button v-else type="primary" plain size="small" disabled>
        <el-icon><Plus /></el-icon>
        {{ createButtonLabel }}
      </el-button>
    </div>

    <el-popover
      trigger="click"
      placement="bottom-start"
      v-model:visible="dropdownOpen"
      :width="420"
      popper-class="connection-selector-popper"
      :teleported="true"
    >
      <template #reference>
        <button type="button" class="connection-selector__summary" :class="{ 'is-open': dropdownOpen }">
          <div class="connection-selector__summary-main">
            <img
              v-if="selectedSource && kinds[selectedSource.kind]?.logo"
              class="connection-selector__summary-logo"
              :src="kinds[selectedSource.kind].logo"
              :alt="kinds[selectedSource.kind].name"
            />
            <div class="connection-selector__summary-text">
              <strong v-if="selectedSource">{{ selectedSource.name }}</strong>
              <strong v-else>{{ $t('Select a connection') }}</strong>
              <small>{{ selectedSource ? formatKindName(selectedSource.kind) : $t('No connection selected') }}</small>
            </div>
          </div>
          <div v-if="selectedSource?.labels?.length" class="connection-selector__summary-labels">
            <el-tag
              v-for="label in selectedSource.labels"
              :key="label"
              size="small"
            >
              {{ label }}
            </el-tag>
          </div>
          <el-button
            v-if="clearable && selectedSource"
            link
            type="danger"
            size="small"
            @click.stop="clearSelection"
          >
            {{ $t('Clear selection') }}
          </el-button>
        </button>
      </template>

      <div class="connection-selector__panel" @click.stop>
        <div class="connection-selector__filters">
          <el-input
            v-model="searchTerm"
            :placeholder="placeholderText"
            class="connection-selector__search"
            clearable
            :disabled="disabled"
            dir="ltr"
            size="small"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button v-if="searchTerm" link type="primary" size="small" @click="clearFilters">
            {{ $t('Reset') }}
          </el-button>
        </div>

        <div class="connection-selector__list" :class="{ 'is-loading': store.loading }">
          <el-scrollbar max-height="320">
            <template v-if="filteredGroups.length">
              <div
                v-for="group in filteredGroups"
                :key="group.kind"
                class="connection-selector__group"
              >
                <div class="connection-selector__group-header">
                  <div class="connection-selector__group-info">
                    <div class="connection-selector__group-avatar">
                      <img v-if="group.logo" :src="group.logo" :alt="group.displayName" />
                      <span v-else>{{ group.displayName.charAt(0) }}</span>
                    </div>
                    <div>
                      <strong>{{ group.displayName }}</strong>
                      <small>{{ group.sources.length }} {{ $t('connections') }}</small>
                    </div>
                  </div>
                  <el-button text size="small" @click.stop="startCreate(group.kind)">{{ $t('Add') }}</el-button>
                </div>

                <div class="connection-selector__cards">
                  <button
                    v-for="source in group.sources"
                    :key="source._id"
                    type="button"
                    class="connection-card"
                    :class="{ selected: isSelected(source._id) }"
                    @click="handleSelect(source._id)"
                    :disabled="disabled"
                  >
                    <div class="connection-card__row">
                      <div class="connection-card__avatar">{{ source.name.charAt(0).toUpperCase() }}</div>
                      <div class="connection-card__body">
                        <strong>{{ source.name }}</strong>
                        <small>{{ group.displayName }}</small>
                        <div v-if="source.labels?.length" class="connection-card__labels">
                          <el-tag
                            v-for="label in source.labels"
                            :key="label"
                            size="small"
                          >
                            {{ label }}
                          </el-tag>
                        </div>
                      </div>
                      <span v-if="isSelected(source._id)" class="connection-card__check">✓</span>
                    </div>
                  </button>
                </div>
              </div>
            </template>

            <div v-else class="connection-selector__empty">
              <strong>{{ emptyTitle }}</strong>
              <p>{{ emptyDescription }}</p>
              <el-button type="primary" size="small" @click.stop="startCreate()">
                <el-icon><Plus /></el-icon>
                {{ $t('Create connection') }}
              </el-button>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </el-popover>

  </div>

  <IntegrationSourceFormModal
    v-model:visible="createModalVisible"
    :editing-integration="modalDraft"
    :kind="selectedKind"
    @save="saveConnection"
    @close="closeCreateModal"
  />
</template>

<style scoped>
.connection-selector {
  margin-block-end: 20px;
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color-page);
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.connection-selector__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.connection-selector__head h4 {
  margin: 0 0 4px 0;
  font-weight: 600;
}

.connection-selector__head .help-text {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.connection-selector__create-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-selector__kind-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  margin: 0;
}



.connection-selector__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.connection-selector__search :deep(.el-input__wrapper) {
  border-radius: 999px;
  padding-inline: 16px;
}

.connection-selector__panel {
  min-width: 360px;
}

.connection-selector__list {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  padding: 12px;
}

.connection-selector__list.is-loading {
  opacity: 0.6;
}

.connection-selector__group {
  margin-block-end: 16px;
}

.connection-selector__group:last-of-type {
  margin-block-end: 0;
}

.connection-selector__group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-block-end: 8px;
}

.connection-selector__group-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-selector__group-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background-color: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.connection-selector__group-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  margin-bottom: 0;
}


.connection-selector__cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}


.connection-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  padding: 10px;
  text-align: start;
  cursor: pointer;
  transition: all 0.2s ease;
}


.connection-card:hover:not(.selected) {
  border-color: var(--el-color-primary);
}

.connection-card.selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.connection-card__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
}

.connection-card__avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--el-color-info-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.connection-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.connection-card__labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.connection-card__check {
  font-weight: 600;
  color: var(--el-color-primary);
}

.connection-selector__empty {
  padding: 32px;
  text-align: center;
  color: var(--el-text-color-secondary);
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.connection-selector__summary {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background-color: var(--el-color-info-light-9);
  width: 100%;
  cursor: pointer;
}

.connection-selector__summary-main {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.connection-selector__summary-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  margin: 0;
}

.connection-selector__summary-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: start;
}

.connection-selector__summary-main strong {
  font-size: 0.95rem;
}

.connection-selector__summary-main small {
  color: var(--el-text-color-secondary);
}

.connection-selector__summary-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
