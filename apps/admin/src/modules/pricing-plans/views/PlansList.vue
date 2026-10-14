<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, ArrowUp, Check, MoreFilled, Plus } from '@element-plus/icons-vue';
import type { IPlan } from '@qelos/global-types';
import plansService from '@/services/apis/plans-service';
import PricingHeader from '../components/PricingHeader.vue';
import { usePlansStore } from '../store/plans';
import { useSubscriptionsSummaryStore } from '../store/summary';
import { buildComparison, reorderPlans } from '../services/pricing-overview';
import { formatMoney, getYearlySavingPercent } from '../services/pricing';

const { t } = useI18n();
const router = useRouter();
const plansStore = usePlansStore();
const { plans, loading } = storeToRefs(plansStore);
const summaryStore = useSubscriptionsSummaryStore();
const { summary } = storeToRefs(summaryStore);

const view = ref<'cards' | 'compare'>('cards');
const cycle = ref<'monthly' | 'yearly'>('monthly');

const sortedPlans = computed(() => [...(plans.value || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
const comparison = computed(() => buildComparison(sortedPlans.value));
const subscribers = (plan: IPlan) => summary.value?.byPlan.find((row) => row.planId === plan._id)?.count ?? 0;

function price(plan: IPlan) {
  if (plan.dynamic) return t('Custom');
  return formatMoney(cycle.value === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice, plan.currency);
}

const edit = (plan: IPlan) => router.push({ name: 'editPlan', params: { planId: plan._id } });

async function toggleActive(plan: IPlan) {
  try {
    await plansStore.update(plan._id as string, { isActive: !plan.isActive });
    ElMessage.success(t(plan.isActive ? 'Plan deactivated' : 'Plan activated'));
  } catch {
    ElMessage.error(t('Failed to update plan'));
  }
}

async function move(plan: IPlan, direction: -1 | 1) {
  const updates = reorderPlans(sortedPlans.value, plan._id as string, direction);
  if (!updates.length) return;
  try {
    await Promise.all(updates.map((update) => plansService.update(update._id, { sortOrder: update.sortOrder })));
    await plansStore.retry();
  } catch {
    ElMessage.error(t('Failed to update plan'));
  }
}

async function remove(plan: IPlan) {
  try {
    await ElMessageBox.confirm(
      subscribers(plan)
        ? t('This plan has {count} live subscribers. Deactivate it instead of deleting it.', { count: subscribers(plan) })
        : t('Are you sure you want to delete the plan "{name}"?', { name: plan.name }),
      t('Delete Plan'),
      { confirmButtonText: t('Delete'), cancelButtonText: t('Cancel'), type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await plansStore.remove(plan._id as string);
    ElMessage.success(t('Plan deleted'));
  } catch (e: any) {
    ElMessage.error(
      e?.response?.status === 409
        ? t('This plan has subscriptions and cannot be deleted. Deactivate it instead.')
        : t('Failed to delete plan'),
    );
  }
}
</script>

<template>
  <div class="pricing-page">
    <PricingHeader active="plans" :subtitle="$t('What customers can buy, and who is on each plan.')">
      <template #actions>
        <el-button type="primary" @click="router.push({ name: 'createPlan' })">
          <el-icon><Plus /></el-icon>
          <span class="action-label">{{ $t('Create Plan') }}</span>
        </el-button>
      </template>
    </PricingHeader>

    <div v-if="sortedPlans.length" class="toolbar">
      <el-segmented v-model="view" :options="[{ label: $t('Cards'), value: 'cards' }, { label: $t('Compare'), value: 'compare' }]" :aria-label="$t('View')" />
      <el-segmented v-if="view === 'cards'" v-model="cycle" :options="[{ label: $t('Monthly'), value: 'monthly' }, { label: $t('Yearly'), value: 'yearly' }]" :aria-label="$t('Billing')" />
    </div>

    <el-skeleton v-if="loading && !sortedPlans.length" :rows="5" animated />

    <el-empty v-else-if="!sortedPlans.length" :description="$t('No pricing plans yet')">
      <el-button type="primary" @click="router.push({ name: 'createPlan' })">{{ $t('Create your first plan') }}</el-button>
    </el-empty>

    <ul v-else-if="view === 'cards'" class="plan-grid">
      <li v-for="(plan, index) in sortedPlans" :key="plan._id" class="plan" :class="{ inactive: !plan.isActive }">
        <header class="plan-head">
          <h2>{{ plan.name }}</h2>
          <el-tag v-if="!plan.isActive" size="small" type="info" effect="plain">{{ $t('Inactive') }}</el-tag>
          <el-tag v-if="plan.dynamic" size="small" effect="plain">{{ $t('Dynamic') }}</el-tag>
          <el-dropdown trigger="click" @command="(c) => (c === 'edit' ? edit(plan) : c === 'toggle' ? toggleActive(plan) : remove(plan))">
            <el-button text circle :aria-label="`${$t('Actions')}: ${plan.name}`"><el-icon><MoreFilled /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">{{ $t('Edit') }}</el-dropdown-item>
                <el-dropdown-item command="toggle">{{ plan.isActive ? $t('Deactivate') : $t('Activate') }}</el-dropdown-item>
                <el-dropdown-item command="delete" divided class="danger-item">{{ $t('Delete') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </header>

        <p class="plan-price">
          <strong>{{ price(plan) }}</strong>
          <small v-if="!plan.dynamic">/ {{ cycle === 'yearly' ? $t('year') : $t('month') }}</small>
          <el-tag v-if="cycle === 'yearly' && getYearlySavingPercent(plan)" size="small" type="success" effect="plain">
            −{{ getYearlySavingPercent(plan) }}%
          </el-tag>
        </p>
        <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>

        <ul v-if="plan.features?.length" class="features">
          <li v-for="feature in plan.features.slice(0, 5)" :key="feature"><el-icon><Check /></el-icon>{{ feature }}</li>
          <li v-if="plan.features.length > 5" class="more">+{{ plan.features.length - 5 }} {{ $t('more') }}</li>
        </ul>

        <footer class="plan-foot">
          <span class="subs">
            <strong>{{ subscribers(plan).toLocaleString() }}</strong> {{ $t('subscribers') }}
          </span>
          <span class="order">
            <el-button text circle size="small" :disabled="index === 0" :aria-label="$t('Move earlier')" @click="move(plan, -1)"><el-icon><ArrowUp /></el-icon></el-button>
            <el-button text circle size="small" :disabled="index === sortedPlans.length - 1" :aria-label="$t('Move later')" @click="move(plan, 1)"><el-icon><ArrowDown /></el-icon></el-button>
          </span>
          <el-button size="small" @click="edit(plan)">{{ $t('Edit') }}</el-button>
        </footer>
      </li>
    </ul>

    <div v-else class="compare-wrap">
      <table class="compare">
        <thead>
          <tr>
            <th scope="col" />
            <th v-for="plan in sortedPlans" :key="plan._id" scope="col">
              {{ plan.name }}
              <small>{{ plan.dynamic ? $t('Custom') : `${formatMoney(plan.monthlyPrice, plan.currency)} / ${$t('month')}` }}</small>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in comparison.limits" :key="row.key">
            <th scope="row">{{ row.key }}</th>
            <td v-for="(value, i) in row.values" :key="i">{{ value === true ? '✓' : value ?? '—' }}</td>
          </tr>
          <tr v-for="row in comparison.features" :key="row.feature">
            <th scope="row">{{ row.feature }}</th>
            <td v-for="(has, i) in row.plans" :key="i" :class="{ yes: has }">
              <el-icon v-if="has"><Check /></el-icon>
              <span v-else aria-label="–">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pricing-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.action-label {
  margin-inline-start: 6px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plan {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);

  &.inactive {
    opacity: 0.7;
    border-style: dashed;
  }
}

.plan-head {
  display: flex;
  align-items: center;
  gap: 8px;

  h2 {
    flex: 1;
    min-inline-size: 0;
    margin: 0;
    overflow: hidden;
    font-size: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  font-variant-numeric: tabular-nums;

  strong {
    font-size: 26px;
    color: var(--el-text-color-primary);
  }

  small {
    color: var(--el-text-color-secondary);
  }
}

.plan-description {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--el-text-color-regular);
}

.features {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 14px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .el-icon {
    color: var(--el-color-primary);
  }

  .more {
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }
}

.plan-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block-start: auto;
  padding-block-start: 14px;
  border-block-start: 1px solid var(--el-border-color-extra-light);
}

.subs {
  flex: 1;
  font-size: 13px;
  color: var(--el-text-color-secondary);

  strong {
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
  }
}

.order {
  display: inline-flex;
}

:deep(.danger-item) {
  color: var(--el-color-danger);
}

.compare-wrap {
  overflow-x: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);
}

.compare {
  inline-size: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th,
  td {
    padding: 12px 16px;
    border-block-end: 1px solid var(--el-border-color-extra-light);
    text-align: center;
  }

  thead th {
    font-size: 15px;
    vertical-align: bottom;

    small {
      display: block;
      font-weight: 400;
      color: var(--el-text-color-secondary);
    }
  }

  tbody th {
    text-align: start;
    font-weight: 500;
  }

  td.yes .el-icon {
    color: var(--el-color-primary);
  }

  tr:last-child > * {
    border-block-end: 0;
  }
}

@media (max-width: 768px) {
  .pricing-page {
    padding: 12px;
  }

  .action-label {
    display: none;
  }
}
</style>
