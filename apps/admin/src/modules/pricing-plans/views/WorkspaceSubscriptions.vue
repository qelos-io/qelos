<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import { useWorkspaceSubscriptionsStore } from '../store/workspace-subscriptions';

const { t } = useI18n();
const workspaceSubscriptionsStore = useWorkspaceSubscriptionsStore();
const { rows, loading } = storeToRefs(workspaceSubscriptionsStore);

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
</script>

<template>
  <div class="workspace-subscriptions-page">
    <ListPageTitle
      title="Workspace Subscriptions"
      description="See which pricing plan and subscription each workspace is currently attached to."
    >
      <template #content>
        <div class="tab-links">
          <router-link :to="{ name: 'pricing-plans' }" class="tab-link">
            <font-awesome-icon :icon="['fas', 'tags']" />
            {{ t('Plans') }}
          </router-link>
          <router-link :to="{ name: 'coupons' }" class="tab-link">
            <font-awesome-icon :icon="['fas', 'ticket']" />
            {{ t('Coupons') }}
          </router-link>
          <router-link :to="{ name: 'workspace-subscriptions' }" class="tab-link active">
            <font-awesome-icon :icon="['fas', 'building']" />
            {{ t('Workspaces') }}
          </router-link>
          <router-link :to="{ name: 'paymentsConfiguration' }" class="tab-link">
            <font-awesome-icon :icon="['fas', 'gear']" />
            {{ t('Configuration') }}
          </router-link>
        </div>
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
        <el-table-column :label="t('Plan')" min-width="160">
          <template #default="{ row }">
            <span v-if="row.subscription?.planId?.name">{{ row.subscription.planId.name }}</span>
            <el-tag v-else type="info" size="small" effect="light">{{ t('No plan') }}</el-tag>
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

.tab-links {
  display: flex;
  gap: 8px;
}

.tab-link {
  padding: 6px 14px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--el-text-color-regular);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.tab-link:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.tab-link.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.workspace-subscriptions-content {
  flex: 1;
  min-height: 200px;
}
</style>
