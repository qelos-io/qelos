<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { Check, Plus, WarningFilled } from '@element-plus/icons-vue';
import type { IPaymentsConfigurationMetadata, SubscriptionStatus } from '@qelos/global-types';
import billingService from '@/services/apis/billing-service';
import { formatRelative } from '@/modules/admins/services/event-presentation';
import PricingHeader from '../components/PricingHeader.vue';
import { usePlansStore } from '../store/plans';
import { useSubscriptionsSummaryStore } from '../store/summary';
import { useEntityNames } from '../compositions/entity-names';
import { getSetupSteps, isSetupComplete, planShare } from '../services/pricing-overview';
import { formatMoney } from '../services/pricing';

const { t, locale } = useI18n();
const router = useRouter();
const plansStore = usePlansStore();
const { plans, loaded: plansLoaded } = storeToRefs(plansStore);
const summaryStore = useSubscriptionsSummaryStore();
const { summary, loading, loaded, error } = storeToRefs(summaryStore);
const { resolve, nameOf } = useEntityNames();

const config = ref<Partial<IPaymentsConfigurationMetadata> | null>(null);
const configLoaded = ref(false);

onMounted(async () => {
  summaryStore.retry();
  try {
    config.value = (await billingService.getPaymentsConfiguration())?.metadata ?? null;
  } catch {
    config.value = null;
  } finally {
    configLoaded.value = true;
  }
});

const steps = computed(() => getSetupSteps(config.value, plans.value || []));
const setupComplete = computed(() => isSetupComplete(steps.value));
const STEP_TEXT = computed(() => ({
  provider: { title: t('Connect a payment provider'), hint: t('Paddle, PayPal or Sumit, set up as an integration source.'), action: t('Open setup') },
  enabled: { title: t('Turn payments on'), hint: t('Customers can only check out once payments are enabled.'), action: t('Open setup') },
  plan: { title: t('Publish an active plan'), hint: t('Plans define what customers can buy.'), action: t('Create a plan') },
}));

const STATUS_ORDER: SubscriptionStatus[] = ['active', 'trialing', 'past_due', 'pending', 'canceled', 'expired'];
const STATUS_LABEL = computed<Record<SubscriptionStatus, string>>(() => ({
  active: t('Active'),
  trialing: t('Trial'),
  past_due: t('Past due'),
  pending: t('Pending'),
  canceled: t('Canceled'),
  expired: t('Expired'),
}));

const total = computed(() => STATUS_ORDER.reduce((sum, status) => sum + (summary.value?.byStatus[status] ?? 0), 0));
const segments = computed(() =>
  STATUS_ORDER.map((status) => ({ status, count: summary.value?.byStatus[status] ?? 0 })).filter((segment) => segment.count > 0),
);

const planName = (id: string) => (plans.value || []).find((plan) => plan._id === id)?.name || summary.value?.byPlan.find((row) => row.planId === id)?.name || '—';

watch(
  summary,
  (value) => value && resolve(value.attention.map((item) => ({ type: item.billableEntityType, id: item.billableEntityId }))),
  { immediate: true },
);

const attentionRows = computed(() =>
  (summary.value?.attention || []).map((item) => ({
    ...item,
    name: nameOf(item.billableEntityType, item.billableEntityId),
    plan: planName(item.planId),
    ago: formatRelative(item.since, new Date(), locale.value || undefined),
  })),
);

function open(item: { billableEntityType: string; billableEntityId: string }) {
  router.push({ name: 'subscribers', query: { open: `${item.billableEntityType}:${item.billableEntityId}` } });
}

const money = (amount: number, currency: string) => formatMoney(amount, currency);
</script>

