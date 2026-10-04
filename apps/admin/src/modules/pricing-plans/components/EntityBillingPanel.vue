<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { BillableEntityType, BillingCycle, ICoupon, IPlan, ISubscription } from '@qelos/global-types';
import subscriptionsService from '@/services/apis/subscriptions-service';
import InvoiceHistory from '@/modules/billing/components/InvoiceHistory.vue';
import { usePlansStore } from '../store/plans';
import { useCouponsStore } from '../store/coupons';
import { useEntitySubscriptions } from '../compositions/entity-subscriptions';
import {
  couponDiscountLabel, discountedPrice, formatDate, formatMoney, planPrice, subscriptionStatusTagType,
} from '../services/pricing';

/**
 * Billing of one account (workspace or user): current plan, plan changes, coupons,
 * subscription history and invoices. Admin only.
 */
const props = defineProps<{
  billableEntityType: BillableEntityType;
  billableEntityId: string;
}>();

const emit = defineEmits<{ (e: 'changed'): void }>();

const { t } = useI18n();
const { plans } = storeToRefs(usePlansStore());
const { coupons } = storeToRefs(useCouponsStore());
const { subscriptions, current, loading, error, reload } = useEntitySubscriptions(
  props.billableEntityType, toRef(props, 'billableEntityId'),
);

const saving = ref(false);

const currentPlan = computed(() => plans.value?.find((plan) => plan._id === current.value?.planId));
const currentCoupon = computed(() => coupons.value?.find((coupon) => coupon._id === current.value?.couponId));

const planName = (id: string) => plans.value?.find((plan) => plan._id === id)?.name || '—';
const couponCode = (id?: string) => coupons.value?.find((coupon) => coupon._id === id)?.code;

const currentPrice = computed(() => {
  if (!current.value || !currentPlan.value) return '';
  if (currentPlan.value.dynamic) return current.value.dynamicAmount != null
    ? formatMoney(current.value.dynamicAmount, currentPlan.value.currency) : '';
  return formatMoney(planPrice(currentPlan.value, current.value.billingCycle), currentPlan.value.currency);
});

function usableCoupons(planId: string | undefined, excludeId?: string) {
  return (coupons.value || []).filter((coupon) =>
    coupon.isActive
    && coupon._id !== excludeId
    && (!coupon.applicablePlanIds?.length || (!!planId && coupon.applicablePlanIds.includes(planId)))
  );
}

function couponLabel(coupon: ICoupon) {
  return `${coupon.code} (-${couponDiscountLabel(coupon)})`;
}

async function run(action: () => Promise<unknown>, success: string, failure: string) {
  saving.value = true;
  try {
    await action();
    ElMessage.success(t(success));
    await reload();
    emit('changed');
    return true;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || t(failure));
    return false;
  } finally {
    saving.value = false;
  }
}

// ---- coupon on the current subscription ----
const inlineCouponCode = ref('');
const inlineCoupons = computed(() => usableCoupons(current.value?.planId, current.value?.couponId));

async function applyCoupon() {
  if (await run(
    () => subscriptionsService.setCoupon(current.value!._id!, inlineCouponCode.value),
    'Coupon applied', 'Failed to update the coupon',
  )) inlineCouponCode.value = '';
}

const removeCoupon = () => run(
  () => subscriptionsService.setCoupon(current.value!._id!, null),
  'Coupon removed', 'Failed to update the coupon',
);

// ---- dynamic amount ----
const amountDraft = ref<number | null>(null);
const amountEditing = ref(false);

function startAmountEdit() {
  amountDraft.value = current.value?.dynamicAmount ?? null;
  amountEditing.value = true;
}

async function saveAmount() {
  if (!amountDraft.value || amountDraft.value <= 0) {
    ElMessage.warning(t('Enter an amount greater than zero'));
    return;
  }
  if (await run(
    () => subscriptionsService.setDynamicAmount(current.value!._id!, amountDraft.value!),
    'Amount updated', 'Failed to update the amount',
  )) amountEditing.value = false;
}

// ---- attach / change plan drawer ----
const drawerOpen = ref(false);
const selectedPlanId = ref('');
const selectedCycle = ref<BillingCycle>('monthly');
const selectedCouponCode = ref('');
const selectedAmount = ref<number | null>(null);

