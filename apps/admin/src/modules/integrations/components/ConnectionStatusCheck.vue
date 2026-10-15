<template>
  <div v-if="isCheckSupportedKind" class="connection-status-check">
    <div class="connection-status-check-actions">
      <div class="connection-status-check-buttons">
        <el-button
          type="primary"
          plain
          :loading="checking"
          :disabled="!canCheck || checking || checkingStored"
          :aria-label="$t('Test connection')"
          @click="checkConnection"
        >
          <el-icon v-if="!checking" aria-hidden="true">
            <font-awesome-icon :icon="['fas', 'vial']" />
          </el-icon>
          {{ checking ? $t('Testing connection…') : $t('Test connection') }}
        </el-button>
        <el-button
          v-if="sourceId"
          plain
          :loading="checkingStored"
          :disabled="!canCheckStored || checking || checkingStored"
          :aria-label="$t('Check connection')"
          @click="checkStoredConnection"
        >
          <el-icon v-if="!checkingStored" aria-hidden="true">
            <font-awesome-icon :icon="['fas', 'plug']" />
          </el-icon>
          {{ checkingStored ? $t('Checking connection…') : $t('Check connection') }}
        </el-button>
      </div>
      <p v-if="!canCheck && !checking" class="connection-status-hint">
        {{ $t('Fill required fields to test connection') }}
      </p>
      <p v-if="sourceId" class="connection-status-hint">
        {{ $t('Test connection checks the values in this form. Check connection checks the saved credentials.') }}
      </p>
    </div>

    <div v-if="statusBanner" class="connection-status-container">
      <div
        :class="['connection-status', statusBanner.type]"
        role="status"
        aria-live="polite"
        :aria-label="statusBanner.type === 'success' ? $t('Connection verified') : $t('Connection check failed')"
      >
        <el-icon v-if="statusBanner.type === 'success'" aria-hidden="true">
          <font-awesome-icon :icon="['fas', 'check-circle']" />
        </el-icon>
        <el-icon v-else aria-hidden="true">
          <font-awesome-icon :icon="['fas', 'exclamation-circle']" />
        </el-icon>
        <span>{{ statusBanner.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IntegrationSourceKind,
  STATUS_CHECK_SUPPORTED_INTEGRATION_SOURCE_KINDS,
} from '@qelos/global-types';
import { useIntegrationSourceStatus } from '../compositions/use-integration-source-status';

const { t } = useI18n();

const props = defineProps<{
  kind: IntegrationSourceKind | string;
  sourceId?: string;
  formModel: { metadata?: Record<string, unknown> };
  getFormModel?: () => { metadata?: Record<string, unknown> };
  getAuthenticationOverride: () => Record<string, unknown> | undefined;
}>();

const isCheckSupportedKind = computed(() =>
  STATUS_CHECK_SUPPORTED_INTEGRATION_SOURCE_KINDS.includes(props.kind as IntegrationSourceKind),
);

const {
  statusResult,
  checking,
  checkingStored,
  checkConnection,
  checkStoredConnection,
  canCheck,
  canCheckStored,
} = useIntegrationSourceStatus({
  kind: () => props.kind,
  sourceId: () => props.sourceId,
  formModel: props.getFormModel ?? (() => props.formModel),
  getAuthenticationOverride: props.getAuthenticationOverride,
});

const statusBanner = computed(() => {
  if (!statusResult.value) {
    return null;
  }

  const { status, message } = statusResult.value;

  if (status === 'connected') {
    return {
      type: 'success' as const,
      message: message || t('Connection verified'),
    };
  }

  return {
    type: 'error' as const,
    message: message || t('Connection check failed'),
  };
});
</script>

<style scoped>
.connection-status-check {
  margin-block-start: 20px;
  padding-block-start: 20px;
  border-block-start: 1px solid var(--el-border-color-lighter);
}

.connection-status-check-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.connection-status-check-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.connection-status-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.connection-status-container {
  margin-block-start: 12px;
}

.connection-status {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.connection-status.success {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success-dark-2);
}

.connection-status.error {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger-dark-2);
}
</style>
