<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { Plus, Search } from '@element-plus/icons-vue';
import type { BillableEntityType, ISubscription, SubscriptionStatus } from '@qelos/global-types';
import subscriptionsService from '@/services/apis/subscriptions-service';
import { formatRelative } from '@/modules/admins/services/event-presentation';
import PricingHeader from '../components/PricingHeader.vue';
import EntityBillingPanel from '../components/EntityBillingPanel.vue';
import AddSubscriberDialog from '../components/AddSubscriberDialog.vue';
import { usePlansStore } from '../store/plans';
import { useCouponsStore } from '../store/coupons';
import { useSubscriptionsSummaryStore } from '../store/summary';
import { useEntityNames } from '../compositions/entity-names';
import { formatMoney, planPrice } from '../services/pricing';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { plans } = storeToRefs(usePlansStore());
useCouponsStore();
const summaryStore = useSubscriptionsSummaryStore();
const { resolve, nameOf } = useEntityNames();

const rows = ref<ISubscription[]>([]);
const loading = ref(true);
const failed = ref(false);

async function load() {
  loading.value = true;
  failed.value = false;
  try {
    rows.value = await subscriptionsService.list();
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}

// the table is too dense for phones: show one card per subscriber instead
const isMobile = ref(false);
let media: MediaQueryList | undefined;
const syncMedia = () => (isMobile.value = !!media?.matches);

onMounted(() => {
  load();
  openFromQuery();
  media = window.matchMedia('(max-width: 768px)');
  syncMedia();
  media.addEventListener('change', syncMedia);
});

onBeforeUnmount(() => media?.removeEventListener('change', syncMedia));

// ---- filters ----
type StatusFilter = 'all' | 'live' | SubscriptionStatus;
const status = ref<StatusFilter>('all');
const type = ref<'all' | BillableEntityType>((route.query.type as BillableEntityType) || 'all');
const planId = ref('');
const search = ref('');
const page = ref(1);
const PAGE_SIZE = 20;

const LIVE = ['active', 'trialing', 'past_due'];
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return rows.value.filter((row) => {
    if (status.value === 'live' ? !LIVE.includes(row.status) : status.value !== 'all' && row.status !== status.value) return false;
    if (type.value !== 'all' && row.billableEntityType !== type.value) return false;
    if (planId.value && String(row.planId) !== planId.value) return false;
    if (term) {
      const name = nameOf(row.billableEntityType, row.billableEntityId).toLowerCase();
      return name.includes(term) || row.billableEntityId.toLowerCase().includes(term);
    }
    return true;
  });
});

const paged = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));
watch([status, type, planId, search], () => (page.value = 1));
watch(
  paged,
  (list) => resolve(list.map((row) => ({ type: row.billableEntityType, id: row.billableEntityId }))),
  { immediate: true },
);

const counts = computed(() => {
  const result: Record<string, number> = { all: rows.value.length, live: 0 };
  for (const row of rows.value) {
    result[row.status] = (result[row.status] || 0) + 1;
    if (LIVE.includes(row.status)) result.live++;
  }
  return result;
});

const chips = computed<{ id: StatusFilter; label: string }[]>(() => [
  { id: 'all', label: t('All') },
  { id: 'live', label: t('Live') },
  { id: 'past_due', label: t('Past due') },
  { id: 'pending', label: t('Pending') },
  { id: 'trialing', label: t('Trial') },
  { id: 'canceled', label: t('Canceled') },
]);

const planOf = (row: ISubscription) => (plans.value || []).find((plan) => plan._id === String(row.planId));
const STATUS_LABEL = computed<Record<string, string>>(() => ({
  active: t('Active'),
  trialing: t('Trial'),
  past_due: t('Past due'),
  pending: t('Pending'),
  canceled: t('Canceled'),
  expired: t('Expired'),
}));
const TONE: Record<string, string> = { active: 'success', trialing: 'warning', pending: 'warning', past_due: 'danger', canceled: 'info', expired: 'info' };

function priceOf(row: ISubscription) {
  const plan = planOf(row);
  if (!plan) return '';
  if (plan.dynamic) return row.dynamicAmount != null ? formatMoney(row.dynamicAmount, plan.currency) : t('Custom');
  return `${formatMoney(planPrice(plan, row.billingCycle), plan.currency)} / ${row.billingCycle === 'yearly' ? t('year') : t('month')}`;
}

const ended = (row: ISubscription) => (row.currentPeriodEnd ? formatRelative(row.currentPeriodEnd, new Date(), locale.value || undefined) : '—');

// ---- account drawer ----
const drawer = ref<{ type: BillableEntityType; id: string } | null>(null);
const drawerOpen = computed({ get: () => !!drawer.value, set: (open) => !open && closeDrawer() });

function openEntity(entityType: BillableEntityType, id: string) {
  drawer.value = { type: entityType, id };
  resolve([{ type: entityType, id }]);
  router.replace({ query: { ...route.query, open: `${entityType}:${id}` } });
}

function closeDrawer() {
  drawer.value = null;
  const { open, ...rest } = route.query;
  router.replace({ query: rest });
}

function openFromQuery() {
  const [entityType, id] = String(route.query.open || '').split(':');
  if ((entityType === 'workspace' || entityType === 'user') && id) {
    drawer.value = { type: entityType, id };
    resolve([{ type: entityType, id }]);
  }
}

function onChanged() {
  load();
  summaryStore.retry();
}

const addOpen = ref(false);
</script>