<template>
  <div class="pricing-page">
    <PricingHeader active="overview" :subtitle="$t('Revenue, subscribers and what needs your attention.')">
      <template #actions>
        <el-button type="primary" @click="router.push({ name: 'createPlan' })">
          <el-icon><Plus /></el-icon>
          <span class="action-label">{{ $t('Create Plan') }}</span>
        </el-button>
      </template>
    </PricingHeader>

    <section v-if="configLoaded && plansLoaded && !setupComplete" class="setup" :aria-label="$t('Setup')">
      <h2>{{ $t('Finish setup before customers can pay') }}</h2>
      <ol>
        <li v-for="step in steps" :key="step.id" :class="{ done: step.done }">
          <span class="step-mark" aria-hidden="true"><el-icon v-if="step.done"><Check /></el-icon></span>
          <span class="step-text">
            <strong>{{ STEP_TEXT[step.id].title }}</strong>
            <small>{{ STEP_TEXT[step.id].hint }}</small>
          </span>
          <el-button v-if="!step.done" size="small" @click="router.push({ name: step.route })">{{ STEP_TEXT[step.id].action }}</el-button>
        </li>
      </ol>
    </section>

    <el-skeleton v-if="loading && !loaded" :rows="6" animated />

    <el-result v-else-if="error" icon="warning" :title="$t('Could not load the overview')" :sub-title="$t('The payments service did not answer. Try again in a moment.')">
      <template #extra><el-button type="primary" @click="summaryStore.retry()">{{ $t('Try again') }}</el-button></template>
    </el-result>

    <template v-else-if="summary">
      <div class="top-grid">
        <section class="panel revenue" :aria-label="$t('Revenue')">
          <h2>{{ $t('Estimated monthly revenue') }}</h2>
          <template v-if="summary.mrr.length">
            <p class="mrr-main">{{ money(summary.mrr[0].amount, summary.mrr[0].currency) }}</p>
            <p v-if="summary.mrr.length > 1" class="mrr-others">
              <span v-for="row in summary.mrr.slice(1)" :key="row.currency">{{ money(row.amount, row.currency) }}</span>
            </p>
          </template>
          <p v-else class="mrr-main muted">—</p>
          <p class="note">
            {{ $t('Estimated from plan prices before coupons; it is not what the provider charged.') }}
            <template v-if="summary.dynamicCount">{{ summary.dynamicCount }} {{ $t('subscribers on custom-priced plans are not included.') }}</template>
          </p>

          <div v-if="total" class="status-block">
            <div class="status-bar" role="img" :aria-label="$t('Subscribers by status')">
              <span v-for="segment in segments" :key="segment.status" :class="`seg ${segment.status}`" :style="{ flexGrow: segment.count }" />
            </div>
            <ul class="status-legend">
              <li v-for="segment in segments" :key="segment.status">
                <span :class="`dot ${segment.status}`" aria-hidden="true" />
                {{ STATUS_LABEL[segment.status] }}
                <strong>{{ segment.count.toLocaleString() }}</strong>
              </li>
            </ul>
          </div>
          <p v-else class="note">{{ $t('No subscriptions yet. Subscribers appear here as soon as someone signs up or you attach an account to a plan.') }}</p>
        </section>

        <section class="panel attention" :aria-label="$t('Needs attention')">
          <h2>
            {{ $t('Needs attention') }}
            <span v-if="attentionRows.length" class="count">{{ attentionRows.length }}</span>
          </h2>
          <ul v-if="attentionRows.length" class="attention-list">
            <li v-for="row in attentionRows" :key="row.subscriptionId">
              <el-icon :class="['att-icon', row.status]"><WarningFilled /></el-icon>
              <span class="att-main">
                <strong dir="auto">{{ row.name }}</strong>
                <small>
                  {{ row.status === 'past_due' ? $t('Payment overdue') : $t('Checkout not completed') }} · {{ row.plan }} · {{ row.ago }}
                </small>
              </span>
              <el-button size="small" @click="open(row)">{{ $t('Open') }}</el-button>
            </li>
          </ul>
          <p v-else class="all-clear">
            <el-icon><Check /></el-icon>
            {{ $t('All clear: no failed payments or stuck checkouts.') }}
          </p>
        </section>
      </div>

      <section class="panel plans-panel" :aria-label="$t('Plans')">
        <div class="panel-head">
          <h2>{{ $t('Plans & subscribers') }}</h2>
          <el-button text type="primary" @click="router.push({ name: 'plans-list' })">{{ $t('Manage plans') }}</el-button>
        </div>
        <ul v-if="summary.byPlan.length" class="plan-rows">
          <li v-for="row in summary.byPlan" :key="row.planId">
            <span class="plan-name">{{ planName(row.planId) }}</span>
            <span class="plan-count">{{ row.count.toLocaleString() }}</span>
            <span class="share" aria-hidden="true"><span :style="{ inlineSize: `${planShare(row.count, summary.live)}%` }" /></span>
            <span class="plan-pct">{{ planShare(row.count, summary.live) }}%</span>
          </li>
        </ul>
        <p v-else class="note">
          {{ $t('No live subscribers yet.') }}
          <el-button v-if="!(plans || []).length" text type="primary" @click="router.push({ name: 'createPlan' })">{{ $t('Create your first plan') }}</el-button>
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.pricing-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.action-label {
  margin-inline-start: 6px;
}

