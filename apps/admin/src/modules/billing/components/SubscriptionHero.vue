<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheckFilled, Clock, InfoFilled, WarningFilled } from '@element-plus/icons-vue'
import type { IPlan, ISubscription, ISubscriptionActivityItem } from '@qelos/global-types'
import {
  STATE_TONES,
  daysUntil,
  formatMoney,
  getPlanPrice,
  type SubscriptionState,
} from '../services/billing-presentation'

const props = defineProps<{
  subscription: ISubscription | null
  plan: IPlan | null
  state: SubscriptionState
  couponCode: string | null
  failedInvoice?: ISubscriptionActivityItem | null
  canceling?: boolean
}>()

const emit = defineEmits<{
  changePlan: []
  cancel: []
}>()

const { t, locale } = useI18n()

const tone = computed(() => STATE_TONES[props.state])

const stateLabel = computed(
  () =>
    ({
      none: t('No plan'),
      active: t('Active'),
      trialing: t('Trial'),
      past_due: t('Payment overdue'),
      pending: t('Awaiting payment'),
      canceled_running: t('Canceled'),
      canceled: t('Canceled'),
      expired: t('Expired'),
    })[props.state],
)

const date = (value?: Date | string) =>
  value ? new Date(value).toLocaleDateString(locale.value || undefined, { dateStyle: 'medium' }) : ''

const periodEnd = computed(() => props.subscription?.currentPeriodEnd)
const daysLeft = computed(() => daysUntil(periodEnd.value))
const cycle = computed(() => props.subscription?.billingCycle || 'monthly')

const price = computed(() => {
  if (!props.plan) return ''
  if (props.plan.dynamic) {
    return props.subscription?.dynamicAmount ? formatMoney(props.subscription.dynamicAmount, props.plan.currency, locale.value) : t('Custom')
  }
  const amount = getPlanPrice(props.plan, cycle.value)
  return amount ? formatMoney(amount, props.plan.currency, locale.value) : t('Free')
})
const isFree = computed(() => !!props.plan && !props.plan.dynamic && !getPlanPrice(props.plan, cycle.value))

const meta = computed(() => {
  const items: { label: string; value: string; hint?: string }[] = []
  if (!props.subscription) return items
  if (!isFree.value) items.push({ label: t('Billing'), value: cycle.value === 'yearly' ? t('Yearly') : t('Monthly') })
  if (props.state === 'active' || props.state === 'past_due') {
    items.push({
      label: props.state === 'past_due' ? t('Period ended') : t('Renews on'),
      value: date(periodEnd.value),
      hint: daysLeft.value !== null && daysLeft.value >= 0 ? `${t('in')} ${daysLeft.value} ${t('days')}` : undefined,
    })
  }
  if (props.state === 'trialing') items.push({ label: t('Trial ends'), value: date(periodEnd.value), hint: daysLeft.value !== null ? `${daysLeft.value} ${t('days left')}` : undefined })
  if (props.state === 'canceled_running') items.push({ label: t('Access until'), value: date(periodEnd.value), hint: daysLeft.value !== null ? `${daysLeft.value} ${t('days left')}` : undefined })
  if (props.subscription.providerKind) items.push({ label: t('Provider'), value: props.subscription.providerKind })
  if (props.couponCode) {
    items.push({
      label: t('Coupon'),
      value: props.couponCode,
      hint: props.subscription.couponBenefitEndsAt ? `${t('until')} ${date(props.subscription.couponBenefitEndsAt)}` : undefined,
    })
  }
  // a label with nothing to say next to it is noise
  return items.filter((item) => item.value)
})

const banner = computed(() => {
  switch (props.state) {
    case 'past_due':
      return {
        icon: WarningFilled,
        title: t('The last payment failed'),
        text: t('Access may be limited until the payment goes through.'),
        link: props.failedInvoice?.invoiceUrl ? { href: props.failedInvoice.invoiceUrl, label: t('Open the unpaid invoice') } : null,
      }
    case 'pending':
      return {
        icon: Clock,
        title: t('Checkout was not completed'),
        text: t('The plan starts after the first payment. Complete the checkout to activate it.'),
        action: t('Complete checkout'),
      }
    case 'canceled_running':
      return {
        icon: InfoFilled,
        title: `${t('Canceled. Access continues until')} ${date(periodEnd.value)}`,
        text: t('Choose a plan to keep the service after that date.'),
        action: t('Resubscribe'),
      }
    case 'canceled':
    case 'expired':
      return {
        icon: InfoFilled,
        title: t('This subscription has ended'),
        text: periodEnd.value ? `${t('It ended on')} ${date(periodEnd.value)}.` : '',
        action: t('Choose a plan'),
      }
    default:
      return null
  }
})