<template>
  <div class="pricing-page">
    <PricingHeader active="subscribers" :subtitle="$t('Everyone who pays, or is about to, in one place.')">
      <template #actions>
        <el-button type="primary" @click="addOpen = true">
          <el-icon><Plus /></el-icon>
          <span class="action-label">{{ $t('Add subscriber') }}</span>
        </el-button>
      </template>
    </PricingHeader>

    <div class="filters">
      <el-input v-model="search" class="search" clearable :prefix-icon="Search" :placeholder="$t('Search accounts')" :aria-label="$t('Search accounts')" />
      <el-select v-model="type" class="select" :aria-label="$t('Account type')">
        <el-option :label="$t('All accounts')" value="all" />
        <el-option :label="$t('Workspaces')" value="workspace" />
        <el-option :label="$t('Users')" value="user" />
      </el-select>
      <el-select v-model="planId" class="select" clearable :placeholder="$t('Any plan')" :aria-label="$t('Plan')">
        <el-option v-for="plan in plans || []" :key="plan._id" :label="plan.name" :value="plan._id" />
      </el-select>
    </div>

    <div class="chips" role="group" :aria-label="$t('Status')">
      <button
        v-for="chip in chips"
        :key="chip.id"
        type="button"
        class="chip"
        :class="{ active: status === chip.id, danger: chip.id === 'past_due' && counts.past_due }"
        :aria-pressed="status === chip.id"
        @click="status = chip.id"
      >
        {{ chip.label }}
        <span class="chip-count">{{ counts[chip.id] || 0 }}</span>
      </button>
    </div>

    <el-skeleton v-if="loading && !rows.length" :rows="6" animated />

    <el-result v-else-if="failed" icon="warning" :title="$t('Could not load subscribers')">
      <template #extra><el-button type="primary" @click="load">{{ $t('Try again') }}</el-button></template>
    </el-result>

    <el-empty v-else-if="!rows.length" :description="$t('No subscribers yet')">
      <el-button type="primary" @click="addOpen = true">{{ $t('Add subscriber') }}</el-button>
    </el-empty>

    <el-empty v-else-if="!filtered.length" :image-size="80" :description="$t('No subscribers match these filters')" />

    <template v-else>
      <ul v-if="isMobile" class="cards">
        <li v-for="row in paged" :key="row._id">
          <button type="button" class="card" @click="openEntity(row.billableEntityType, row.billableEntityId)">
            <span class="card-top">
              <strong dir="auto">{{ nameOf(row.billableEntityType, row.billableEntityId) }}</strong>
              <el-tag :type="TONE[row.status]" size="small" effect="light">{{ STATUS_LABEL[row.status] }}</el-tag>
            </span>
            <span class="card-meta">
              {{ planOf(row)?.name || '—' }} · {{ priceOf(row) }}
            </span>
            <span class="card-meta">
              {{ row.billableEntityType === 'workspace' ? $t('Workspace') : $t('User') }} · {{ $t('Period ends') }} {{ ended(row) }}
            </span>
          </button>
        </li>
      </ul>

      <el-table v-else :data="paged" class="table" row-key="_id" @row-click="(row) => openEntity(row.billableEntityType, row.billableEntityId)">
        <el-table-column :label="$t('Account')" min-width="200">
          <template #default="{ row }">
            <div class="account">
              <strong dir="auto">{{ nameOf(row.billableEntityType, row.billableEntityId) }}</strong>
              <small>{{ row.billableEntityType === 'workspace' ? $t('Workspace') : $t('User') }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('Plan')" min-width="170">
          <template #default="{ row }">
            <div class="account">
              <strong>{{ planOf(row)?.name || '—' }}</strong>
              <small>{{ priceOf(row) }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('Status')" width="130">
          <template #default="{ row }">
            <el-tag :type="TONE[row.status]" size="small" effect="light">{{ STATUS_LABEL[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('Period ends')" width="150" class-name="hide-mobile">
          <template #default="{ row }">{{ ended(row) }}</template>
        </el-table-column>
        <el-table-column width="90" align="end">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click.stop="openEntity(row.billableEntityType, row.billableEntityId)">{{ $t('Manage') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="filtered.length > PAGE_SIZE"
        v-model:current-page="page"
        class="pager"
        layout="prev, pager, next"
        :page-size="PAGE_SIZE"
        :total="filtered.length"
      />
    </template>

    <el-drawer v-model="drawerOpen" :title="drawer ? nameOf(drawer.type, drawer.id) : ''" size="min(640px, 100vw)" append-to-body destroy-on-close>
      <EntityBillingPanel v-if="drawer" :billable-entity-type="drawer.type" :billable-entity-id="drawer.id" @changed="onChanged" />
    </el-drawer>

    <AddSubscriberDialog v-model="addOpen" @pick="(entity) => openEntity(entity.type, entity.id)" />
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

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.search {
  flex: 1 1 260px;
  min-inline-size: 0;
}

.select {
  inline-size: 180px;
}

.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  min-block-size: 34px;
  padding-inline: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 17px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
  }

  &.danger .chip-count {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
  }
}

.chip-count {
  padding-inline: 6px;
  border-radius: 9px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.table {
  inline-size: 100%;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  overflow: hidden;

  :deep(.el-table__row) {
    cursor: pointer;
  }
}

.account {
  display: flex;
  flex-direction: column;

  small {
    color: var(--el-text-color-secondary);
  }
}

.pager {
  justify-content: center;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  inline-size: 100%;
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.card-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .pricing-page {
    padding: 12px;
  }

  .select {
    flex: 1 1 140px;
  }

  .action-label {
    display: none;
  }

  :deep(.hide-mobile) {
    display: none;
  }
}
</style>