const selectedPlan = computed<IPlan | undefined>(() => plans.value?.find((plan) => plan._id === selectedPlanId.value));
const drawerCoupons = computed(() => usableCoupons(selectedPlanId.value));
const selectedCoupon = computed(() => drawerCoupons.value.find((coupon) => coupon.code === selectedCouponCode.value));

const sortedPlans = computed(() =>
  [...(plans.value || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
);

const basePrice = computed(() => {
  const plan = selectedPlan.value;
  if (!plan) return 0;
  return plan.dynamic ? selectedAmount.value || 0 : planPrice(plan, selectedCycle.value);
});

const finalPrice = computed(() =>
  selectedCoupon.value ? discountedPrice(basePrice.value, selectedCoupon.value) : basePrice.value
);

function benefitLabel(coupon: ICoupon) {
  if (!coupon.benefitDurationUnit || !coupon.benefitDurationValue) return t('for the life of the subscription');
  return t('for {count} {unit}', { count: coupon.benefitDurationValue, unit: t(coupon.benefitDurationUnit) });
}

function openDrawer() {
  selectedPlanId.value = current.value?.planId || '';
  selectedCycle.value = current.value?.billingCycle || 'monthly';
  selectedCouponCode.value = '';
  selectedAmount.value = current.value?.dynamicAmount ?? null;
  drawerOpen.value = true;
}

function selectPlan(plan: IPlan) {
  selectedPlanId.value = plan._id!;
  if (selectedCouponCode.value && !drawerCoupons.value.some((coupon) => coupon.code === selectedCouponCode.value)) {
    selectedCouponCode.value = '';
  }
}

async function confirmPlan() {
  if (!selectedPlan.value) {
    ElMessage.warning(t('Please select a plan'));
    return;
  }
  if (selectedPlan.value.dynamic && !selectedAmount.value) {
    ElMessage.warning(t('Enter an amount greater than zero'));
    return;
  }

  const previousId = current.value?._id;
  const ok = await run(async () => {
    await subscriptionsService.create({
      planId: selectedPlanId.value,
      billingCycle: selectedCycle.value,
      billableEntityType: props.billableEntityType,
      billableEntityId: props.billableEntityId,
      status: 'active',
      couponCode: selectedCouponCode.value || undefined,
      dynamicAmount: selectedPlan.value!.dynamic ? selectedAmount.value! : undefined,
    });
    // cancel the old subscription only after the new one (and its coupon) was accepted
    if (previousId) await subscriptionsService.cancel(previousId);
  }, current.value ? 'Plan changed' : 'Attached to plan', 'Failed to update the plan');
  if (ok) drawerOpen.value = false;
}

async function detach() {
  try {
    await ElMessageBox.confirm(
      t('This cancels the current subscription. The account will no longer be attached to a plan.'),
      t('Detach from plan'),
      { type: 'warning', confirmButtonText: t('Detach'), cancelButtonText: t('Cancel') },
    );
  } catch {
    return;
  }
  await run(() => subscriptionsService.cancel(current.value!._id!), 'Detached from plan', 'Failed to detach from the plan');
}

defineExpose({ reload });
</script>

<template>
  <div class="billing-panel" v-loading="loading && !subscriptions.length">
    <el-alert v-if="error" type="error" show-icon :closable="false" :title="t('Failed to load the pricing plan')">
      <el-button size="small" @click="reload">{{ t('Retry') }}</el-button>
    </el-alert>

    <!-- current plan -->
    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="card-title">
          <span>{{ t('Current Plan') }}</span>
          <el-button type="primary" plain size="small" @click="openDrawer">
            {{ current ? t('Change Plan') : t('Attach to Plan') }}
          </el-button>
        </div>
      </template>

      <el-empty v-if="!current" :image-size="70" :description="t('No plan attached')">
        <el-button type="primary" @click="openDrawer">{{ t('Attach to Plan') }}</el-button>
      </el-empty>

      <template v-else>
        <div class="plan-headline">
          <strong class="plan-name">{{ currentPlan?.name || '—' }}</strong>
          <el-tag :type="subscriptionStatusTagType[current.status] || 'info'" effect="light" size="small">
            {{ t(current.status) }}
          </el-tag>
          <el-tag v-if="currentPlan && !currentPlan.isActive" type="info" effect="plain" size="small">
            {{ t('Inactive plan') }}
          </el-tag>
        </div>

        <el-descriptions :column="2" size="small" class="plan-details">
          <el-descriptions-item :label="t('Price')">
            {{ currentPrice || '—' }}
            <span v-if="currentPrice && !currentPlan?.dynamic" class="muted">/ {{ t(current.billingCycle) }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="t('Billing Cycle')">{{ t(current.billingCycle) }}</el-descriptions-item>
          <el-descriptions-item :label="t('Current Period')">
            {{ formatDate(current.currentPeriodStart) }} – {{ formatDate(current.currentPeriodEnd) }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('Payment provider')">{{ current.providerKind || t('Manual') }}</el-descriptions-item>
          <el-descriptions-item v-if="currentPlan?.dynamic" :label="t('Amount')">
            <template v-if="amountEditing">
              <el-input-number v-model="amountDraft" :min="0" :precision="2" size="small" controls-position="right" />
              <el-button size="small" type="primary" :loading="saving" @click="saveAmount">{{ t('Save') }}</el-button>
              <el-button size="small" @click="amountEditing = false">{{ t('Cancel') }}</el-button>
            </template>
            <template v-else>
              {{ current.dynamicAmount != null ? formatMoney(current.dynamicAmount, currentPlan.currency) : t('Not set') }}
              <el-button link type="primary" size="small" @click="startAmountEdit">{{ t('Edit') }}</el-button>
            </template>
          </el-descriptions-item>
        </el-descriptions>

        <!-- coupon -->
        <div class="coupon-block">
          <div class="block-label">{{ t('Coupon') }}</div>
          <div v-if="currentCoupon" class="coupon-current">
            <el-tag type="warning" effect="plain">{{ currentCoupon.code }}</el-tag>
            <span class="muted">
              -{{ couponDiscountLabel(currentCoupon) }}
              <template v-if="current.couponBenefitEndsAt">
                · {{ t('benefit ends {date}', { date: formatDate(current.couponBenefitEndsAt) }) }}
              </template>
              <template v-else>· {{ t('for the life of the subscription') }}</template>
            </span>
            <el-button size="small" plain :loading="saving" @click="removeCoupon">{{ t('Remove Coupon') }}</el-button>
          </div>
          <div class="coupon-apply">
            <el-select v-model="inlineCouponCode" filterable clearable :placeholder="currentCoupon ? t('Replace with another coupon') : t('Select a coupon')">
              <el-option v-for="coupon in inlineCoupons" :key="coupon._id" :label="couponLabel(coupon)" :value="coupon.code" />
              <template #empty>{{ t('No applicable coupons') }}</template>
            </el-select>
            <el-button :disabled="!inlineCouponCode" :loading="saving" @click="applyCoupon">{{ t('Apply Coupon') }}</el-button>
          </div>
        </div>

        <div class="danger-row">
          <el-button type="danger" plain size="small" :loading="saving" @click="detach">{{ t('Detach') }}</el-button>
        </div>
      </template>
    </el-card>

    <!-- history -->
    <el-card v-if="subscriptions.length" shadow="never" class="panel-card">
      <template #header><span>{{ t('Subscription history') }}</span></template>
      <el-table :data="subscriptions" size="small" row-key="_id">
        <el-table-column :label="t('Plan')" min-width="140">
          <template #default="{ row }">{{ planName(row.planId) }}</template>
        </el-table-column>
        <el-table-column :label="t('Status')" width="120">
          <template #default="{ row }">
            <el-tag :type="subscriptionStatusTagType[row.status] || 'info'" size="small" effect="light">{{ t(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('Billing Cycle')" width="120">
          <template #default="{ row }">{{ t(row.billingCycle) }}</template>
        </el-table-column>
        <el-table-column :label="t('Coupon')" width="120">
          <template #default="{ row }">{{ couponCode(row.couponId) || '—' }}</template>
        </el-table-column>
        <el-table-column :label="t('Started')" width="120">
          <template #default="{ row }">{{ formatDate(row.created) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <InvoiceHistory :billable-entity-type="billableEntityType" :billable-entity-id="billableEntityId" />

    <!-- attach / change plan -->
    <el-drawer v-model="drawerOpen" :title="current ? t('Change Plan') : t('Attach to Plan')" size="min(520px, 100vw)">
      <div class="drawer-body">
        <el-radio-group v-model="selectedCycle" class="cycle-toggle">
          <el-radio-button value="monthly">{{ t('Monthly') }}</el-radio-button>
          <el-radio-button value="yearly">{{ t('Yearly') }}</el-radio-button>
        </el-radio-group>

        <div class="plan-cards" role="radiogroup">
          <button
            v-for="plan in sortedPlans"
            :key="plan._id"
            type="button"
            class="plan-card"
            :class="{ selected: plan._id === selectedPlanId }"
            role="radio"
            :aria-checked="plan._id === selectedPlanId"
            @click="selectPlan(plan)"
          >
            <span class="plan-card-head">
              <strong>{{ plan.name }}</strong>
              <el-tag v-if="plan._id === current?.planId" size="small" effect="plain">{{ t('Current') }}</el-tag>
              <el-tag v-if="!plan.isActive" size="small" type="info" effect="plain">{{ t('Inactive plan') }}</el-tag>
            </span>
            <span class="plan-card-price">
              <template v-if="plan.dynamic">{{ t('Custom amount') }}</template>
              <template v-else>
                {{ formatMoney(planPrice(plan, selectedCycle), plan.currency) }}
                <small>/ {{ t(selectedCycle) }}</small>
              </template>
            </span>
            <span v-if="plan.features?.length" class="plan-card-features">
              {{ plan.features.slice(0, 3).join(' · ') }}
            </span>
          </button>
        </div>

        <el-form v-if="selectedPlan" label-position="top" @submit.prevent>
          <el-form-item v-if="selectedPlan.dynamic" :label="t('Amount')" required>
            <el-input-number v-model="selectedAmount" :min="0" :precision="2" controls-position="right" />
          </el-form-item>
          <el-form-item :label="t('Coupon (optional)')">
            <el-select v-model="selectedCouponCode" filterable clearable :placeholder="t('Select a coupon')" style="width: 100%;">
              <el-option v-for="coupon in drawerCoupons" :key="coupon._id" :label="couponLabel(coupon)" :value="coupon.code" />
              <template #empty>{{ t('No applicable coupons') }}</template>
            </el-select>
          </el-form-item>
        </el-form>

        <div v-if="selectedPlan" class="price-summary">
          <span>{{ t('Total') }}</span>
          <span class="price-values">
            <s v-if="selectedCoupon" class="muted">{{ formatMoney(basePrice, selectedPlan.currency) }}</s>
            <strong>{{ formatMoney(finalPrice, selectedPlan.currency) }}</strong>
            <small class="muted">/ {{ t(selectedCycle) }}</small>
          </span>
          <span v-if="selectedCoupon" class="muted benefit">{{ benefitLabel(selectedCoupon) }}</span>
        </div>
      </div>

      <template #footer>
        <el-button @click="drawerOpen = false">{{ t('Cancel') }}</el-button>
        <el-button type="primary" :disabled="!selectedPlanId" :loading="saving" @click="confirmPlan">
          {{ current ? t('Change Plan') : t('Attach to Plan') }}
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.billing-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.plan-headline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-block-end: 12px;
}

.plan-name {
  font-size: 1.25rem;
}

.muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.coupon-block {
  margin-block-start: 16px;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block-label {
  font-weight: 600;
  font-size: 13px;
}

.coupon-current,
.coupon-apply {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.coupon-apply .el-select {
  flex: 1 1 220px;
  max-inline-size: 360px;
}

.danger-row {
  margin-block-start: 16px;
  display: flex;
  justify-content: flex-end;
}

.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  text-align: start;
  background: var(--el-bg-color);
  color: inherit;
  font: inherit;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.plan-card:hover {
  border-color: var(--el-color-primary-light-5);
}

.plan-card.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.plan-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-card-price {
  font-size: 1.1rem;
  font-weight: 600;
}

.plan-card-price small {
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.plan-card-features {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.price-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}

.price-values {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.price-values strong {
  font-size: 1.25rem;
}

.benefit {
  inline-size: 100%;
  text-align: end;
}
</style>
