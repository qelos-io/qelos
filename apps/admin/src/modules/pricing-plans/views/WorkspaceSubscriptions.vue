<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import { useWorkspaceSubscriptionsStore, WorkspaceSubscriptionRow } from '../store/workspace-subscriptions';
import { usePlansStore } from '../store/plans';
import { BillingCycle } from '@qelos/global-types';
import PricingTabs from '../components/PricingTabs.vue';

const { t } = useI18n();
const workspaceSubscriptionsStore = useWorkspaceSubscriptionsStore();
const { rows, loading, saving } = storeToRefs(workspaceSubscriptionsStore);
const plansStore = usePlansStore();
const { plans } = storeToRefs(plansStore);

const statusTagType: Record<string, string> = {
  active: 'success',
  trialing: 'success',
  pending: 'warning',
  past_due: 'warning',
  canceled: 'info',
  expired: 'info',
};

function formatDate(date?: string | Date) {
  return date ? new Date(date).toLocaleDateString() : '—';
}

interface PendingSelection {
  planId: string;
  billingCycle: BillingCycle;
}

const editingWorkspaceId = ref<string | null>(null);
const pending = reactive<Record<string, PendingSelection>>({});

function startEditing(row: WorkspaceSubscriptionRow) {
  editingWorkspaceId.value = row.workspace._id;
  pending[row.workspace._id] = {
    planId: row.subscription?.planId?._id || '',
    billingCycle: row.subscription?.billingCycle || 'monthly',
  };
}

function cancelEditing() {
  editingWorkspaceId.value = null;
}

async function confirmSelection(row: WorkspaceSubscriptionRow) {
  const selection = pending[row.workspace._id];
  if (!selection?.planId) {
    ElMessage.warning(t('Please select a plan'));
    return;
  }

  try {
    if (row.subscription) {
      await workspaceSubscriptionsStore.changePlan(
        row.workspace._id,
        row.subscription._id,
        selection.planId,
        selection.billingCycle
      );
    } else {
      await workspaceSubscriptionsStore.attachToPlan(row.workspace._id, selection.planId, selection.billingCycle);
    }
    ElMessage.success(t('Workspace attached to plan'));
    editingWorkspaceId.value = null;
  } catch {
    ElMessage.error(t('Failed to update subscription'));
  }
}

async function detachWorkspace(row: WorkspaceSubscriptionRow) {
  if (!row.subscription) return;

  try {
    await ElMessageBox.confirm(
      t('This will cancel the subscription and detach the workspace from its plan.'),
      t('Detach workspace from plan'),
      { type: 'warning', confirmButtonText: t('Detach'), cancelButtonText: t('Cancel') }
    );
  } catch {
    return;
  }

  try {
    await workspaceSubscriptionsStore.detach(row.subscription._id);
    ElMessage.success(t('Workspace detached from plan'));
  } catch {
    ElMessage.error(t('Failed to detach workspace'));
  }
}
</script>

<template>
  <div class="workspace-subscriptions-page">
    <ListPageTitle
      title="Workspace Subscriptions"
      description="See which pricing plan and subscription each workspace is currently attached to."
    >
      <template #content>
        <PricingTabs active="workspaces" />
      </template>
    </ListPageTitle>

    <div v-loading="loading" class="workspace-subscriptions-content">
      <el-empty v-if="!loading && (!rows || rows.length === 0)" :description="t('No workspaces yet')" />

      <el-table v-else-if="rows.length" :data="rows" stripe row-key="workspace._id" class="workspace-subscriptions-table">
        <el-table-column :label="t('Workspace')" min-width="180">
          <template #default="{ row }">
            <strong>{{ row.workspace.name }}</strong>
          </template>
        </el-table-column>
        <el-table-column :label="t('Plan')" min-width="220">
          <template #default="{ row }">
            <div v-if="editingWorkspaceId === row.workspace._id" class="plan-editor">
              <el-select v-model="pending[row.workspace._id].planId" :placeholder="t('Select a plan')" size="small" style="width: 160px">
                <el-option v-for="plan in plans" :key="plan._id" :label="plan.name" :value="plan._id" />
              </el-select>
              <el-select v-model="pending[row.workspace._id].billingCycle" size="small" style="width: 110px">
                <el-option :label="t('Monthly')" value="monthly" />
                <el-option :label="t('Yearly')" value="yearly" />
              </el-select>
            </div>
            <template v-else>
              <span v-if="row.subscription?.planId?.name">{{ row.subscription.planId.name }}</span>
              <el-tag v-else type="info" size="small" effect="light">{{ t('No plan') }}</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column :label="t('Status')" width="140">
          <template #default="{ row }">
            <el-tag
              v-if="row.subscription"
              :type="statusTagType[row.subscription.status] || 'info'"
              size="small"
              effect="light"
            >
              {{ t(row.subscription.status) }}
            </el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('Billing Cycle')" width="140">
          <template #default="{ row }">
            {{ row.subscription ? t(row.subscription.billingCycle) : '—' }}
          </template>
        </el-table-column>
        <el-table-column :label="t('Current Period')" min-width="220">
          <template #default="{ row }">
            <span v-if="row.subscription">
              {{ formatDate(row.subscription.currentPeriodStart) }} – {{ formatDate(row.subscription.currentPeriodEnd) }}
            </span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('Actions')" width="220" fixed="right">
          <template #default="{ row }">
            <div v-if="editingWorkspaceId === row.workspace._id" class="row-actions">
              <el-button type="primary" size="small" :loading="saving" @click="confirmSelection(row)">
                {{ t('Save') }}
              </el-button>
              <el-button size="small" :disabled="saving" @click="cancelEditing">{{ t('Cancel') }}</el-button>
            </div>
            <div v-else class="row-actions">
              <el-button size="small" @click="startEditing(row)">
                {{ row.subscription ? t('Change Plan') : t('Attach to Plan') }}
              </el-button>
              <el-button v-if="row.subscription" size="small" type="danger" plain @click="detachWorkspace(row)">
                {{ t('Detach') }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.workspace-subscriptions-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.workspace-subscriptions-content {
  flex: 1;
  min-height: 200px;
}

.plan-editor {
  display: flex;
  gap: 8px;
}

.row-actions {
  display: flex;
  gap: 8px;
}
</style>
