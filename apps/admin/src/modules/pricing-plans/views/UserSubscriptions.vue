<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import PricingTabs from '../components/PricingTabs.vue';
import { getUserDisplayName, useUserSubscriptionsStore } from '../store/user-subscriptions';
import { usePlansStore } from '../store/plans';
import { useCouponsStore } from '../store/coupons';

const { t } = useI18n();
const userSubscriptionsStore = useUserSubscriptionsStore();
userSubscriptionsStore.load();
const { rows, loading } = storeToRefs(userSubscriptionsStore);
const { plans } = storeToRefs(usePlansStore());
const { coupons } = storeToRefs(useCouponsStore());

const planNames = computed(() => new Map((plans.value || []).map((plan) => [plan._id, plan.name])));
const couponCodes = computed(() => new Map((coupons.value || []).map((coupon) => [coupon._id, coupon.code])));

const statusTagType: Record<string, string> = {
  active: 'success',
  trialing: 'success',
  pending: 'warning',
  past_due: 'warning',
};

function formatDate(date?: string | Date) {
  return date ? new Date(date).toLocaleDateString() : '—';
}
</script>

<template>
  <div class="user-subscriptions-page">
    <ListPageTitle
      title="User Subscriptions"
      description="See which pricing plan and coupon each user is currently subscribed with. Attach a user to a plan from the user's page."
    >
      <template #content>
        <PricingTabs active="users" />
      </template>
    </ListPageTitle>

    <div v-loading="loading" class="user-subscriptions-content">
      <el-empty v-if="!loading && (!rows || rows.length === 0)" :description="t('No users are attached to a plan yet')" />

      <el-table v-else-if="rows.length" :data="rows" stripe row-key="user._id">
        <el-table-column :label="t('User')" min-width="200">
          <template #default="{ row }">
            <router-link :to="{ name: 'editUser', params: { userId: row.user._id } }">
              <strong>{{ getUserDisplayName(row.user) }}</strong>
            </router-link>
          </template>
        </el-table-column>
        <el-table-column :label="t('Plan')" min-width="160">
          <template #default="{ row }">{{ planNames.get(row.subscription.planId) || '—' }}</template>
        </el-table-column>
        <el-table-column :label="t('Status')" width="140">
          <template #default="{ row }">
            <el-tag :type="statusTagType[row.subscription.status] || 'info'" size="small" effect="light">
              {{ t(row.subscription.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('Billing Cycle')" width="140">
          <template #default="{ row }">{{ t(row.subscription.billingCycle) }}</template>
        </el-table-column>
        <el-table-column :label="t('Coupon')" width="160">
          <template #default="{ row }">
            <el-tag v-if="couponCodes.get(row.subscription.couponId)" size="small" effect="plain" type="warning">
              {{ couponCodes.get(row.subscription.couponId) }}
            </el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('Current Period')" min-width="220">
          <template #default="{ row }">
            {{ formatDate(row.subscription.currentPeriodStart) }} – {{ formatDate(row.subscription.currentPeriodEnd) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('Actions')" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push({ name: 'editUser', params: { userId: row.user._id } })">
              {{ t('Manage') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.user-subscriptions-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.user-subscriptions-content {
  flex: 1;
  min-height: 200px;
}
</style>
