import { ref, computed, watch, Ref } from 'vue'
import billingService, { CheckoutRequest, CheckoutResponse } from '@/services/apis/billing-service'
import { useDispatcher } from '@/modules/core/compositions/dispatcher'
import { IPlan, ISubscription, ISubscriptionActivityItem, ICoupon, BillableEntityType, BillingCycle } from '@qelos/global-types'
import { pickCurrentSubscription } from '../services/billing-presentation'

export function useBillingPlans() {
  const {
    result: plans,
    loading,
    loaded,
    error,
    retry,
  } = useDispatcher<IPlan[]>(() => billingService.getPublicPlans(), [])

  const activePlans = computed(() =>
    (plans.value || []).filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  return { plans, activePlans, loading, loaded, error, retry }
}

/**
 * The subscription that best describes the entity (live first, then the latest ended one),
 * whatever its status; a past-due or pending subscription is still "the" subscription.
 */
export function useCurrentSubscription(billableEntityType: Ref<BillableEntityType>, billableEntityId: Ref<string>) {
  const subscription = ref<ISubscription | null>(null)
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<any>(null)

  async function refresh() {
    if (!billableEntityId.value) return
    loading.value = true
    error.value = null
    try {
      const subscriptions = await billingService.getSubscriptions({
        billableEntityType: billableEntityType.value,
        billableEntityId: billableEntityId.value,
      })
      subscription.value = pickCurrentSubscription(subscriptions || [])
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  refresh()

  return { subscription, loading, loaded, error, refresh }
}

/** The merged timeline (history + invoices) of a subscription, newest first. */
export function useSubscriptionActivity(subscriptionId: Ref<string | undefined>) {
  const activity = ref<ISubscriptionActivityItem[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<any>(null)

  async function refresh() {
    if (!subscriptionId.value) {
      activity.value = []
      loaded.value = true
      return
    }
    loading.value = true
    error.value = null
    try {
      activity.value = await billingService.getSubscriptionActivity(subscriptionId.value)
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  watch(subscriptionId, refresh, { immediate: true })

  return { activity, loading, loaded, error, refresh }
}

/** The plan of a subscription, even when it is no longer public or active. */
export function useSubscriptionPlan(planId: Ref<string | undefined>) {
  const plan = ref<IPlan | null>(null)
  const loading = ref(false)

  watch(
    planId,
    async (id) => {
      plan.value = null
      if (!id) return
      loading.value = true
      try {
        plan.value = await billingService.getPlan(id)
      } catch {
        plan.value = null
      } finally {
        loading.value = false
      }
    },
    { immediate: true },
  )

  return { plan, loading }
}

export function useCheckout() {
  const loading = ref(false)
  const error = ref<any>(null)

  async function initiateCheckout(data: CheckoutRequest): Promise<CheckoutResponse | null> {
    loading.value = true
    error.value = null
    try {
      return await billingService.initiateCheckout(data)
    } catch (e: any) {
      error.value = e?.response?.data || e
      return null
    } finally {
      loading.value = false
    }
  }

  async function cancelSubscription(subscriptionId: string): Promise<ISubscription | null> {
    loading.value = true
    error.value = null
    try {
      return await billingService.cancelSubscription(subscriptionId)
    } catch (e: any) {
      error.value = e?.response?.data || e
      return null
    } finally {
      loading.value = false
    }
  }

  return { initiateCheckout, cancelSubscription, loading, error }
}

export function useCouponValidation() {
  const validatedCoupon = ref<ICoupon | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)

  async function validate(code: string, planId?: string) {
    if (!code?.trim()) {
      validatedCoupon.value = null
      error.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      validatedCoupon.value = await billingService.validateCoupon(code.trim(), planId)
    } catch (e: any) {
      error.value = e?.response?.data?.message || 'Invalid coupon code'
      validatedCoupon.value = null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    validatedCoupon.value = null
    error.value = null
  }

  return { validatedCoupon, loading, error, validate, reset }
}
