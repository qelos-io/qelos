<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import billingService from '@/services/apis/billing-service';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { storeToRefs } from 'pinia';
import { IntegrationSourceKind } from '@qelos/global-types';
import PricingHeader from '../components/PricingHeader.vue';
import integrationSourcesService from '@/services/apis/integration-sources-service';
import { getSetupSteps, isSetupComplete } from '../services/pricing-overview';
import { usePlansStore } from '../store/plans';

const { t } = useI18n();
const sourcesStore = useIntegrationSourcesStore();
const { result: sources } = storeToRefs(sourcesStore);

const loading = ref(true);
const { plans } = storeToRefs(usePlansStore());
const checking = ref(false);
const connection = ref<{ ok: boolean; message: string } | null>(null);

async function checkConnection() {
  if (!form.paymentSourceId) return;
  checking.value = true;
  connection.value = null;
  try {
    const result = await integrationSourcesService.checkStatus(form.paymentSourceId);
    connection.value = { ok: result.status === 'connected', message: result.message || '' };
  } catch (e: any) {
    connection.value = { ok: false, message: e?.response?.data?.message || t('Could not reach the provider') };
  } finally {
    checking.value = false;
  }
}
const saving = ref(false);

const PAYMENT_KINDS = [IntegrationSourceKind.Paddle, IntegrationSourceKind.PayPal, IntegrationSourceKind.Sumit];

const form = reactive({
  isEnabled: false,
  paymentSourceId: '' as string,
  defaultCurrency: 'USD',
  gracePeriodDays: 3,
  successUrl: '',
  cancelUrl: '',
});

const paymentSources = computed(() =>
  (sources.value || []).filter(s => PAYMENT_KINDS.includes(s.kind))
);

const selectedSource = computed(() =>
  paymentSources.value.find(s => s._id === form.paymentSourceId)
);

const steps = computed(() =>
  getSetupSteps({ isEnabled: form.isEnabled, paymentSourceId: form.paymentSourceId } as any, plans.value || []),
);
const complete = computed(() => isSetupComplete(steps.value));
const remaining = computed(() =>
  steps.value
    .filter((step) => !step.done)
    .map((step) => (step.id === 'provider' ? t('choose a provider') : step.id === 'enabled' ? t('turn payments on') : t('publish a plan'))),
);
const requiresRedirectUrls = computed(() => selectedSource.value?.kind === IntegrationSourceKind.Sumit);

const currencies = ['USD', 'EUR', 'GBP', 'ILS', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];

onMounted(async () => {
  try {
    await sourcesStore.promise;
    const config = await billingService.getPaymentsConfiguration().catch(() => null);
    if (config?.metadata) {
      form.isEnabled = config.metadata.isEnabled ?? false;
      form.paymentSourceId = config.metadata.paymentSourceId ?? config.metadata.providerSourceId ?? '';
      form.defaultCurrency = config.metadata.defaultCurrency ?? 'USD';
      form.gracePeriodDays = config.metadata.gracePeriodDays ?? 3;
      form.successUrl = config.metadata.successUrl ?? '';
      form.cancelUrl = config.metadata.cancelUrl ?? '';
    }
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  try {
    await billingService.updatePaymentsConfiguration({
      isEnabled: form.isEnabled,
      paymentSourceId: form.paymentSourceId,
      defaultCurrency: form.defaultCurrency,
      gracePeriodDays: form.gracePeriodDays,
      successUrl: form.successUrl.trim() || undefined,
      cancelUrl: form.cancelUrl.trim() || undefined,
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
    <PricingHeader active="setup" :subtitle="$t('Connect your payment provider and decide how checkout behaves.')" />

    <div class="readiness" :class="{ ready: complete }" role="status">
      <strong>{{ complete ? $t('Ready to take payments') : $t('Not ready yet') }}</strong>
      <span>
        <template v-if="complete">{{ $t('Provider connected, payments on and at least one active plan.') }}</template>
        <template v-else>
          {{ remaining.length }} {{ $t('steps left') }}: {{ remaining.join(', ') }}
        </template>
      </span>
    </div>

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

        <div v-if="selectedSource" class="check-row">
          <el-button :loading="checking" @click="checkConnection">{{ t('Check connection') }}</el-button>
          <span v-if="connection" class="check-result" :class="{ ok: connection.ok }" role="status">
            {{ connection.ok ? t('Connected') : t('Connection failed') }}<template v-if="connection.message"> · {{ connection.message }}</template>
          </span>
        </div>

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

      <el-card shadow="never" class="form-section">
        <template #header>
          <span>{{ t('Checkout Redirect URLs') }}</span>
        </template>

        <p class="section-hint">
          {{ t('Default URLs used when checkout requests do not pass successUrl or cancelUrl. Required for Sumit checkout.') }}
        </p>

        <el-alert
          v-if="requiresRedirectUrls && (!form.successUrl || !form.cancelUrl)"
          :title="t('Sumit requires both redirect URLs')"
          type="warning"
          :closable="false"
          show-icon
          class="redirect-alert"
        />

        <el-form-item :label="t('Success URL')">
          <el-input
            v-model="form.successUrl"
            dir="ltr"
            :placeholder="t('https://your-app.com/billing/return?status=success')"
          />
        </el-form-item>

        <el-form-item :label="t('Cancel URL')">
          <el-input
            v-model="form.cancelUrl"
            dir="ltr"
            :placeholder="t('https://your-app.com/billing/return?status=cancel')"
          />
        </el-form-item>
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
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  max-inline-size: 820px;
}

.readiness {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 18px;
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 12px;
  background: var(--el-color-warning-light-9);
  font-size: 14px;
}

.readiness.ready {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.check-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-block-start: 14px;
}

.check-result {
  font-size: 13px;
  color: var(--el-color-danger);
}

.check-result.ok {
  color: var(--el-color-primary);
}

.payments-config-page {
  padding: 20px;
  max-width: 800px;
}

.config-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 20px;
}

.section-hint {
  margin: 0 0 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.config-form {
  display: flex;
  flex-direction: column;
}

.form-section {
  margin-top: 16px;
}

.redirect-alert {
  margin-bottom: 16px;
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
