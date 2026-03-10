<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInvoices } from '../compositions/use-billing'
import { BillableEntityType } from '@qelos/global-types'
import { toRef } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  billableEntityType: BillableEntityType
  billableEntityId: string
}>()

const entityType = toRef(props, 'billableEntityType')
const entityId = toRef(props, 'billableEntityId')

const { invoices, loading, loaded } = useInvoices(entityType, entityId)

const statusType = (status: string) => {
  const map: Record<string, string> = {
    paid: 'success',
    pending: 'warning',
    failed: 'danger',
    refunded: 'info',
  }
  return map[status] || 'info'
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount || 0)
}

function formatDate(date: string | Date | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <el-card class="invoice-history-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div>
          <h3>{{ t('Payment History') }}</h3>
          <p class="subtitle">{{ t('Your invoices and payments') }}</p>
        </div>
      </div>
    </template>

    <el-skeleton v-if="loading && !loaded" :rows="4" animated />

    <el-table
      v-else-if="invoices.length > 0"
      :data="invoices"
      style="width: 100%"
      stripe
    >
      <el-table-column :label="t('Date')" prop="created" min-width="120">
        <template #default="{ row }">
          {{ formatDate(row.paidAt || row.created) }}
        </template>
      </el-table-column>

      <el-table-column :label="t('Period')" min-width="180">
        <template #default="{ row }">
          <span v-if="row.periodStart && row.periodEnd">
            {{ formatDate(row.periodStart) }} – {{ formatDate(row.periodEnd) }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column :label="t('Amount')" prop="amount" min-width="100">
        <template #default="{ row }">
          {{ formatCurrency(row.amount, row.currency) }}
        </template>
      </el-table-column>

      <el-table-column :label="t('Status')" prop="status" min-width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small" effect="light">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column :label="t('Invoice')" width="100" align="center">
        <template #default="{ row }">
          <el-button
            v-if="row.invoiceUrl"
            type="primary"
            link
            size="small"
            tag="a"
            :href="row.invoiceUrl"
            target="_blank"
          >
            <font-awesome-icon :icon="['fas', 'download']" />
          </el-button>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-else
      :description="t('No payment history yet')"
      :image-size="100"
    />
  </el-card>
</template>

<style scoped>
.invoice-history-card {
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
</style>
