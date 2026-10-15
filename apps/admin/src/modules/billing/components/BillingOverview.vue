<script lang="ts" setup>
import { computed, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElNotification } from 'element-plus'
import type { BillableEntityType, BillingCycle, ICoupon } from '@qelos/global-types'
import {
  useBillingPlans,
  useCheckout,
  useCurrentSubscription,
  useSubscriptionActivity,
  useSubscriptionPlan,
} from '../compositions/use-billing'
import { getActiveCouponCode, getSubscriptionState, isLiveSubscription, planHasDetails } from '../services/billing-presentation'
import SubscriptionHero from './SubscriptionHero.vue'
import PlanDetailsCard from './PlanDetailsCard.vue'
import ActivityTimeline from './ActivityTimeline.vue'
import PlanChangeDrawer from './PlanChangeDrawer.vue'

const props = defineProps<{
  billableEntityType: BillableEntityType
  billableEntityId: string
}>()

const { t, locale } = useI18n()

const entityType = toRef(props, 'billableEntityType')
const entityId = toRef(props, 'billableEntityId')

const { activePlans, loading: plansLoading } = useBillingPlans()
const { subscription, loaded, refresh: refreshSubscription } = useCurrentSubscription(entityType, entityId)
const { plan, loading: planLoading } = useSubscriptionPlan(computed(() => subscription.value?.planId))
const { activity, loading: activityLoading, refresh: refreshActivity } = useSubscriptionActivity(computed(() => subscription.value?._id))
const { initiateCheckout, cancelSubscription, loading: busy } = useCheckout()

const state = computed(() => getSubscriptionState(subscription.value))
const couponCode = computed(() => getActiveCouponCode(activity.value))
const failedInvoice = computed(() => activity.value.find((item) => item.kind === 'invoice.failed' && item.invoiceUrl) || null)
const showPlanDetails = computed(() => planLoading.value || planHasDetails(plan.value))
const hasLive = computed(() => isLiveSubscription(subscription.value))

const drawerOpen = ref(false)
const cancelOpen = ref(false)

const periodEnd = computed(() =>
  subscription.value?.currentPeriodEnd
    ? new Date(subscription.value.currentPeriodEnd).toLocaleDateString(locale.value || undefined, { dateStyle: 'medium' })
    : '',
)

async function reload() {
  await refreshSubscription()
  await refreshActivity()
}

async function onConfirm({ planId, cycle, coupon }: { planId: string; cycle: BillingCycle; coupon: ICoupon | null }) {
  const result = await initiateCheckout({
    planId,
    billingCycle: cycle,
    billableEntityType: props.billableEntityType,
    billableEntityId: props.billableEntityId,
    couponCode: coupon?.code,
    // switching plans replaces the live subscription
    reset: hasLive.value || undefined,
    successUrl: window.location.href,
    cancelUrl: window.location.href,
  })

  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl
  } else if (result) {
    drawerOpen.value = false
    ElNotification.success({ title: t('Success'), message: t('Subscription created successfully') })
    await reload()
  } else {
    ElNotification.error({ title: t('Error'), message: t('Failed to start checkout. Please try again.') })
  }
}

async function onCancel() {
  if (!subscription.value?._id) return
  const result = await cancelSubscription(subscription.value._id)
  if (result) {
    cancelOpen.value = false
    ElNotification.success({ title: t('Canceled'), message: t('The subscription has been canceled.') })
    await reload()
  } else {
    ElNotification.error({ title: t('Error'), message: t('Failed to cancel subscription. Please try again.') })
  }
}
</script>

<template>
  <div class="billing">
    <el-skeleton v-if="!loaded" :rows="5" animated />

    <template v-else>
      <SubscriptionHero
        :subscription="subscription"
        :plan="plan"
        :state="state"
        :coupon-code="couponCode"
        :failed-invoice="failedInvoice"
        :canceling="busy"
        @change-plan="drawerOpen = true"
        @cancel="cancelOpen = true"
      />

      <div v-if="subscription" class="billing-grid" :class="{ single: !showPlanDetails }">
        <PlanDetailsCard v-if="showPlanDetails" :plan="plan" :loading="planLoading" />
        <ActivityTimeline :activity="activity" :loading="activityLoading" />
      </div>
    </template>

    <PlanChangeDrawer
      v-model="drawerOpen"
      :plans="activePlans"
      :plans-loading="plansLoading"
      :current-plan-id="subscription?.planId"
      :current-cycle="subscription?.billingCycle"
      :has-live="hasLive"
      :submitting="busy"
      @confirm="onConfirm"
    />

    <el-dialog v-model="cancelOpen" :title="$t('Cancel Subscription')" width="420px" append-to-body>
      <p>{{ $t('Are you sure you want to cancel this subscription?') }}</p>
      <p v-if="periodEnd" class="cancel-note">{{ $t('Access continues until') }} {{ periodEnd }}.</p>
      <template #footer>
        <el-button :disabled="busy" @click="cancelOpen = false">{{ $t('Keep Subscription') }}</el-button>
        <el-button type="danger" :loading="busy" @click="onCancel">{{ $t('Cancel Subscription') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.billing {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.billing-grid {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  align-items: start;
  gap: 16px;
}

.cancel-note {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

/* side by side only when the panel itself is wide enough, wherever it is placed */
@container (max-width: 760px) {
  .billing-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.billing-grid.single {
  grid-template-columns: minmax(0, 1fr);
}
</style>
