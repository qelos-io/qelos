<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessageBox, ElMessage } from 'element-plus';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import PlanCard from '../components/PlanCard.vue';
import { usePlansStore } from '../store/plans';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const router = useRouter();
const plansStore = usePlansStore();
const { plans, loading } = storeToRefs(plansStore);

const sortedPlans = computed(() =>
  [...(plans.value || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
);

function editPlan(plan) {
  router.push({ name: 'editPlan', params: { planId: plan._id } });
}

async function toggleActive(plan) {
  try {
    await plansStore.update(plan._id, { isActive: !plan.isActive });
    ElMessage.success(t(plan.isActive ? 'Plan deactivated' : 'Plan activated'));
  } catch {
    ElMessage.error(t('Failed to update plan'));
  }
}

async function removePlan(plan) {
  try {
    await ElMessageBox.confirm(
      t('Are you sure you want to delete the plan "{name}"?', { name: plan.name }),
      t('Delete Plan'),
      { confirmButtonText: t('Delete'), cancelButtonText: t('Cancel'), type: 'warning' }
    );
    await plansStore.remove(plan._id);
    ElMessage.success(t('Plan deleted'));
  } catch {
    // cancelled
  }
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}
</script>

<template>
  <div class="pricing-plans-page">
    <ListPageTitle
      title="Pricing Plans"
      description="Configure pricing plans for your application. Plans define the features and pricing tiers available to your users."
      create-route="createPlan"
      create-text="Create Plan"
    >
      <template #content>
        <div class="tab-links">
          <router-link :to="{ name: 'pricing-plans' }" class="tab-link active">
            <font-awesome-icon :icon="['fas', 'tags']" />
            {{ t('Plans') }}
          </router-link>
          <router-link :to="{ name: 'coupons' }" class="tab-link">
            <font-awesome-icon :icon="['fas', 'ticket']" />
            {{ t('Coupons') }}
          </router-link>
          <router-link :to="{ name: 'paymentsConfiguration' }" class="tab-link">
            <font-awesome-icon :icon="['fas', 'gear']" />
            {{ t('Configuration') }}
          </router-link>
        </div>
      </template>
    </ListPageTitle>

    <div v-loading="loading" class="plans-content">
      <el-empty
        v-if="!loading && (!plans || plans.length === 0)"
        :description="t('No pricing plans yet')"
      >
        <el-button type="primary" @click="router.push({ name: 'createPlan' })">
          <font-awesome-icon :icon="['fas', 'plus']" class="icon-left" />
          {{ t('Create your first plan') }}
        </el-button>
      </el-empty>

      <el-table
        v-else-if="sortedPlans.length"
        :data="sortedPlans"
        stripe
        class="plans-table"
      >
        <el-table-column prop="sortOrder" :label="t('Order')" width="80" sortable />
        <el-table-column prop="name" :label="t('Name')" min-width="160">
          <template #default="{ row }">
            <div class="plan-name-cell">
              <strong>{{ row.name }}</strong>
              <span v-if="row.description" class="plan-description">{{ row.description }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('Monthly Price')" width="140" sortable sort-by="monthlyPrice">
          <template #default="{ row }">
            {{ formatPrice(row.monthlyPrice, row.currency) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('Yearly Price')" width="140" sortable sort-by="yearlyPrice">
          <template #default="{ row }">
            {{ formatPrice(row.yearlyPrice, row.currency) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('Features')" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="f in (row.features || []).slice(0, 3)" :key="f" size="small" class="feature-tag">
              {{ f }}
            </el-tag>
            <el-tag v-if="row.features?.length > 3" size="small" type="info">
              +{{ row.features.length - 3 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('Status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small" effect="light">
              {{ row.isActive ? t('Active') : t('Inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('Actions')" width="180" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="editPlan(row)" :title="t('Edit')">
                <font-awesome-icon :icon="['fas', 'edit']" />
              </el-button>
              <el-button size="small" @click="toggleActive(row)" :title="row.isActive ? t('Deactivate') : t('Activate')">
                <font-awesome-icon :icon="['fas', row.isActive ? 'eye-slash' : 'eye']" />
              </el-button>
              <el-button size="small" type="danger" @click="removePlan(row)" :title="t('Delete')">
                <font-awesome-icon :icon="['fas', 'trash']" />
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.pricing-plans-page {
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

.plans-content {
  flex: 1;
  min-height: 200px;
}

.plan-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.plan-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
}

.feature-tag {
  margin-inline-end: 4px;
  margin-block-end: 2px;
}

.icon-left {
  margin-inline-end: 4px;
}
</style>