const primaryLabel = computed(() => (props.state === 'none' ? t('Choose a plan') : ['canceled', 'expired', 'canceled_running'].includes(props.state) ? t('Resubscribe') : t('Change plan')))
const cancelable = computed(() => ['active', 'trialing', 'past_due'].includes(props.state))
</script>

<template>
  <section class="hero" :class="tone" :aria-label="$t('Subscription')">
    <div v-if="banner" class="hero-banner" :class="tone" role="status">
      <el-icon class="banner-icon"><component :is="banner.icon" /></el-icon>
      <div class="banner-text">
        <strong>{{ banner.title }}</strong>
        <span v-if="banner.text">{{ banner.text }}</span>
      </div>
      <a v-if="banner.link" class="banner-action" :href="banner.link.href" target="_blank" rel="noopener">{{ banner.link.label }}</a>
      <el-button v-else-if="banner.action" size="small" @click="emit('changePlan')">{{ banner.action }}</el-button>
    </div>

    <div class="hero-main">
      <div class="hero-id">
        <span class="state-pill" :class="tone">
          <el-icon v-if="state === 'active'"><CircleCheckFilled /></el-icon>
          <span v-else class="state-dot" aria-hidden="true" />
          {{ stateLabel }}
        </span>
        <h2 class="hero-plan">{{ plan?.name || (subscription ? '…' : $t('No plan yet')) }}</h2>
        <p v-if="plan" class="hero-price">
          <span class="price-amount">{{ price }}</span>
          <span v-if="!plan.dynamic && !isFree" class="price-period">/ {{ cycle === 'yearly' ? $t('year') : $t('month') }}</span>
        </p>
        <p v-else-if="!subscription" class="hero-empty">{{ $t('Choose a plan to start billing this account.') }}</p>
      </div>

      <dl v-if="meta.length" class="hero-meta">
        <div v-for="item in meta" :key="item.label">
          <dt>{{ item.label }}</dt>
          <dd>
            <span dir="auto">{{ item.value }}</span>
            <small v-if="item.hint">{{ item.hint }}</small>
          </dd>
        </div>
      </dl>

      <div class="hero-actions">
        <el-button type="primary" @click="emit('changePlan')">{{ primaryLabel }}</el-button>
        <el-button v-if="cancelable" text type="danger" :loading="canceling" @click="emit('cancel')">{{ $t('Cancel subscription') }}</el-button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  container-type: inline-size;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);

  &.danger {
    border-color: var(--el-color-danger-light-5);
  }
}

.hero-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  font-size: 14px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);

  &.danger {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
  }

  &.warning {
    background: var(--el-color-warning-light-9);
    color: var(--el-color-warning-dark-2, var(--el-text-color-primary));
  }
}

.banner-icon {
  flex: none;
  font-size: 20px;
}

.banner-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;

  strong {
    color: var(--el-text-color-primary);
  }

  span {
    color: var(--el-text-color-regular);
  }
}

.banner-action {
  flex: none;
  font-weight: 600;
  color: var(--el-color-primary);
}

.hero-main {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr) auto;
  align-items: center;
  gap: 24px;
  padding: 24px;
}

.hero-id {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-inline-size: 0;
}

.state-pill {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 6px;
  padding: 3px 12px 3px 10px;
  border-radius: 999px;
  background: var(--el-fill-color);
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);

  &.success {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
  }

  &.warning {
    background: var(--el-color-warning-light-9);
    color: var(--el-color-warning);
  }

  &.danger {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
  }
}

.state-dot {
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: currentColor;
}

.hero-plan {
  margin: 0;
  padding: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.hero-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.price-amount {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.price-period {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.hero-empty {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.hero-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 14px 20px;
  margin: 0;

  dt {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  dd {
    display: flex;
    flex-direction: column;
    margin: 2px 0 0;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;

    small {
      font-size: 12px;
      font-weight: 400;
      color: var(--el-text-color-secondary);
    }
  }
}

.hero-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  justify-self: end;
}

/* the hero sits in panels of different widths, so it adapts to its own width, not the screen's */
@container (max-width: 700px) {
  .hero-main {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .hero-actions {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-self: start;
  }
}

@container (max-width: 520px) {
  .hero-banner {
    flex-wrap: wrap;
  }

  .banner-text {
    flex-basis: calc(100% - 40px);
  }

  .banner-action {
    margin-inline-start: 32px;
  }

  .hero-main {
    padding: 16px;
  }
}
</style>
