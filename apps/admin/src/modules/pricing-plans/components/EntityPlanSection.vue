<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import type { BillableEntityType, BillingCycle, ICoupon, IPlan, ISubscription } from '@qelos/global-types';
import plansService from '@/services/apis/plans-service';
import couponsService from '@/services/apis/coupons-service';
import subscriptionsService from '@/services/apis/subscriptions-service';

/**
 * Lets an admin attach a billable entity (workspace or user) to a pricing plan,
 * and set or remove a coupon on its current subscription.
 */
const props = defineProps<{
  billableEntityType: BillableEntityType;
  billableEntityId: string;
}>();

const { t } = useI18n();

const plans = ref<IPlan[]>([]);
const coupons = ref<ICoupon[]>([]);
const currentSubscription = ref<ISubscription | null>(null);
const loading = ref(false);
const saving = ref(false);

const selectedPlanId = ref('');
const selectedBillingCycle = ref<BillingCycle>('monthly');
const selectedCouponCode = ref('');

const currentPlan = computed(() => plans.value.find((plan) => plan._id === currentSubscription.value?.planId));
const currentCoupon = computed(() => coupons.value.find((coupon) => coupon._id === currentSubscription.value?.couponId));

const availableCoupons = computed(() => coupons.value.filter((coupon) =>
  coupon.isActive && (!coupon.applicablePlanIds?.length || coupon.applicablePlanIds.includes(selectedPlanId.value))
));

function couponLabel(coupon: ICoupon) {
  const discount = coupon.discountType === 'percentage'
    ? `${coupon.discountValue}%`
    : `${coupon.discountValue} ${coupon.currency || ''}`.trim();
  return `${coupon.code} (-${discount})`;
}

watch(selectedPlanId, () => {
  if (selectedCouponCode.value && !availableCoupons.value.some((coupon) => coupon.code === selectedCouponCode.value)) {
    selectedCouponCode.value = '';
  }
});

async function loadSubscription() {
  const subscriptions = await subscriptionsService.list({
    billableEntityType: props.billableEntityType,
    billableEntityId: props.billableEntityId,
  });
  // newest first; canceled / expired subscriptions no longer attach the entity to a plan
  const subscription = subscriptions.find((item) => !['canceled', 'expired'].includes(item.status));
  currentSubscription.value = subscription || null;
  selectedPlanId.value = subscription?.planId || '';
  selectedBillingCycle.value = subscription?.billingCycle || 'monthly';
}

async function load() {
  loading.value = true;
  try {
    const [loadedPlans, loadedCoupons] = await Promise.all([
      plansService.getAll(),
      couponsService.getAll(),
      loadSubscription(),
    ]);
    plans.value = loadedPlans;
    coupons.value = loadedCoupons;
  } catch {
    ElMessage.error(t('Failed to load the pricing plan'));
  } finally {
    loading.value = false;
  }
}

watch(() => props.billableEntityId, load, { immediate: true });

function errorMessage(e: any, fallback: string) {
  return e?.response?.data?.message || t(fallback);
}

async function run(action: () => Promise<unknown>, success: string, failure: string) {
  saving.value = true;
  try {
    await action();
    ElMessage.success(t(success));
    selectedCouponCode.value = '';
    await loadSubscription();
  } catch (e) {
    ElMessage.error(errorMessage(e, failure));
  } finally {
    saving.value = false;
  }
}

async function savePlan() {
  if (!selectedPlanId.value) {
    ElMessage.warning(t('Please select a plan'));
    return;
  }

  const previousSubscriptionId = currentSubscription.value?._id;
  await run(async () => {
    await subscriptionsService.create({
      planId: selectedPlanId.value,
      billingCycle: selectedBillingCycle.value,
      billableEntityType: props.billableEntityType,
      billableEntityId: props.billableEntityId,
      status: 'active',
      couponCode: selectedCouponCode.value || undefined,
    });
    // cancel the old subscription only after the new one (and its coupon) was accepted
    if (previousSubscriptionId) {
      await subscriptionsService.cancel(previousSubscriptionId);
    }
  }, 'Attached to plan', 'Failed to update the plan');
}

const applyCoupon = () => run(
  () => subscriptionsService.setCoupon(currentSubscription.value!._id, selectedCouponCode.value),
  'Coupon applied', 'Failed to update the coupon',
);

const removeCoupon = () => run(
  () => subscriptionsService.setCoupon(currentSubscription.value!._id, null),
  'Coupon removed', 'Failed to update the coupon',
);

const detach = () => run(
  () => subscriptionsService.cancel(currentSubscription.value!._id),
  'Detached from plan', 'Failed to detach from the plan',
);
</script>

<template>
  <div class="container entity-plan-section">
    <div class="section-header">
      <h3>{{ t('Pricing Plan') }}</h3>
    </div>

    <div v-loading="loading" class="plan-content">
      <div class="current-plan-row">
        <span v-if="currentSubscription && currentPlan" class="current-plan-info">
          <strong>{{ currentPlan.name }}</strong>
          <el-tag size="small" effect="light" :type="currentSubscription.status === 'active' ? 'success' : 'info'">
            {{ t(currentSubscription.status) }}
          </el-tag>
          <span class="billing-cycle-label">{{ t(currentSubscription.billingCycle) }}</span>
          <el-tag v-if="currentCoupon" size="small" effect="plain" type="warning">
            {{ t('Coupon') }}: {{ currentCoupon.code }}
          </el-tag>
        </span>
        <el-tag v-else type="info" size="small" effect="light">{{ t('No plan attached') }}</el-tag>
      </div>

      <div class="plan-picker-row">
        <el-select v-model="selectedPlanId" filterable :placeholder="t('Select a plan')">
          <el-option v-for="plan in plans" :key="plan._id" :label="plan.name" :value="plan._id" />
        </el-select>
        <el-select v-model="selectedBillingCycle">
          <el-option :label="t('Monthly')" value="monthly" />
          <el-option :label="t('Yearly')" value="yearly" />
        </el-select>
        <el-select v-model="selectedCouponCode" filterable clearable :placeholder="t('Coupon (optional)')">
          <el-option v-for="coupon in availableCoupons" :key="coupon._id" :label="couponLabel(coupon)" :value="coupon.code" />
        </el-select>
      </div>

      <div class="plan-actions-row">
        <el-button type="primary" plain :loading="saving" @click="savePlan">
          {{ currentSubscription ? t('Change Plan') : t('Attach to Plan') }}
        </el-button>
        <el-button v-if="currentSubscription" plain :disabled="!selectedCouponCode" :loading="saving" @click="applyCoupon">
          {{ t('Apply Coupon') }}
        </el-button>
        <el-button v-if="currentCoupon" plain :loading="saving" @click="removeCoupon">
          {{ t('Remove Coupon') }}
        </el-button>
        <el-button v-if="currentSubscription" type="danger" plain :loading="saving" @click="detach">
          {{ t('Detach') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entity-plan-section {
  margin-block-end: 20px;
}

.section-header {
  margin-block-end: 10px;
}

.plan-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.current-plan-row,
.current-plan-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.billing-cycle-label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.plan-picker-row,
.plan-actions-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.plan-picker-row .el-select {
  flex: 1 1 180px;
}
</style>
