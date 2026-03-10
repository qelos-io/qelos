<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import configurationsService from '@/services/apis/configurations-service';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { storeToRefs } from 'pinia';
import { IntegrationSourceKind } from '@qelos/global-types';

const { t } = useI18n();
const router = useRouter();
const sourcesStore = useIntegrationSourcesStore();
const { result: sources } = storeToRefs(sourcesStore);

const loading = ref(true);
const saving = ref(false);

const PAYMENT_KINDS = [IntegrationSourceKind.Paddle, IntegrationSourceKind.PayPal, IntegrationSourceKind.Sumit];

const form = reactive({
  isEnabled: false,
  paymentSourceId: '' as string,
  defaultCurrency: 'USD',
  gracePeriodDays: 3,
});

const paymentSources = computed(() =>
  (sources.value || []).filter(s => PAYMENT_KINDS.includes(s.kind))
);

const selectedSource = computed(() =>
  paymentSources.value.find(s => s._id === form.paymentSourceId)
);

const currencies = ['USD', 'EUR', 'GBP', 'ILS', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];

onMounted(async () => {
  try {
    await sourcesStore.promise;
    const config = await configurationsService.getOne('payments-configuration').catch(() => null);
    if (config?.metadata) {
      form.isEnabled = config.metadata.isEnabled ?? false;
      form.paymentSourceId = config.metadata.paymentSourceId ?? '';
      form.defaultCurrency = config.metadata.defaultCurrency ?? 'USD';
      form.gracePeriodDays = config.metadata.gracePeriodDays ?? 3;
    }
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  try {
    await configurationsService.update('payments-configuration', {
      metadata: {
        isEnabled: form.isEnabled,
        paymentSourceId: form.paymentSourceId,
        defaultCurrency: form.defaultCurrency,
        gracePeriodDays: form.gracePeriodDays,
      },
    }).catch(async () => {
      await configurationsService.create({
        key: 'payments-configuration',
        metadata: {
          isEnabled: form.isEnabled,
          paymentSourceId: form.paymentSourceId,
          defaultCurrency: form.defaultCurrency,
          gracePeriodDays: form.gracePeriodDays,
        },
      } as any);
    });
    ElMessage.success(t('Payments configuration saved'));
  } catch {
    ElMessage.error(t('Failed to save configuration'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="payments-config-page" v-loading="loading">
    <div class="config-header">
      <div class="tab-links">
        <router-link :to="{ name: 'pricing-plans' }" class="tab-link">
          <font-awesome-icon :icon="['fas', 'tags']" />
          {{ t('Plans') }}
        </router-link>
        <router-link :to="{ name: 'coupons' }" class="tab-link">
          <font-awesome-icon :icon="['fas', 'ticket']" />
          {{ t('Coupons') }}
        </router-link>
        <router-link :to="{ name: 'paymentsConfiguration' }" class="tab-link active">
          <font-awesome-icon :icon="['fas', 'gear']" />
          {{ t('Configuration') }}
        </router-link>
      </div>
    </div>

    <h2 class="section-title">{{ t('Payments Configuration') }}</h2>

    <el-form label-position="top" size="default" class="config-form">
      <el-card shadow="never">
        <template #header>
          <span>{{ t('General') }}</span>
        </template>

        <el-form-item :label="t('Enable Payments')">
          <el-switch v-model="form.isEnabled" :active-text="t('Enabled')" :inactive-text="t('Disabled')" />
        </el-form-item>

        <el-form-item :label="t('Default Currency')">
          <el-select v-model="form.defaultCurrency" style="width: 160px">
            <el-option v-for="c in currencies" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('Grace Period for Failed Payments')">
          <el-input-number v-model="form.gracePeriodDays" :min="0" :max="30" controls-position="right" />
          <span class="hint">{{ t('days') }}</span>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="form-section">
        <template #header>
          <span>{{ t('Payment Provider') }}</span>
        </template>

        <el-form-item :label="t('Integration Source')">
          <el-select
            v-model="form.paymentSourceId"
            :placeholder="t('Select a payment provider')"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="source in paymentSources"
              :key="source._id"
              :label="`${source.name} (${source.kind})`"
              :value="source._id"
            />
          </el-select>
        </el-form-item>

        <el-alert
          v-if="!paymentSources.length"
          :title="t('No payment providers configured')"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            {{ t('Configure a Paddle, PayPal, or Sumit integration source first.') }}
            <router-link to="/integrations">{{ t('Go to Integrations') }}</router-link>
          </template>
        </el-alert>

        <div v-if="selectedSource" class="source-info">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item :label="t('Provider')">
              <el-tag size="small">{{ selectedSource.kind }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="t('Environment')" v-if="selectedSource.metadata?.environment">
              <el-tag
                size="small"
                :type="selectedSource.metadata.environment === 'sandbox' ? 'warning' : 'success'"
              >
                {{ selectedSource.metadata.environment }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>

      <div class="form-actions">
        <el-button type="primary" @click="save" :loading="saving">
          {{ t('Save Configuration') }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.payments-config-page {
  padding: 20px;
  max-width: 800px;
}

.config-header {
  margin-bottom: 20px;
}

.tab-links {
  display: flex;
  gap: 8px;
}

.tab-link {
  padding: 6px 14px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--el-text-color-regular);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.tab-link:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.tab-link.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 20px;
}

.config-form {
  display: flex;
  flex-direction: column;
}

.form-section {
  margin-top: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-bottom: 40px;
}

.hint {
  margin-inline-start: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.source-info {
  margin-top: 16px;
}
</style>
