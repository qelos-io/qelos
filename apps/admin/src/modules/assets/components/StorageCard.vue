<template>
  <article class="storage-card" :class="status.state">
    <header class="card-head">
      <img :src="provider?.logo" alt="" aria-hidden="true" class="card-logo" />
      <div class="card-title">
        <router-link class="card-name" :to="{ name: 'editStorage', params: { storageId: storage._id } }">
          {{ storage.name }}
        </router-link>
        <span class="card-provider">{{ provider?.label || storage.kind }}</span>
      </div>
      <el-tag v-if="storage.isDefault" size="small" type="success" effect="plain">{{ $t('Default') }}</el-tag>
      <el-dropdown trigger="click" @command="onCommand">
        <el-button text circle :aria-label="`${$t('Actions')}: ${storage.name}`">
          <el-icon><MoreFilled /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="edit">{{ $t('Edit') }}</el-dropdown-item>
            <el-dropdown-item command="test">{{ $t('Test connection') }}</el-dropdown-item>
            <el-dropdown-item command="remove" divided class="danger-item">{{ $t('Remove') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </header>

    <dl class="card-meta">
      <div v-if="container">
        <dt>{{ $t(provider?.containerLabel || 'Bucket Name') }}</dt>
        <dd dir="ltr">{{ container }}</dd>
      </div>
      <div v-if="storage.metadata?.publicUrl">
        <dt>{{ $t('Public URL') }}</dt>
        <dd dir="ltr">{{ storage.metadata.publicUrl }}</dd>
      </div>
      <div v-if="storage.metadata?.basePath && storage.metadata.basePath !== '/'">
        <dt>{{ $t('Base Storage Path') }}</dt>
        <dd dir="ltr">{{ storage.metadata.basePath }}</dd>
      </div>
      <p v-if="!container && !storage.metadata?.publicUrl" class="meta-empty">{{ $t('No location details yet') }}</p>
    </dl>

    <footer class="card-foot">
      <div class="foot-status">
        <StorageStatusChip :status="status" />
        <p v-if="status.state === 'error'" class="foot-message">{{ status.message }}</p>
        <p v-else-if="status.state === 'ok' && status.fileCount !== undefined" class="foot-message ok-note">
          {{ status.fileCount.toLocaleString() }} {{ $t('items at the root') }}
        </p>
      </div>
      <el-button size="small" :loading="status.state === 'checking'" @click="emit('test', storage._id)">
        {{ status.state === 'error' ? $t('Retry') : $t('Test connection') }}
      </el-button>
    </footer>
  </article>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { MoreFilled } from '@element-plus/icons-vue';
import StorageStatusChip from './StorageStatusChip.vue';
import { getStorageProvider } from '../services/storage-providers';
import type { StorageStatus } from '../compositions/storage-status';
import type { IStorage } from '@/services/types/storage';

const props = defineProps<{ storage: IStorage; status: StorageStatus }>();
const emit = defineEmits<{
  (e: 'test', id: string): void;
  (e: 'remove', storage: IStorage): void;
}>();

const router = useRouter();
const provider = computed(() => getStorageProvider(props.storage.kind));
const container = computed(() => props.storage.metadata?.bucketName);

function onCommand(command: string) {
  if (command === 'edit') {
    router.push({ name: 'editStorage', params: { storageId: props.storage._id } });
  } else if (command === 'test') {
    emit('test', props.storage._id);
  } else if (command === 'remove') {
    emit('remove', props.storage);
  }
}
</script>

<style scoped lang="scss">
.storage-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &.error {
    border-color: var(--el-color-danger-light-5);
  }
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-logo {
  flex: none;
  inline-size: 40px;
  block-size: 40px;
  object-fit: contain;
}

.card-title {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;
}

.card-name {
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.card-provider {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;

  > div {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 8px;
    font-size: 13px;
  }

  dt {
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.meta-empty {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.card-foot {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-block-start: auto;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--el-border-color-extra-light);
}

.foot-status {
  min-inline-size: 0;
}

.foot-message {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-color-danger);
  overflow-wrap: anywhere;

  &.ok-note {
    color: var(--el-text-color-secondary);
  }
}

:deep(.danger-item) {
  color: var(--el-color-danger);
}

@media (prefers-reduced-motion: reduce) {
  .storage-card {
    transition: none;
  }
}
</style>
