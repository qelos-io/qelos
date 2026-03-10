<template>
  <div class="payments-tab">
    <!-- Current Plan -->
    <CurrentPlan
      v-if="subscription && subscriptionLoaded"
      :subscription="subscription"
      :plan="currentPlan"
      :canceling="checkoutLoading"
      @cancel="confirmCancel"
      @change-plan="showPlanSelection = true"
    />

    <!-- Plan Selection -->
    <el-card
      v-if="showPlanSelection || (!subscription && subscriptionLoaded)"
      class="section-card"
      shadow="hover"
    >
      <template #header>
        <div class="card-header">
          <div>
            <h3>{{ $t(subscription ? 'Change Plan' : 'Choose a Plan') }}</h3>
            <p class="subtitle">{{ $t('Select the plan that works best for your workspace') }}</p>
          </div>
          <el-button
            v-if="subscription && showPlanSelection"
            type="info"
            plain
            size="small"
            @click="showPlanSelection = false"
          >
            {{ $t('Cancel') }}
          </el-button>
        </div>
      </template>

      <CouponInput :plan-id="selectedPlanId" @validated="handleCouponValidated" />

      <div class="plan-selector-wrapper">
        <PlanSelector
          :plans="activePlans"
          :current-plan-id="subscription?.planId"
          :loading="plansLoading"
          @select="handlePlanSelect"
        />
      </div>
    </el-card>

    <!-- Checkout Confirmation -->
    <el-dialog
      v-model="showCheckoutDialog"
      :title="$t('Confirm Subscription')"
      width="480px"
      :close-on-click-modal="false"
    >
      <div class="checkout-summary" v-if="selectedPlanForCheckout">
        <div class="summary-row">
          <span>{{ $t('Plan') }}</span>
          <strong>{{ selectedPlanForCheckout.name }}</strong>
        </div>
        <div class="summary-row">
          <span>{{ $t('Workspace') }}</span>
          <strong>{{ workspace?.name || workspaceId }}</strong>
        </div>
        <div class="summary-row">
          <span>{{ $t('Billing') }}</span>
          <strong>{{ selectedCycle === 'yearly' ? $t('Yearly') : $t('Monthly') }}</strong>
        </div>
        <div class="summary-row">
          <span>{{ $t('Price') }}</span>
          <strong>{{ checkoutPrice }}</strong>
        </div>
        <div v-if="appliedCoupon" class="summary-row discount-row">
          <span>{{ $t('Coupon') }} ({{ appliedCoupon.code }})</span>
          <strong class="discount-value">-{{ discountLabel }}</strong>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCheckoutDialog = false" :disabled="checkoutLoading">
          {{ $t('Cancel') }}
        </el-button>
        <el-button type="primary" :loading="checkoutLoading" @click="handleCheckout">
          <font-awesome-icon :icon="['fas', 'lock']" class="icon-left" />
          {{ $t('Subscribe') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Cancel Confirmation -->
    <el-dialog
      v-model="showCancelDialog"
      :title="$t('Cancel Subscription')"
      width="420px"
    >
      <p>{{ $t('Are you sure you want to cancel the workspace subscription?') }}</p>
      <p class="cancel-note" v-if="subscription?.currentPeriodEnd">
        {{ $t('Workspace access will continue until {date}.', { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() }) }}
      </p>
      <template #footer>
        <el-button @click="showCancelDialog = false" :disabled="checkoutLoading">
          {{ $t('Keep Subscription') }}
        </el-button>
        <el-button type="danger" :loading="checkoutLoading" @click="handleCancel">
          {{ $t('Cancel Subscription') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Loading skeleton when subscription hasn't loaded yet -->
    <el-skeleton v-if="!subscriptionLoaded" :rows="5" animated />

    <!-- Invoice History -->
    <InvoiceHistory
      v-if="workspaceId"
      :billable-entity-type="'workspace'"
      :billable-entity-id="workspaceId"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElNotification } from 'element-plus'
import { ICoupon, BillingCycle, BillableEntityType } from '@qelos/global-types'
import { useBillingPlans, useSubscription, useCheckout } from '@/modules/billing/compositions/use-billing'
import PlanSelector from '@/modules/billing/components/PlanSelector.vue'
import CurrentPlan from '@/modules/billing/components/CurrentPlan.vue'
import InvoiceHistory from '@/modules/billing/components/InvoiceHistory.vue'
import CouponInput from '@/modules/billing/components/CouponInput.vue'

const props = defineProps<{
  workspaceId: string
  workspace?: Record<string, any>
}>()

const { t } = useI18n()

const entityType = ref<BillableEntityType>('workspace')
const entityId = toRef(props, 'workspaceId')

const { activePlans, loading: plansLoading } = useBillingPlans()
const {
  subscription,
  loading: subscriptionLoading,
  loaded: subscriptionLoaded,
  refresh: refreshSubscription,
} = useSubscription(entityType, entityId)
const { initiateCheckout, cancelSubscription, loading: checkoutLoading } = useCheckout()

const showPlanSelection = ref(false)
const showCheckoutDialog = ref(false)
const showCancelDialog = ref(false)
const selectedPlanId = ref<string>('')
const selectedCycle = ref<BillingCycle>('monthly')
const appliedCoupon = ref<ICoupon | null>(null)

const currentPlan = computed(() =>
  activePlans.value.find(p => p._id === subscription.value?.planId) || null
)

const selectedPlanForCheckout = computed(() =>
  activePlans.value.find(p => p._id === selectedPlanId.value) || null
)

const checkoutPrice = computed(() => {
  if (!selectedPlanForCheckout.value) return ''
  const plan = selectedPlanForCheckout.value
  const amount = selectedCycle.value === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: plan.currency || 'USD' }).format(amount || 0)
})

const discountLabel = computed(() => {
  if (!appliedCoupon.value) return ''
  const c = appliedCoupon.value
  if (c.discountType === 'percentage') return `${c.discountValue}%`
  const currency = c.currency || 'USD'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(c.discountValue)
})

function handleCouponValidated(coupon: ICoupon | null) {
  appliedCoupon.value = coupon
}

function handlePlanSelect(planId: string, cycle: BillingCycle) {
  selectedPlanId.value = planId
  selectedCycle.value = cycle
  showCheckoutDialog.value = true
}

async function handleCheckout() {
  const result = await initiateCheckout({
    planId: selectedPlanId.value,
    billingCycle: selectedCycle.value,
    billableEntityType: 'workspace',
    billableEntityId: props.workspaceId,
    couponCode: appliedCoupon.value?.code,
    successUrl: window.location.href,
    cancelUrl: window.location.href,
  })

  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl
  } else if (result) {
    showCheckoutDialog.value = false
    showPlanSelection.value = false
    ElNotification.success({ title: t('Success'), message: t('Subscription created successfully') })
    refreshSubscription()
  } else {
    ElNotification.error({ title: t('Error'), message: t('Failed to start checkout. Please try again.') })
  }
}

function confirmCancel() {
  showCancelDialog.value = true
}

async function handleCancel() {
  if (!subscription.value?._id) return
  const result = await cancelSubscription(subscription.value._id)
  if (result) {
    showCancelDialog.value = false
    ElNotification.success({ title: t('Canceled'), message: t('Workspace subscription has been canceled.') })
    refreshSubscription()
  } else {
    ElNotification.error({ title: t('Error'), message: t('Failed to cancel subscription. Please try again.') })
  }
}
</script>

<style scoped>
.payments-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.plan-selector-wrapper {
  margin-top: 20px;
}

.checkout-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 14px;
}

.summary-row:last-child {
  border-bottom: none;
}

.discount-row .discount-value {
  color: var(--el-color-success);
}

.cancel-note {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.icon-left {
  margin-right: 5px;
}
</style>
