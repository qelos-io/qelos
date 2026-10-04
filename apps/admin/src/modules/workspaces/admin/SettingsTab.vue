<script lang="ts" setup>
defineOptions({ inheritAttrs: false });
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { formatDate } from '@/modules/pricing-plans/services/pricing';

const props = defineProps<{ workspace: any }>();
const emit = defineEmits<{ (e: 'request-delete'): void }>();

const { t } = useI18n();

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success(t('Copied'));
  } catch {
    ElMessage.error(t('Copy failed'));
  }
}
</script>

<template>
  <div class="settings-tab">
    <el-card shadow="never">
      <template #header><span>{{ t('Information') }}</span></template>
      <el-descriptions :column="1" size="small" border>
        <el-descriptions-item :label="t('Workspace ID')">
          <code dir="ltr">{{ props.workspace._id }}</code>
          <el-button link type="primary" size="small" @click="copy(props.workspace._id)">{{ t('Copy ID') }}</el-button>
        </el-descriptions-item>
        <el-descriptions-item :label="t('Created')">{{ formatDate(props.workspace.created) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="danger-zone">
      <template #header><span class="danger-title">{{ t('Danger zone') }}</span></template>
      <div class="danger-row">
        <div>
          <strong>{{ t('Delete this workspace') }}</strong>
          <p>{{ t('Permanently removes the workspace and its member list. This cannot be undone.') }}</p>
        </div>
        <el-button type="danger" plain @click="emit('request-delete')">{{ t('Delete workspace') }}</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.settings-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.danger-zone {
  border-color: var(--el-color-danger-light-5);
}

.danger-title {
  color: var(--el-color-danger);
  font-weight: 600;
}

.danger-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.danger-row p {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
