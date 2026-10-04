<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

export interface WorkspaceDetails {
  name: string;
  logo: string;
  labels: string[];
}

/** Name, logo and labels of a workspace. Saving is up to the parent. */
const model = defineModel<WorkspaceDetails>({ required: true });
const props = defineProps<{ errors?: Partial<Record<keyof WorkspaceDetails, string>> }>();

const { t } = useI18n();
const wsConfig = useWsConfiguration();

// labels defined in the workspace configuration, plus whatever the workspace already has
const labelOptions = computed(() => [
  ...new Set([
    ...(wsConfig.metadata.labels || []).flatMap((definition) => definition.value || []),
    ...model.value.labels,
  ]),
]);

function patch(change: Partial<WorkspaceDetails>) {
  model.value = { ...model.value, ...change };
}
</script>

<template>
  <el-form label-position="top" class="details-form" @submit.prevent>
    <el-form-item :label="t('Workspace Name')" required :error="props.errors?.name">
      <el-input
        :model-value="model.name"
        :placeholder="t('Enter workspace name')"
        maxlength="120"
        @update:model-value="patch({ name: $event })"
      />
    </el-form-item>

    <el-form-item :label="t('Workspace Logo')">
      <FormInput
        :model-value="model.logo"
        type="upload"
        :upload-config="{ isImage: true }"
        @update:model-value="patch({ logo: $event || '' })"
      />
      <div v-if="model.logo" class="logo-preview">
        <img :src="model.logo" :alt="t('Workspace Logo')" />
        <el-button size="small" text type="danger" @click="patch({ logo: '' })">{{ t('Remove logo') }}</el-button>
      </div>
    </el-form-item>

    <el-form-item :label="t('Workspace Labels')">
      <el-select
        :model-value="model.labels"
        multiple
        filterable
        clearable
        allow-create
        default-first-option
        :placeholder="t('Select or type labels')"
        style="width: 100%;"
        @update:model-value="patch({ labels: $event })"
      >
        <el-option v-for="label in labelOptions" :key="label" :label="label" :value="label" />
      </el-select>
      <p class="field-hint">{{ t('Labels group workspaces and can map them to plans or types.') }}</p>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.details-form {
  max-inline-size: 640px;
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-block-start: 8px;
}

.logo-preview img {
  inline-size: 56px;
  block-size: 56px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.field-hint {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
