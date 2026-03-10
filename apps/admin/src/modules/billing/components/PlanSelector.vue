<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IPlan, BillingCycle } from '@qelos/global-types'

const { t } = useI18n()

const props = defineProps<{
  plans: IPlan[]
  currentPlanId?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [planId: string, cycle: BillingCycle]
}>()

const billingCycle = ref<BillingCycle>('monthly')

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount || 0)
}

function getDisplayPrice(plan: IPlan) {
  return billingCycle.value === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
}

function getMonthlySavings(plan: IPlan) {
  if (!plan.monthlyPrice || !plan.yearlyPrice) return 0
  const yearlyMonthly = plan.yearlyPrice / 12
  return Math.round((1 - yearlyMonthly / plan.monthlyPrice) * 100)
}

const periodLabel = computed(() =>
  billingCycle.value === 'yearly' ? t('per year') : t('per month')
)
</script>

<template>
  <div class="plan-selector">
    <div class="billing-toggle">
      <el-radio-group v-model="billingCycle" size="large">
        <el-radio-button value="monthly">{{ t('Monthly') }}</el-radio-button>
        <el-radio-button value="yearly">
          {{ t('Yearly') }}
          <el-tag type="success" size="small" effect="plain" class="save-tag">
            {{ t('Save up to 20%') }}
          </el-tag>
        </el-radio-button>
      </el-radio-group>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />

    <div v-else class="plans-grid">
      <div
        v-for="plan in plans"
        :key="plan._id"
        class="plan-card"
        :class="{ current: plan._id === currentPlanId }"
      >
        <div class="plan-badge" v-if="plan._id === currentPlanId">
          <el-tag type="primary" size="small" effect="dark">{{ t('Current Plan') }}</el-tag>
        </div>

        <h3 class="plan-name">{{ plan.name }}</h3>
        <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>

        <div class="plan-price">
          <span class="price-amount">{{ formatPrice(getDisplayPrice(plan), plan.currency) }}</span>
          <span class="price-period">{{ periodLabel }}</span>
        </div>

        <div v-if="getMonthlySavings(plan) > 0 && billingCycle === 'yearly'" class="savings-badge">
          {{ t('Save {percent}%', { percent: getMonthlySavings(plan) }) }}
        </div>

        <ul v-if="plan.features?.length" class="plan-features">
          <li v-for="(feature, idx) in plan.features" :key="idx">
            <font-awesome-icon :icon="['fas', 'check']" class="check-icon" />
            {{ feature }}
          </li>
        </ul>

        <div class="plan-card-footer">
          <el-button
            v-if="plan._id === currentPlanId"
            type="primary"
            style="width: 100%"
            disabled
            plain
          >
            {{ t('Current Plan') }}
          </el-button>
          <el-button
            v-else
            type="primary"
            style="width: 100%"
            @click="emit('select', plan._id!, billingCycle)"
          >
            {{ t('Select Plan') }}
          </el-button>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && plans.length === 0" :description="t('No plans available')" />
  </div>
</template>

<style scoped>
.plan-selector {
  width: 100%;
}

.billing-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.save-tag {
  margin-left: 6px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.plan-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 24px;
  background: #fff;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;
}

.plan-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--el-color-primary-light-5);
}

.plan-card.current {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

.plan-badge {
  margin-bottom: 8px;
}

.plan-name {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.plan-description {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.plan-price {
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.price-amount {
  font-size: 32px;
  font-weight: 800;
  color: var(--el-color-primary);
  line-height: 1;
}

.price-period {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.savings-badge {
  display: inline-block;
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
  width: fit-content;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 16px 0;
  flex: 1;
}

.plan-features li {
  padding: 6px 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
  display: flex;
  align-items: center;
  gap: 8px;
}

.check-icon {
  color: var(--el-color-success);
  font-size: 12px;
  flex-shrink: 0;
}

.plan-card-footer {
  margin-top: auto;
  padding-top: 16px;
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
}
</style>
