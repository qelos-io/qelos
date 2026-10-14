<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from '@element-plus/icons-vue'
import type { BillingCycle, ICoupon, IPlan } from '@qelos/global-types'
import CouponInput from './CouponInput.vue'
import { formatMoney, getDiscountAmount, getPlanPrice, getYearlySaving } from '../services/billing-presentation'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  plans: IPlan[]
  plansLoading?: boolean
  currentPlanId?: string
  currentCycle?: BillingCycle
  hasLive: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  confirm: [payload: { planId: string; cycle: BillingCycle; coupon: ICoupon | null }]
}>()

const { t, locale } = useI18n()

const cycle = ref<BillingCycle>('monthly')
const selectedId = ref('')
const coupon = ref<ICoupon | null>(null)

const maxSaving = computed(() => Math.max(0, ...props.plans.map((plan) => getYearlySaving(plan).percent)))
const selected = computed(() => props.plans.find((plan) => plan._id === selectedId.value) || null)
const money = (amount: number, plan: IPlan) => formatMoney(amount, plan.currency, locale.value)

const subtotal = computed(() => (selected.value ? getPlanPrice(selected.value, cycle.value) : 0))
const discount = computed(() => getDiscountAmount(subtotal.value, coupon.value))
const total = computed(() => Math.max(0, subtotal.value - discount.value))

const isCurrent = computed(() => !!selected.value && selected.value._id === props.currentPlanId && cycle.value === props.currentCycle && props.hasLive)

watch(open, (isOpen) => {
  if (!isOpen) return
  cycle.value = props.currentCycle || 'monthly'
  coupon.value = null
  const firstOther = props.plans.find((plan) => plan._id !== props.currentPlanId && !plan.dynamic)
  selectedId.value = (firstOther || props.plans.find((plan) => !plan.dynamic))?._id || ''
})

function pick(plan: IPlan) {
  if (!plan.dynamic) selectedId.value = plan._id || ''
}

function confirm() {
  if (selected.value?._id) {
    emit('confirm', { planId: selected.value._id, cycle: cycle.value, coupon: coupon.value })
  }
}
</script>

<template>
  <el-drawer
    v-model="open"
    :title="hasLive ? $t('Change plan') : $t('Choose a plan')"
    :size="$isMobile ? '100%' : '620px'"
    append-to-body
    class="plan-drawer"
  >
    <div class="drawer-body">
      <el-segmented
        v-model="cycle"
        class="cycle-toggle"
        :aria-label="$t('Billing')"
        :options="[
          { label: $t('Monthly'), value: 'monthly' },
          { label: maxSaving ? `${$t('Yearly')} · ${$t('save up to')} ${maxSaving}%` : $t('Yearly'), value: 'yearly' },
        ]"
      />

      <el-skeleton v-if="plansLoading" :rows="6" animated />

      <p v-else-if="!plans.length" class="no-plans">{{ $t('No plans are available yet.') }}</p>

      <div v-else class="plan-list" role="radiogroup" :aria-label="$t('Plans')">
        <button
          v-for="plan in plans"
          :key="plan._id"
          type="button"
          role="radio"
          class="plan-option"
          :class="{ selected: plan._id === selectedId, current: plan._id === currentPlanId && hasLive }"
          :aria-checked="plan._id === selectedId"
          :disabled="plan.dynamic"
          @click="pick(plan)"
        >
          <span class="option-head">
            <span class="option-name">{{ plan.name }}</span>
            <el-tag v-if="plan._id === currentPlanId && hasLive" size="small" effect="plain">{{ $t('Current plan') }}</el-tag>
            <span class="option-price">
              <template v-if="plan.dynamic">{{ $t('Custom pricing') }}</template>
              <template v-else>
                <strong>{{ money(getPlanPrice(plan, cycle), plan) }}</strong>
                <small>/ {{ cycle === 'yearly' ? $t('year') : $t('month') }}</small>
              </template>
            </span>
          </span>
          <span v-if="plan.description" class="option-description">{{ plan.description }}</span>
          <span v-if="cycle === 'yearly' && getYearlySaving(plan).percent" class="option-saving">
            {{ $t('Saves') }} {{ money(getYearlySaving(plan).amount, plan) }} ({{ getYearlySaving(plan).percent }}%) {{ $t('compared with monthly') }}
          </span>
          <span v-if="plan.features?.length" class="option-features">
            <span v-for="feature in plan.features.slice(0, 4)" :key="feature"><el-icon><Check /></el-icon>{{ feature }}</span>
            <small v-if="plan.features.length > 4">+{{ plan.features.length - 4 }} {{ $t('more') }}</small>
          </span>
          <span v-if="plan.dynamic" class="option-note">{{ $t('The price is set by an administrator.') }}</span>
        </button>
      </div>

      <div class="coupon-block">
        <h4>{{ $t('Coupon') }}</h4>
        <CouponInput :plan-id="selectedId" @validated="coupon = $event" />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <dl v-if="selected" class="summary">
          <div>
            <dt>{{ selected.name }} · {{ cycle === 'yearly' ? $t('Yearly') : $t('Monthly') }}</dt>
            <dd>{{ money(subtotal, selected) }}</dd>
          </div>
          <div v-if="discount" class="discount">
            <dt>{{ $t('Coupon') }} {{ coupon?.code }}</dt>
            <dd>−{{ money(discount, selected) }}</dd>
          </div>
          <div class="total">
            <dt>{{ $t('Total today') }}</dt>
            <dd>{{ money(total, selected) }}</dd>
          </div>
        </dl>
        <el-button type="primary" size="large" :loading="submitting" :disabled="!selected || isCurrent" @click="confirm">
          {{ selected ? (hasLive ? `${$t('Switch to')} ${selected.name}` : `${$t('Subscribe to')} ${selected.name}`) : $t('Choose a plan') }}
        </el-button>
        <p v-if="isCurrent" class="current-note">{{ $t('This is your current plan and billing cycle.') }}</p>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.no-plans {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plan-option {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 2px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: var(--el-color-primary-light-5);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.option-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
}

.option-name {
  font-size: 16px;
  font-weight: 700;
}

.option-price {
  margin-inline-start: auto;
  font-variant-numeric: tabular-nums;

  strong {
    font-size: 18px;
  }

  small {
    margin-inline-start: 4px;
    color: var(--el-text-color-secondary);
  }
}

.option-description,
.option-note {
  font-size: 13px;
  line-height: 1.45;
  color: var(--el-text-color-regular);
}

.option-saving {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-success);
}

.option-features {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 13px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .el-icon {
    color: var(--el-color-primary);
  }

  small {
    color: var(--el-text-color-secondary);
  }
}

.coupon-block h4 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.drawer-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: start;
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  font-size: 14px;
  font-variant-numeric: tabular-nums;

  > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  dd {
    margin: 0;
    font-weight: 600;
  }

  .discount dd {
    color: var(--el-color-success);
  }

  .total {
    padding-block-start: 8px;
    border-block-start: 1px solid var(--el-border-color-lighter);
    font-size: 16px;
  }
}

.current-note {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (prefers-reduced-motion: reduce) {
  .plan-option {
    transition: none;
  }
}
</style>
