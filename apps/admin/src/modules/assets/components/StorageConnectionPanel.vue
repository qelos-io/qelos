<template>
  <section class="connection-panel" :aria-label="$t('Connection')">
    <h2>{{ $t('Connection') }}</h2>

    <template v-if="storageId">
      <div class="status-block" :class="status.state">
        <StorageStatusChip :status="status" />
        <p v-if="status.state === 'ok'" class="status-note">
          {{ $t('The storage answered and its root can be listed.') }}
          <template v-if="status.fileCount !== undefined">
            {{ status.fileCount.toLocaleString() }} {{ $t('items at the root') }}.
          </template>
        </p>
        <template v-else-if="status.state === 'error'">
          <p class="status-note error-note">{{ status.message }}</p>
          <p v-if="provider" class="status-tip">{{ $t(provider.troubleshooting) }}</p>
        </template>
        <p v-else-if="status.state === 'idle'" class="status-note">
          {{ $t('Run a test to confirm the credentials and location work.') }}
        </p>
      </div>

      <el-button type="primary" plain :loading="status.state === 'checking'" @click="run">
        {{ $t('Test connection') }}
      </el-button>
      <p v-if="dirty" class="dirty-note">{{ $t('Save your changes first — the test uses the saved settings.') }}</p>

      <div class="files-block">
        <h3>{{ $t('Files') }}</h3>
        <BasicFileUploader :storage="storageId" @upload="onUploaded" />
        <BasicAssetsList v-if="status.state === 'ok'" :key="refreshKey" :storage="storageId" class="files-list" />
      </div>
    </template>

    <template v-else>
      <p class="status-note">
        {{ $t('After saving you can test the connection and upload a file to see it work.') }}
      </p>
    </template>
  </section>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import StorageStatusChip from './StorageStatusChip.vue';
import BasicFileUploader from './BasicFileUploader.vue';
import BasicAssetsList from './AssetsDetailsPanel/BasicAssetsList.vue';
import { getStorageStatus, testStorage } from '../compositions/storage-status';
import { getStorageProvider } from '../services/storage-providers';

const props = defineProps<{ storageId?: string; kind?: string; dirty?: boolean }>();

const route = useRoute();
const status = computed(() => (props.storageId ? getStorageStatus(props.storageId) : { state: 'idle' as const }));
const provider = computed(() => getStorageProvider(props.kind));
const refreshKey = ref(0);

function run() {
  if (props.storageId) {
    testStorage(props.storageId);
  }
}

function onUploaded() {
  refreshKey.value++;
  run();
}

onMounted(() => {
  if (props.storageId && route.query.test) {
    run();
  }
});
</script>

<style scoped lang="scss">
.connection-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);

  h2 {
    margin: 0;
    font-size: 16px;
  }

  h3 {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }
}

.status-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);

  &.ok {
    background: var(--el-color-success-light-9);
  }

  &.error {
    background: var(--el-color-danger-light-9);
  }
}

.status-note,
.status-tip,
.dirty-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--el-text-color-regular);
}

.error-note {
  color: var(--el-color-danger);
  overflow-wrap: anywhere;
}

.status-tip,
.dirty-note {
  color: var(--el-text-color-secondary);
}

.files-block {
  padding-block-start: 14px;
  border-block-start: 1px solid var(--el-border-color-extra-light);
}

.files-list {
  max-block-size: 260px;
  margin-block-start: 12px;
}

:deep(.basic-file-uploader) {
  padding: 0;
}
</style>
