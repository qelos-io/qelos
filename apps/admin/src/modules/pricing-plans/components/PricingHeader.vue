<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useSubscriptionsSummaryStore } from '../store/summary';

type Tab = 'overview' | 'plans' | 'coupons' | 'subscribers' | 'setup';

defineProps<{ active: Tab; title?: string; subtitle?: string }>();

const { t } = useI18n();
const route = useRoute();
const { summary } = storeToRefs(useSubscriptionsSummaryStore());

const tabs = computed(() => [
  { id: 'overview' as Tab, label: t('Overview'), to: { name: 'pricing-plans' } },
  { id: 'plans' as Tab, label: t('Plans'), to: { name: 'plans-list' } },
  { id: 'coupons' as Tab, label: t('Coupons'), to: { name: 'coupons' } },
  { id: 'subscribers' as Tab, label: t('Subscribers'), to: { name: 'subscribers' }, badge: summary.value?.byStatus.past_due || 0 },
  { id: 'setup' as Tab, label: t('Setup'), to: { name: 'paymentsConfiguration' } },
]);
</script>

<template>
  <header class="pricing-head">
    <div class="head-row">
      <div class="head-title">
        <h1>{{ title || $t('Pricing & Billing') }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="head-actions"><slot name="actions" /></div>
    </div>

    <nav class="pricing-tabs" :aria-label="$t('Pricing & Billing')">
      <router-link
        v-for="tab in tabs"
        :key="tab.id"
        :to="tab.to"
        class="tab"
        :class="{ active: active === tab.id }"
        :aria-current="active === tab.id ? 'page' : undefined"
      >
        {{ tab.label }}
        <span v-if="tab.badge" class="tab-badge" :title="$t('Past due')">{{ tab.badge }}</span>
      </router-link>
    </nav>
  </header>
</template>

<style scoped lang="scss">
.pricing-head {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.head-title {
  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1.2;
  }

  p {
    margin: 4px 0 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.head-actions {
  display: flex;
  gap: 8px;
}

.pricing-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  border-block-end: 1px solid var(--el-border-color-lighter);
  scrollbar-width: none;
}

.tab {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  text-decoration: none;
  border-block-end: 2px solid transparent;
  margin-block-end: -1px;

  &:hover {
    color: var(--el-text-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
    border-radius: 4px;
  }

  &.active {
    color: var(--el-color-primary);
    border-block-end-color: var(--el-color-primary);
    font-weight: 600;
  }
}

.tab-badge {
  min-inline-size: 20px;
  padding-inline: 6px;
  border-radius: 10px;
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 768px) {
  .head-row {
    gap: 12px;
  }
}
</style>
