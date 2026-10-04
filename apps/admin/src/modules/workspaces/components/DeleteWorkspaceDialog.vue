<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import workspacesService from '@/services/apis/workspaces-service';
import subscriptionsService from '@/services/apis/subscriptions-service';

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
  workspace: { _id: string; name: string; members?: unknown[] };
  /** the subscription currently attaching the workspace to a plan, if any */
  subscriptionId?: string;
}>();
const emit = defineEmits<{ (e: 'deleted'): void }>();

const { t } = useI18n();
const typedName = ref('');
const cancelSubscription = ref(true);
const deleting = ref(false);

watch(open, (isOpen) => {
  if (isOpen) {
    typedName.value = '';
    cancelSubscription.value = true;
  }
});

const confirmed = computed(() => typedName.value.trim() === props.workspace.name);

async function remove() {
  deleting.value = true;
  try {
    await workspacesService.remove(props.workspace._id);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || t('Failed to remove workspace'));
    deleting.value = false;
    return;
  }

  // the workspace is gone either way; a failed cancel is reported so it can be done from billing
  if (props.subscriptionId && cancelSubscription.value) {
    try {
      await subscriptionsService.cancel(props.subscriptionId);
    } catch {
      ElMessage.warning(t('The workspace was deleted but its subscription could not be canceled.'));
    }
  }

  deleting.value = false;
  open.value = false;
  ElMessage.success(t('Workspace removed successfully'));
  emit('deleted');
}
</script>

<template>
  <el-dialog v-model="open" :title="t('Delete workspace')" width="480px" :close-on-click-modal="!deleting">
    <el-alert type="error" show-icon :closable="false" :title="t('This cannot be undone.')">
      {{ t('"{name}" and its member list will be permanently deleted.', { name: workspace.name }) }}
    </el-alert>

    <el-checkbox v-if="subscriptionId" v-model="cancelSubscription" class="cancel-checkbox">
      {{ t('Also cancel its subscription') }}
    </el-checkbox>

    <p class="confirm-label">{{ t('Type the workspace name to confirm:') }} <strong dir="auto">{{ workspace.name }}</strong></p>
    <el-input v-model="typedName" dir="auto" :placeholder="workspace.name" @keyup.enter="confirmed && remove()" />

    <template #footer>
      <el-button :disabled="deleting" @click="open = false">{{ t('Cancel') }}</el-button>
      <el-button type="danger" :disabled="!confirmed" :loading="deleting" @click="remove">
        {{ t('Delete workspace') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.cancel-checkbox {
  display: block;
  margin-block-start: 16px;
}

.confirm-label {
  margin-block: 16px 8px;
}
</style>
