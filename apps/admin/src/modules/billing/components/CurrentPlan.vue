<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ISubscription, IPlan } from '@qelos/global-types'

const { t } = useI18n()

const props = defineProps<{
  subscription: ISubscription
  plan?: IPlan | null
  canceling?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  changePlan: []
}>()

const statusType = computed(() => {
  const map: Record<string, string> = {
    active: 'success',
    trialing: 'warning',
    past_due: 'danger',
    canceled: 'info',
    expired: 'info',
    pending: 'warning',
  }
  return map[props.subscription.status] || 'info'
})

const price = computed(() => {
  if (!props.plan) return ''
  const amount = props.subscription.billingCycle === 'yearly' ? props.plan.yearlyPrice : props.plan.monthlyPrice
  const currency = props.plan.currency || 'USD'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0)
})

const cycleLabel = computed(() =>
  props.subscription.billingCycle === 'yearly' ? t('Yearly') : t('Monthly')
)

const renewalDate = computed(() => {
  if (!props.subscription.currentPeriodEnd) return null
  return new Date(props.subscription.currentPeriodEnd).toLocaleDateString()
})

const isCancelable = computed(() =>
  ['active', 'trialing', 'past_due'].includes(props.subscription.status)
)
</script>

<template>
  <el-card class="current-plan-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div>
          <h3>{{ t('Current Plan') }}</h3>
          <p class="subtitle">{{ t('Your active subscription details') }}</p>
        </div>
        <el-tag :type="statusType" effect="light" size="default">
          {{ subscription.status }}
        </el-tag>
      </div>
    </template>

    <div class="plan-details">
      <div class="detail-row">
        <span class="detail-label">{{ t('Plan') }}</span>
        <span class="detail-value plan-name-value">{{ plan?.name || subscription.planId }}</span>
      </div>
      <div class="detail-row" v-if="price">
        <span class="detail-label">{{ t('Price') }}</span>
        <span class="detail-value">{{ price }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">{{ t('Billing Cycle') }}</span>
        <span class="detail-value">{{ cycleLabel }}</span>
      </div>
      <div class="detail-row" v-if="renewalDate">
        <span class="detail-label">{{ t('Next Renewal') }}</span>
        <span class="detail-value">{{ renewalDate }}</span>
      </div>
    </div>

    <div class="plan-actions">
      <el-button type="primary" plain @click="emit('changePlan')">
        <font-awesome-icon :icon="['fas', 'exchange-alt']" class="icon-left" />
        {{ t('Change Plan') }}
      </el-button>
      <el-button
        v-if="isCancelable"
        type="danger"
        plain
        :loading="canceling"
        @click="emit('cancel')"
      >
        <font-awesome-icon :icon="['fas', 'times-circle']" class="icon-left" />
        {{ t('Cancel Subscription') }}
      </el-button>
    </div>
  </el-card>
</template>

<style scoped>
.current-plan-card {
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

.plan-details {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.plan-name-value {
  font-size: 16px;
  color: var(--el-color-primary);
}

.plan-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.icon-left {
  margin-right: 5px;
}
</style>
