import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import {
  IntegrationSourceKind,
  IIntegrationSourceStatusResult,
  PAYMENT_INTEGRATION_SOURCE_KINDS,
} from '@qelos/global-types';
import integrationSourcesService from '@/services/apis/integration-sources-service';

interface IntegrationSourceStatusFormModel {
  metadata?: Record<string, unknown>;
}

interface UseIntegrationSourceStatusOptions {
  kind: MaybeRefOrGetter<IntegrationSourceKind | string>;
  sourceId?: MaybeRefOrGetter<string | undefined>;
  formModel: MaybeRefOrGetter<IntegrationSourceStatusFormModel>;
  getAuthenticationOverride: () => Record<string, unknown> | undefined;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value != null && value !== '';
}

function buildAuthenticationPayload(
  authentication?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!authentication) {
    return undefined;
  }

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(authentication)) {
    if (value !== undefined && value !== null && value !== '') {
      payload[key] = value;
    }
  }

  return Object.keys(payload).length ? payload : undefined;
}

function isPaymentKind(kind: IntegrationSourceKind | string): kind is IntegrationSourceKind {
  return PAYMENT_INTEGRATION_SOURCE_KINDS.includes(kind as IntegrationSourceKind);
}

function hasRequiredMetadata(
  kind: IntegrationSourceKind,
  metadata: Record<string, unknown> = {},
): boolean {
  switch (kind) {
    case IntegrationSourceKind.Sumit:
      return hasNonEmptyString(metadata.companyId);
    case IntegrationSourceKind.PayPal:
      return hasNonEmptyString(metadata.clientId);
    case IntegrationSourceKind.Paddle:
    case IntegrationSourceKind.DodoPayments:
      return true;
    default:
      return false;
  }
}

function hasRequiredAuthentication(
  kind: IntegrationSourceKind,
  authentication: Record<string, unknown> | undefined,
  isEdit: boolean,
): boolean {
  if (isEdit) {
    return true;
  }

  if (!authentication) {
    return false;
  }

  switch (kind) {
    case IntegrationSourceKind.Sumit:
      return hasNonEmptyString(authentication.apiKey);
    case IntegrationSourceKind.PayPal:
      return hasNonEmptyString(authentication.clientSecret);
    case IntegrationSourceKind.Paddle:
    case IntegrationSourceKind.DodoPayments:
      return hasNonEmptyString(authentication.apiKey);
    default:
      return false;
  }
}

export function useIntegrationSourceStatus(options: UseIntegrationSourceStatusOptions) {
  const statusResult = ref<IIntegrationSourceStatusResult | null>(null);
  const checking = ref(false);
  const checkingStored = ref(false);

  const resolvedKind = computed(() => toValue(options.kind) as IntegrationSourceKind);
  const resolvedSourceId = computed(() => toValue(options.sourceId));
  const isEdit = computed(() => !!resolvedSourceId.value);

  const canCheck = computed(() => {
    const kind = resolvedKind.value;
    if (!isPaymentKind(kind)) {
      return false;
    }

    const metadata = toValue(options.formModel)?.metadata ?? {};
    const authentication = buildAuthenticationPayload(options.getAuthenticationOverride());

    return hasRequiredMetadata(kind, metadata)
      && hasRequiredAuthentication(kind, authentication, isEdit.value);
  });

  async function checkConnection() {
    if (!canCheck.value || checking.value) {
      return;
    }

    const kind = resolvedKind.value;
    const metadata = { ...(toValue(options.formModel)?.metadata ?? {}) };
    const authentication = buildAuthenticationPayload(options.getAuthenticationOverride());

    checking.value = true;
    statusResult.value = null;

    try {
      if (isEdit.value) {
        statusResult.value = await integrationSourcesService.checkStatus(resolvedSourceId.value!, {
          metadata,
          ...(authentication ? { authentication } : {}),
        });
      } else {
        statusResult.value = await integrationSourcesService.checkDraftStatus({
          kind,
          metadata,
          ...(authentication ? { authentication } : {}),
        });
      }
    } catch (error: any) {
      const responseData = error?.response?.data;
      statusResult.value = {
        status: 'failed',
        message: responseData?.message || error?.message || 'Connection check failed',
        kind,
        checkedAt: new Date().toISOString(),
        ...(responseData?.adminSuggestions
          ? { details: { adminSuggestions: responseData.adminSuggestions } }
          : {}),
      };
    } finally {
      checking.value = false;
    }
  }

  const canCheckStored = computed(() => isPaymentKind(resolvedKind.value) && isEdit.value);

  async function checkStoredConnection() {
    if (!canCheckStored.value || checking.value || checkingStored.value) {
      return;
    }

    checkingStored.value = true;
    statusResult.value = null;

    try {
      statusResult.value = await integrationSourcesService.checkStatus(resolvedSourceId.value!);
    } catch (error: any) {
      const responseData = error?.response?.data;
      statusResult.value = {
        status: 'failed',
        message: responseData?.message || error?.message || 'Connection check failed',
        kind: resolvedKind.value,
        checkedAt: new Date().toISOString(),
        ...(responseData?.adminSuggestions
          ? { details: { adminSuggestions: responseData.adminSuggestions } }
          : {}),
      };
    } finally {
      checkingStored.value = false;
    }
  }

  return {
    statusResult,
    checking,
    checkingStored,
    checkConnection,
    checkStoredConnection,
    canCheck,
    canCheckStored,
  };
}
