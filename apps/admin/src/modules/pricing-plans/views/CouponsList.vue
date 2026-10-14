<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import { MoreFilled, Plus } from '@element-plus/icons-vue';
import type { ICoupon } from '@qelos/global-types';
import PricingHeader from '../components/PricingHeader.vue';
import { useCouponsStore } from '../store/coupons';
import { usePlansStore } from '../store/plans';
import { getCouponStatus, getRedemptionProgress, type CouponStatus } from '../services/pricing-overview';
import { couponDiscountLabel, formatDate } from '../services/pricing';
import { formatValidity } from '../services/pricing-overview';

const { t } = useI18n();
const router = useRouter();
const couponsStore = useCouponsStore();
const { coupons, loading } = storeToRefs(couponsStore);
const { plans } = storeToRefs(usePlansStore());

const filter = ref<'all' | CouponStatus>('all');
const withStatus = computed(() => (coupons.value || []).map((coupon) => ({ coupon, status: getCouponStatus(coupon) })));
const visible = computed(() => withStatus.value.filter((row) => filter.value === 'all' || row.status === filter.value));
const countOf = (status: 'all' | CouponStatus) => (status === 'all' ? withStatus.value.length : withStatus.value.filter((row) => row.status === status).length);

const STATUS_LABEL = computed<Record<CouponStatus, string>>(() => ({
  active: t('Active'),
  scheduled: t('Scheduled'),
  expired: t('Expired'),
  exhausted: t('Used up'),
  inactive: t('Inactive'),
}));
const TONE: Record<CouponStatus, string> = { active: 'success', scheduled: 'warning', expired: 'info', exhausted: 'warning', inactive: 'info' };
const chips = computed(() => (['all', 'active', 'scheduled', 'expired', 'exhausted', 'inactive'] as const).filter((id) => id === 'all' || countOf(id)));

const planName = (id: string) => (plans.value || []).find((plan) => plan._id === id)?.name || id;
const appliesTo = (coupon: ICoupon) => (coupon.applicablePlanIds?.length ? coupon.applicablePlanIds.map(planName).join(', ') : t('All plans'));
const validity = (coupon: ICoupon) =>
  formatValidity(coupon, {
    from: (date) => `${t('From')} ${formatDate(date)}`,
    until: (date) => `${t('Until')} ${formatDate(date)}`,
    range: (a, b) => `${formatDate(a)} – ${formatDate(b)}`,
    always: t('Always'),
  });
const edit = (coupon: ICoupon) => router.push({ name: 'editCoupon', params: { couponId: coupon._id } });

async function toggleActive(coupon: ICoupon) {
  try {
    await couponsStore.update(coupon._id as string, { isActive: !coupon.isActive });
    ElMessage.success(t(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated'));
  } catch {
    ElMessage.error(t('Failed to update coupon'));
  }
}

async function remove(coupon: ICoupon) {
  try {
    await ElMessageBox.confirm(t('Are you sure you want to delete coupon "{code}"?', { code: coupon.code }), t('Delete Coupon'), {
      confirmButtonText: t('Delete'),
      cancelButtonText: t('Cancel'),
      type: 'warning',
    });
    await couponsStore.remove(coupon._id as string);
    ElMessage.success(t('Coupon deleted'));
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="pricing-page">
    <PricingHeader active="coupons" :subtitle="$t('Discounts you can hand out, and how far each one has gone.')">
      <template #actions>
        <el-button type="primary" @click="router.push({ name: 'createCoupon' })">
          <el-icon><Plus /></el-icon>
          <span class="action-label">{{ $t('Create Coupon') }}</span>
        </el-button>
      </template>
    </PricingHeader>

    <div v-if="coupons?.length" class="chips" role="group" :aria-label="$t('Status')">
      <button v-for="id in chips" :key="id" type="button" class="chip" :class="{ active: filter === id }" :aria-pressed="filter === id" @click="filter = id">
        {{ id === 'all' ? $t('All') : STATUS_LABEL[id] }}
        <span class="chip-count">{{ countOf(id) }}</span>
      </button>
    </div>

    <el-skeleton v-if="loading && !coupons?.length" :rows="5" animated />

    <el-empty v-else-if="!coupons?.length" :description="$t('No coupons yet')">
      <el-button type="primary" @click="router.push({ name: 'createCoupon' })">{{ $t('Create your first coupon') }}</el-button>
    </el-empty>

    <el-table v-else :data="visible" row-key="coupon._id" class="table" @row-click="(row) => edit(row.coupon)">
      <el-table-column :label="$t('Code')" min-width="150">
        <template #default="{ row }"><code class="code">{{ row.coupon.code }}</code></template>
      </el-table-column>
      <el-table-column :label="$t('Discount')" width="110">
        <template #default="{ row }"><strong>{{ couponDiscountLabel(row.coupon) }}</strong></template>
      </el-table-column>
      <el-table-column :label="$t('Status')" width="120">
        <template #default="{ row }"><el-tag :type="TONE[row.status]" size="small" effect="light">{{ STATUS_LABEL[row.status] }}</el-tag></template>
      </el-table-column>
      <el-table-column :label="$t('Redemptions')" min-width="170">
        <template #default="{ row }">
          <div class="redemptions">
            <span class="r-count">{{ row.coupon.currentRedemptions }}<template v-if="row.coupon.maxRedemptions != null"> / {{ row.coupon.maxRedemptions }}</template><template v-else> · {{ $t('unlimited') }}</template></span>
            <el-progress v-if="getRedemptionProgress(row.coupon) !== null" :percentage="getRedemptionProgress(row.coupon) as number" :show-text="false" :stroke-width="6" :status="row.status === 'exhausted' ? 'warning' : undefined" />
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="$t('Valid')" min-width="170" class-name="hide-mobile">
        <template #default="{ row }">{{ validity(row.coupon) }}</template>
      </el-table-column>
      <el-table-column :label="$t('Applies to')" min-width="160" class-name="hide-mobile">
        <template #default="{ row }"><span class="applies">{{ appliesTo(row.coupon) }}</span></template>
      </el-table-column>
      <el-table-column width="64" align="end">
        <template #default="{ row }">
          <el-dropdown trigger="click" @command="(c) => (c === 'edit' ? edit(row.coupon) : c === 'toggle' ? toggleActive(row.coupon) : remove(row.coupon))">
            <el-button text circle :aria-label="`${$t('Actions')}: ${row.coupon.code}`" @click.stop><el-icon><MoreFilled /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">{{ $t('Edit') }}</el-dropdown-item>
                <el-dropdown-item command="toggle">{{ row.coupon.isActive ? $t('Deactivate') : $t('Activate') }}</el-dropdown-item>
                <el-dropdown-item command="delete" divided class="danger-item">{{ $t('Delete') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped lang="scss">
.pricing-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.action-label {
  margin-inline-start: 6px;
}

.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  min-block-size: 34px;
  padding-inline: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 17px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

.chip-count {
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.table {
  inline-size: 100%;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  overflow: hidden;

  :deep(.el-table__row) {
    cursor: pointer;
  }
}

.code {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--el-fill-color);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
}

.redemptions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.applies {
  color: var(--el-text-color-regular);
}

:deep(.danger-item) {
  color: var(--el-color-danger);
}

@media (max-width: 768px) {
  .pricing-page {
    padding: 12px;
  }

  .action-label {
    display: none;
  }

  :deep(.hide-mobile) {
    display: none;
  }
}
</style>