.setup {
  padding: 18px 20px;
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 14px;
  background: var(--el-color-warning-light-9);

  h2 {
    margin: 0 0 12px;
    font-size: 16px;
  }

  ol {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
}

.step-mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 24px;
  block-size: 24px;
  border: 2px solid var(--el-color-warning);
  border-radius: 50%;
  color: #fff;
}

.done .step-mark {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary);
}

.step-text {
  display: flex;
  flex: 1 1 200px;
  flex-direction: column;
  min-inline-size: 0;

  small {
    color: var(--el-text-color-regular);
  }
}

.done .step-text strong {
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
}

.top-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.panel {
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);

  h2 {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-regular);
  }
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
  }
}

.mrr-main {
  margin: 0;
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);

  &.muted {
    color: var(--el-text-color-secondary);
  }
}

.mrr-others {
  display: flex;
  gap: 14px;
  margin: 4px 0 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.note {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.status-block {
  margin-block-start: 20px;
}

.status-bar {
  display: flex;
  gap: 3px;
  block-size: 10px;
}

.seg {
  min-inline-size: 6px;
  border-radius: 5px;
}

.status-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--el-text-color-regular);

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  strong {
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }
}

.dot {
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
}

.seg.active,
.dot.active {
  background: var(--el-color-primary);
}

.seg.trialing,
.dot.trialing {
  background: var(--el-color-primary-light-5);
}

.seg.past_due,
.dot.past_due {
  background: var(--el-color-danger);
}

.seg.pending,
.dot.pending {
  background: var(--el-color-warning);
}

.seg.canceled,
.dot.canceled,
.seg.expired,
.dot.expired {
  background: var(--el-border-color-darker);
}

.count {
  margin-inline-start: 6px;
  padding-inline: 8px;
  border-radius: 10px;
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 20px;
}

.attention-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-block: 10px;

    & + li {
      border-block-start: 1px solid var(--el-border-color-extra-light);
    }
  }
}

.att-icon {
  flex: none;
  font-size: 18px;
  color: var(--el-color-warning);

  &.past_due {
    color: var(--el-color-danger);
  }
}

.att-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: var(--el-text-color-secondary);
  }
}

.all-clear {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--el-text-color-regular);

  .el-icon {
    color: var(--el-color-primary);
  }
}

.plan-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: minmax(100px, 1fr) 60px minmax(80px, 2fr) 44px;
    align-items: center;
    gap: 12px;
    font-variant-numeric: tabular-nums;
  }
}

.plan-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-count {
  text-align: end;
}

.share {
  display: block;
  block-size: 8px;
  border-radius: 4px;
  background: var(--el-fill-color);

  span {
    display: block;
    block-size: 100%;
    border-radius: 4px;
    background: var(--el-color-primary);
  }
}

.plan-pct {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: end;
}

@media (max-width: 1000px) {
  .top-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  .pricing-page {
    padding: 12px;
  }

  .mrr-main {
    font-size: 32px;
  }

  .action-label {
    display: none;
  }
}
</style>
