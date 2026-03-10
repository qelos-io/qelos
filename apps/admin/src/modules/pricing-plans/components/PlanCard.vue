<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  plan: {
    name: string;
    description?: string;
    features?: string[];
    monthlyPrice: number;
    yearlyPrice: number;
    currency?: string;
    isActive?: boolean;
  };
  billingCycle?: 'monthly' | 'yearly';
}>();

const cycle = computed(() => props.billingCycle || 'monthly');

const displayPrice = computed(() => {
  const amount = cycle.value === 'yearly' ? props.plan.yearlyPrice : props.plan.monthlyPrice;
  const currency = props.plan.currency || 'USD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
});

const periodLabel = computed(() =>
  cycle.value === 'yearly' ? t('per year') : t('per month')
);

const monthlySavings = computed(() => {
  if (!props.plan.monthlyPrice || !props.plan.yearlyPrice) return 0;
  const yearlyMonthly = props.plan.yearlyPrice / 12;
  return Math.round((1 - yearlyMonthly / props.plan.monthlyPrice) * 100);
});
</script>

<template>
  <div class="plan-card" :class="{ inactive: plan.isActive === false }">
    <div class="plan-card-header">
      <h3 class="plan-name">{{ plan.name }}</h3>
      <el-tag v-if="plan.isActive === false" type="info" size="small" effect="light">
        {{ t('Inactive') }}
      </el-tag>
    </div>

    <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>

    <div class="plan-price">
      <span class="price-amount">{{ displayPrice }}</span>
      <span class="price-period">{{ periodLabel }}</span>
    </div>

    <div v-if="monthlySavings > 0 && cycle === 'yearly'" class="savings-badge">
      {{ t('Save {percent}%', { percent: monthlySavings }) }}
    </div>

    <ul v-if="plan.features?.length" class="plan-features">
      <li v-for="(feature, idx) in plan.features" :key="idx">
        <font-awesome-icon :icon="['fas', 'check']" class="check-icon" />
        {{ feature }}
      </li>
    </ul>

    <div class="plan-card-footer">
      <el-button type="primary" style="width: 100%" disabled>
        {{ t('Select Plan') }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.plan-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 24px;
  background: #fff;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.plan-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--el-color-primary-light-5);
}

.plan-card.inactive {
  opacity: 0.6;
}

.plan-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.plan-name {
  margin: 0;
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
</style>
