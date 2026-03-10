<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessageBox, ElMessage } from 'element-plus';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import { useCouponsStore } from '../store/coupons';
import { usePlansStore } from '../store/plans';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const { t } = useI18n();
const router = useRouter();
const couponsStore = useCouponsStore();
const plansStore = usePlansStore();
const { coupons, loading } = storeToRefs(couponsStore);
const { plans } = storeToRefs(plansStore);

const plansMap = computed(() => {
  const map: Record<string, string> = {};
  for (const p of plans.value || []) {
    if (p._id) map[p._id] = p.name;
  }
  return map;
});

function editCoupon(coupon) {
  router.push({ name: 'editCoupon', params: { couponId: coupon._id } });
}

async function toggleActive(coupon) {
  try {
    await couponsStore.update(coupon._id, { isActive: !coupon.isActive });
    ElMessage.success(t(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated'));
  } catch {
    ElMessage.error(t('Failed to update coupon'));
  }
}

async function removeCoupon(coupon) {
  try {
    await ElMessageBox.confirm(
      t('Are you sure you want to delete coupon "{code}"?', { code: coupon.code }),
      t('Delete Coupon'),
      { confirmButtonText: t('Delete'), cancelButtonText: t('Cancel'), type: 'warning' }
    );
    await couponsStore.remove(coupon._id);
    ElMessage.success(t('Coupon deleted'));
  } catch {
    // cancelled
  }
}

function formatDiscount(coupon) {
  if (coupon.discountType === 'percentage') {
    return `${coupon.discountValue}%`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: coupon.currency || 'USD',
  }).format(coupon.discountValue);
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString();
}
</script>

<template>
  <div class="coupons-page">
    <ListPageTitle
      title="Coupons"
      description="Manage discount coupons for your pricing plans."
      create-route="createCoupon"
      create-text="Create Coupon"
    >
      <template #content>
        <div class="tab-links">
          <router-link :to="{ name: 'pricing-plans' }" class="tab-link">
            <font-awesome-icon :icon="['fas', 'tags']" />
            {{ t('Plans') }}
          </router-link>
          <router-link :to="{ name: 'coupons' }" class="tab-link active">
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

    <div v-loading="loading" class="coupons-content">
      <el-empty
        v-if="!loading && (!coupons || coupons.length === 0)"
        :description="t('No coupons yet')"
      >
        <el-button type="primary" @click="router.push({ name: 'createCoupon' })">
          <font-awesome-icon :icon="['fas', 'plus']" class="icon-left" />
          {{ t('Create your first coupon') }}
        </el-button>
      </el-empty>

      <el-table v-else-if="coupons?.length" :data="coupons" stripe>
        <el-table-column prop="code" :label="t('Code')" width="160">
          <template #default="{ row }">
            <code class="coupon-code">{{ row.code }}</code>
          </template>
        </el-table-column>
        <el-table-column :label="t('Discount')" width="140">
          <template #default="{ row }">
            <el-tag :type="row.discountType === 'percentage' ? 'warning' : 'success'" size="small" effect="light">
              {{ formatDiscount(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('Redemptions')" width="140">
          <template #default="{ row }">
            {{ row.currentRedemptions }} / {{ row.maxRedemptions ?? '∞' }}
          </template>
        </el-table-column>
        <el-table-column :label="t('Valid From')" width="120">
          <template #default="{ row }">{{ formatDate(row.validFrom) }}</template>
        </el-table-column>
        <el-table-column :label="t('Valid Until')" width="120">
          <template #default="{ row }">{{ formatDate(row.validUntil) }}</template>
        </el-table-column>
        <el-table-column :label="t('Applicable Plans')" min-width="180">
          <template #default="{ row }">
            <template v-if="row.applicablePlanIds?.length">
              <el-tag
                v-for="pid in row.applicablePlanIds"
                :key="pid"
                size="small"
                class="plan-tag"
              >
                {{ plansMap[pid] || pid }}
              </el-tag>
            </template>
            <span v-else class="all-plans">{{ t('All plans') }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('Status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small" effect="light">
              {{ row.isActive ? t('Active') : t('Inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('Actions')" width="160" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="editCoupon(row)" :title="t('Edit')">
                <font-awesome-icon :icon="['fas', 'edit']" />
              </el-button>
              <el-button size="small" @click="toggleActive(row)" :title="row.isActive ? t('Deactivate') : t('Activate')">
                <font-awesome-icon :icon="['fas', row.isActive ? 'eye-slash' : 'eye']" />
              </el-button>
              <el-button size="small" type="danger" @click="removeCoupon(row)" :title="t('Delete')">
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
.coupons-page {
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

.coupons-content {
  flex: 1;
  min-height: 200px;
}

.coupon-code {
  background: var(--el-fill-color);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.plan-tag {
  margin-inline-end: 4px;
  margin-block-end: 2px;
}

.all-plans {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  font-style: italic;
}

.icon-left {
  margin-inline-end: 4px;
}
</style>
