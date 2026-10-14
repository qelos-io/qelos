<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ISubscriptionActivityItem } from '@qelos/global-types'
import { formatMoney } from '../services/billing-presentation'
import { formatRelative } from '@/modules/admins/services/event-presentation'

const props = defineProps<{ activity: ISubscriptionActivityItem[]; loading?: boolean }>()

const { t, locale } = useI18n()
const PAGE = 8
const shown = ref(PAGE)

const statusLabel = (status?: string) =>
  ({
    pending: t('Awaiting payment'),
    active: t('Active'),
    trialing: t('Trial'),
    past_due: t('Payment overdue'),
    canceled: t('Canceled'),
    expired: t('Expired'),
  })[status || ''] || status || ''

function describe(item: ISubscriptionActivityItem) {
  const money = item.amount !== undefined ? formatMoney(item.amount, item.currency, locale.value) : ''
  switch (item.kind) {
    case 'subscription.created':
      return { title: t('Subscription created'), tone: 'neutral' }
    case 'subscription.status_changed':
      return {
        title: `${t('Status changed')}: ${statusLabel(item.from)} → ${statusLabel(item.to)}`,
        tone: item.to === 'past_due' ? 'danger' : item.to === 'active' ? 'success' : 'neutral',
      }
    case 'subscription.canceled':
      return { title: t('Subscription canceled'), tone: 'neutral' }
    case 'coupon.applied':
      return { title: `${t('Coupon applied')}: ${item.couponCode}`, tone: 'neutral' }
    case 'coupon.removed':
      return { title: t('Coupon removed'), tone: 'neutral' }
    case 'invoice.paid':
      return { title: `${t('Payment received')} · ${money}`, tone: 'success' }
    case 'invoice.pending':
      return { title: `${t('Invoice pending')} · ${money}`, tone: 'warning' }
    case 'invoice.failed':
      return { title: `${t('Payment failed')} · ${money}`, tone: 'danger' }
    case 'invoice.refunded':
      return { title: `${t('Refunded')} · ${money}`, tone: 'neutral' }
  }
  return { title: item.kind, tone: 'neutral' }
}

const rows = computed(() =>
  props.activity.slice(0, shown.value).map((item) => ({
    item,
    ...describe(item),
    when: new Date(item.at).toLocaleString(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    ago: formatRelative(item.at, new Date(), locale.value || undefined),
  })),
)
</script>

<template>
  <section class="timeline-card" :aria-label="$t('Activity')" :aria-busy="loading">
    <h3>{{ $t('Activity') }}</h3>

    <el-skeleton v-if="loading && !activity.length" :rows="4" animated />

    <p v-else-if="!activity.length" class="timeline-empty">{{ $t('Nothing has happened on this subscription yet.') }}</p>

    <ol v-else class="timeline">
      <li v-for="(row, index) in rows" :key="index" class="timeline-row" :class="row.tone">
        <span class="row-dot" aria-hidden="true" />
        <div class="row-body">
          <p class="row-title">{{ row.title }}</p>
          <p class="row-when">
            <time :datetime="String(row.item.at)" :title="row.when">{{ row.ago }}</time>
            <a v-if="row.item.invoiceUrl" :href="row.item.invoiceUrl" target="_blank" rel="noopener">{{ $t('View invoice') }}</a>
          </p>
        </div>
      </li>
    </ol>

    <el-button v-if="activity.length > shown" text type="primary" @click="shown += PAGE">
      {{ $t('Show more') }} ({{ activity.length - shown }})
    </el-button>
  </section>
</template>

<style scoped lang="scss">
.timeline-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);

  h3 {
    margin: 0;
    font-size: 16px;
  }
}

.timeline-empty {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline-row {
  position: relative;
  display: flex;
  gap: 14px;
  padding-block-end: 18px;

  &:not(:last-child)::before {
    content: '';
    position: absolute;
    inset-block: 14px 0;
    inset-inline-start: 5px;
    inline-size: 2px;
    background: var(--el-border-color-lighter);
  }

  &:last-child {
    padding-block-end: 0;
  }
}

.row-dot {
  flex: none;
  inline-size: 12px;
  block-size: 12px;
  margin-block-start: 5px;
  border-radius: 50%;
  background: var(--el-border-color-darker);
  box-shadow: 0 0 0 3px var(--el-bg-color);
  z-index: 1;
}

.success .row-dot {
  background: var(--el-color-primary);
}

.warning .row-dot {
  background: var(--el-color-warning);
}

.danger .row-dot {
  background: var(--el-color-danger);
}

.row-body {
  min-inline-size: 0;
}

.row-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.danger .row-title {
  color: var(--el-color-danger);
}

.row-when {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  a {
    color: var(--el-color-primary);
    font-weight: 500;
  }
}
</style>
