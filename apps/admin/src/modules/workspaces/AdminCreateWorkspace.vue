<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import Breadcrumb from '../core/components/Breadcrumb.vue';
import WorkspaceDetailsForm from './components/WorkspaceDetailsForm.vue';
import type { WorkspaceDetails } from './components/WorkspaceDetailsForm.vue';
import workspacesService from '@/services/apis/workspaces-service';
import useAdminWorkspacesList from './store/admin-workspaces-list';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';

const router = useRouter();
const { t } = useI18n();
const adminList = useAdminWorkspacesList();
const myList = useWorkspacesList();

const form = ref<WorkspaceDetails>({ name: '', logo: '', labels: [] });
const errors = ref<{ name?: string }>({});
const creating = ref(false);

async function create() {
  if (!form.value.name.trim()) {
    errors.value = { name: t('Workspace name is required') };
    return;
  }
  errors.value = {};
  creating.value = true;
  try {
    const { _id } = await workspacesService.create({
      name: form.value.name.trim(),
      logo: form.value.logo || undefined,
      labels: form.value.labels,
    } as any);
    ElMessage.success(t('Workspace created successfully'));
    await Promise.all([adminList.reload(), myList.reload()]);
    router.push({ name: 'adminEditWorkspace', params: { id: _id } });
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || t('Failed to create Workspace'));
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="create-workspace-page">
    <Breadcrumb :items="[
      { text: t('Workspaces'), icon: ['fas', 'layer-group'], to: { name: 'adminWorkspaces' } },
      { text: t('Create Workspace') },
    ]" />

    <el-card shadow="never">
      <template #header><span>{{ t('Create Workspace') }}</span></template>
      <WorkspaceDetailsForm v-model="form" :errors="errors" @keyup.enter="create" />
      <el-alert type="info" :closable="false" show-icon class="note"
        :title="t('You will be added as an admin member. Add other members, a plan and a coupon after creating it.')" />
      <div class="actions">
        <el-button @click="router.push({ name: 'adminWorkspaces' })">{{ t('Cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="create">{{ t('Create Workspace') }}</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.create-workspace-page {
  padding: 20px;
  max-inline-size: 800px;
  margin-inline: auto;
}

.note {
  margin-block-start: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-block-start: 16px;
}
</style>
