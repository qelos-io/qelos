<template>
  <span class="status-chip" :class="status.state" role="status">
    <el-icon v-if="status.state === 'checking'" class="is-loading"><Loading /></el-icon>
    <span v-else class="status-dot" aria-hidden="true" />
    <span class="status-label">{{ label }}</span>
    <span v-if="when" class="status-when">{{ when }}</span>
  </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { formatRelative } from '@/modules/admins/services/event-presentation';
import type { StorageStatus } from '../compositions/storage-status';

const props = defineProps<{ status: StorageStatus }>();
const { t, locale } = useI18n();

const label = computed(
  () =>
    ({
      idle: t('Not tested'),
      checking: t('Testing…'),
      ok: t('Connected'),
      error: t('Connection failed'),
    })[props.status.state],
);

const when = computed(() =>
  props.status.checkedAt && props.status.state !== 'checking'
    ? formatRelative(props.status.checkedAt, new Date(), locale.value || undefined)
    : '',
);
</script>

<style scoped lang="scss">
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.status-dot {
  inline-size: 10px;
  block-size: 10px;
  border-radius: 50%;
  background: var(--el-border-color-darker);
}

.ok {
  color: var(--el-color-success);

  .status-dot {
    background: var(--el-color-success);
    box-shadow: 0 0 0 3px var(--el-color-success-light-8);
  }
}

.error {
  color: var(--el-color-danger);

  .status-dot {
    background: var(--el-color-danger);
    box-shadow: 0 0 0 3px var(--el-color-danger-light-8);
  }
}

.status-when {
  font-weight: 400;
  color: var(--el-text-color-secondary);
}
</style>
