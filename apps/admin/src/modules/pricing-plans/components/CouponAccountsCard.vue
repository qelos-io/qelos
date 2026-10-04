<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

export interface CouponAccountRow {
  id: string;
  label: string;
  /** Accounts without a subscription cannot hold a coupon. */
  subscriptionId?: string;
  planId?: string;
  planName?: string;
  status?: string;
  usesCoupon: boolean;
}

const props = defineProps<{
  title: string;
  accountLabel: string;
  selectPlaceholder: string;
  addLabel: string;
  emptyText: string;
  rows: CouponAccountRow[];
  /** Plans the coupon is restricted to; empty means all plans. */
  applicablePlanIds: string[];
  loading?: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'add', subscriptionId: string): void;
  (e: 'remove', subscriptionId: string): void;
}>();

const { t } = useI18n();
const selectedId = ref('');

const accountsUsingCoupon = computed(() => props.rows.filter((row) => row.usesCoupon));

function disabledReason(row: CouponAccountRow) {
  if (!row.subscriptionId) return t('no plan');
  if (row.usesCoupon) return t('already using');
  if (props.applicablePlanIds.length && !props.applicablePlanIds.includes(row.planId || '')) {
    return t('plan not applicable');
  }
  return '';
}

const options = computed(() => props.rows.map((row) => ({ row, reason: disabledReason(row) })));

function add() {
  const subscriptionId = props.rows.find((row) => row.id === selectedId.value)?.subscriptionId;
  if (!subscriptionId) return;
  emit('add', subscriptionId);
  selectedId.value = '';
}
</script>

<template>
  <el-card shadow="never" class="coupon-accounts-card" v-loading="loading">
    <template #header>
      <span>{{ title }}</span>
    </template>

    <div class="attach-row">
      <el-select v-model="selectedId" filterable :placeholder="selectPlaceholder" style="width: 100%;">
        <el-option
          v-for="{ row, reason } in options"
          :key="row.id"
          :label="reason ? `${row.label} (${reason})` : row.label"
          :value="row.id"
          :disabled="!!reason"
        />
      </el-select>
      <el-button type="primary" plain :disabled="!selectedId" :loading="saving" @click="add">
        {{ addLabel }}
      </el-button>
    </div>
    <p class="hint">{{ t('Only accounts attached to a pricing plan can use a coupon.') }}</p>

    <el-table v-if="accountsUsingCoupon.length" :data="accountsUsingCoupon" row-key="id" size="small">
      <el-table-column :label="accountLabel" min-width="160">
        <template #default="{ row }">{{ row.label }}</template>
      </el-table-column>
      <el-table-column :label="t('Plan')" min-width="140">
        <template #default="{ row }">{{ row.planName || '—' }}</template>
      </el-table-column>
      <el-table-column :label="t('Status')" width="120">
        <template #default="{ row }">{{ row.status ? t(row.status) : '—' }}</template>
      </el-table-column>
      <el-table-column width="120" align="end">
        <template #default="{ row }">
          <el-button size="small" type="danger" plain :loading="saving" @click="emit('remove', row.subscriptionId)">
            {{ t('Remove') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else :description="emptyText" :image-size="60" />
  </el-card>
</template>

<style scoped>
.coupon-accounts-card {
  margin-block-start: 16px;
}

.attach-row {
  display: flex;
  gap: 8px;
  margin-block-end: 8px;
}

.hint {
  margin-block: 0 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
