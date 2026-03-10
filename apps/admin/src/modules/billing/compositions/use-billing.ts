import { ref, computed, Ref } from 'vue'
import billingService, { CheckoutRequest, CheckoutResponse } from '@/services/apis/billing-service'
import { useDispatcher } from '@/modules/core/compositions/dispatcher'
import { IPlan, ISubscription, IInvoice, ICoupon, BillableEntityType, BillingCycle } from '@qelos/global-types'

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

export function useSubscription(billableEntityType: Ref<BillableEntityType>, billableEntityId: Ref<string>) {
  const subscription = ref<ISubscription | null>(null)
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<any>(null)

  async function fetch() {
    if (!billableEntityId.value) return
    loading.value = true
    error.value = null
    try {
      subscription.value = await billingService.getActiveSubscription(
        billableEntityType.value,
        billableEntityId.value
      )
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  fetch()

  return { subscription, loading, loaded, error, refresh: fetch }
}

export function useInvoices(billableEntityType: Ref<BillableEntityType>, billableEntityId: Ref<string>) {
  const invoices = ref<IInvoice[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<any>(null)

  async function fetch() {
    if (!billableEntityId.value) return
    loading.value = true
    error.value = null
    try {
      invoices.value = await billingService.getInvoices({
        billableEntityType: billableEntityType.value,
        billableEntityId: billableEntityId.value,
      })
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  fetch()

  return { invoices, loading, loaded, error, refresh: fetch }
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
