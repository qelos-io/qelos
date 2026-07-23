import { emitPlatformEvent, type PlatformEvent } from '@qelos/api-kit';
import {
  appendPaymentProviderContext,
  buildPaymentEventDescription,
  extractSumitProviderError,
  resolvePaymentEventDocsUrl,
  type PaymentProviderPublicContext,
} from '@qelos/global-types';

type BaseEventParams = {
  tenant?: string;
  userId?: string;
};

export type PaymentMetadata = {
  providerKind?: string;
  providerSourceId?: string;
  providerPublicAccountId?: string;
  providerEnvironment?: string;
  operation?: string;
  code?: string;
  subscriptionId?: string;
  existingSubscriptionId?: string;
  planId?: string;
  billableEntityType?: string;
  billableEntityId?: string;
  externalSubscriptionId?: string;
  externalEventId?: string;
  couponCode?: string;
  providerResponse?: unknown;
  docsUrl?: string;
  error?: ReturnType<typeof serializeError> | null;
};

const SENSITIVE_KEYS = new Set([
  'credentials',
  'apikey',
  'companyid',
  'webhooksecret',
  'clientsecret',
  'secret',
  'internal_secret',
  'cardnumber',
  'card_number',
  'creditcardnumber',
  'cvv',
  'cvc',
  'securitycode',
  'expirationmonth',
  'expirationyear',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'password',
  'authorization',
]);

function isSensitiveKey(key: string) {
  const normalized = key.replace(/[_-]/g, '').toLowerCase();
  return SENSITIVE_KEYS.has(normalized) || normalized === 'card';
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      continue;
    }
    sanitized[key] = sanitizeValue(nestedValue);
  }
  return sanitized;
}

export function serializeError(error: any) {
  if (!error) {
    return null;
  }

  return {
    message: error.message,
    code: error.code,
    type: error.type,
    status: error.status ?? error.response?.status,
  };
}

function resolveProviderError(params: {
  providerKind?: string;
  error: any;
  providerResponse?: unknown;
}) {
  if (params.error?.providerError) {
    return params.error.providerError as Record<string, unknown>;
  }

  const responseData = params.error?.response?.data ?? params.error?.responseData;
  if (params.providerKind === 'sumit') {
    return extractSumitProviderError(responseData?.providerError ?? responseData ?? params.providerResponse);
  }

  return responseData?.providerError ?? null;
}

type PaymentEventParams = BaseEventParams & {
  providerContext?: PaymentProviderPublicContext;
};

function withPaymentMetadata(
  metadata: Record<string, unknown>,
  providerContext?: PaymentProviderPublicContext,
): PaymentMetadata {
  return sanitizePaymentMetadata(appendPaymentProviderContext(metadata, providerContext)) as PaymentMetadata;
}

export function buildPaymentEventMetadata(
  metadata: Record<string, unknown>,
  providerContext?: PaymentProviderPublicContext,
): PaymentMetadata {
  return withPaymentMetadata(metadata, providerContext);
}

function resolveSource(providerKind?: string) {
  return providerKind ? `payments:${providerKind}` : 'payments';
}

export function sanitizePaymentMetadata(metadata: Record<string, unknown>): PaymentMetadata {
  return sanitizeValue(metadata) as PaymentMetadata;
}

function emitSafePlatformEvent(event: PlatformEvent) {
  try {
    emitPlatformEvent(event);
  } catch (error) {
    console.error('Failed to emit platform event', error);
  }
}

export function emitCheckoutFailedEvent(params: PaymentEventParams & {
  providerKind?: string;
  operation?: string;
  code?: string;
  planId?: string;
  subscriptionId?: string;
  existingSubscriptionId?: string;
  billableEntityType?: string;
  billableEntityId?: string;
  externalSubscriptionId?: string;
  couponCode?: string;
  error: any;
}) {
  if (!params.tenant) {
    return;
  }

  const operation = params.operation ?? 'initiateCheckout';
  const code = params.code ?? params.error?.code;
  const providerError = resolveProviderError(params);
  const description = buildPaymentEventDescription(
    operation === 'initiateCheckout'
      ? 'Checkout initiation failed'
      : `Checkout ${operation} failed`,
    providerError,
  );

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: resolveSource(params.providerKind),
    kind: 'checkout',
    eventName: 'checkout-failed',
    description,
    metadata: withPaymentMetadata({
      providerKind: params.providerKind,
      operation,
      code,
      planId: params.planId,
      subscriptionId: params.subscriptionId,
      existingSubscriptionId: params.existingSubscriptionId,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      externalSubscriptionId: params.externalSubscriptionId,
      couponCode: params.couponCode,
      docsUrl: resolvePaymentEventDocsUrl({
        providerKind: params.providerKind,
        eventName: 'checkout-failed',
        operation,
        code,
      }),
      error: serializeError(params.error),
    }, params.providerContext),
  });
}

export function emitProviderCallFailedEvent(params: PaymentEventParams & {
  providerKind: string;
  operation: string;
  code?: string;
  subscriptionId?: string;
  planId?: string;
  billableEntityType?: string;
  billableEntityId?: string;
  externalSubscriptionId?: string;
  providerResponse?: unknown;
  error: any;
  eventName?: 'provider-call-failed' | 'payment-method-save-failed' | 'payment-failed';
}) {
  if (!params.tenant) {
    return;
  }

  const eventName = params.eventName ?? (
    params.operation === 'setPaymentDetails' ? 'payment-method-save-failed' : 'provider-call-failed'
  );

  const baseDescription = eventName === 'payment-method-save-failed'
    ? `Failed to save payment method via ${params.providerKind}`
    : eventName === 'payment-failed'
      ? `Payment failed via ${params.providerKind}`
      : `Provider call failed: ${params.operation}`;
  const code = params.code ?? params.error?.code;
  const providerError = resolveProviderError(params);

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: resolveSource(params.providerKind),
    kind: 'provider',
    eventName,
    description: buildPaymentEventDescription(baseDescription, providerError),
    metadata: withPaymentMetadata({
      providerKind: params.providerKind,
      operation: params.operation,
      code,
      subscriptionId: params.subscriptionId,
      planId: params.planId,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      externalSubscriptionId: params.externalSubscriptionId,
      providerResponse: params.providerResponse,
      docsUrl: resolvePaymentEventDocsUrl({
        providerKind: params.providerKind,
        eventName,
        operation: params.operation,
        code,
      }),
      error: serializeError(params.error),
    }, params.providerContext),
  });
}

export function emitWebhookPaymentFailedEvent(params: PaymentEventParams & {
  providerKind: string;
  code?: string;
  subscriptionId?: string;
  planId?: string;
  billableEntityType?: string;
  billableEntityId?: string;
  externalSubscriptionId?: string;
  externalEventId?: string;
  providerResponse?: unknown;
  error?: any;
}) {
  if (!params.tenant) {
    return;
  }

  const code = params.code ?? params.error?.code;

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: resolveSource(params.providerKind),
    kind: 'webhook',
    eventName: 'payment-failed',
    description: `Webhook reported payment failure via ${params.providerKind}`,
    metadata: withPaymentMetadata({
      providerKind: params.providerKind,
      operation: 'payment-failed',
      code,
      subscriptionId: params.subscriptionId,
      planId: params.planId,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      externalSubscriptionId: params.externalSubscriptionId,
      externalEventId: params.externalEventId,
      providerResponse: params.providerResponse,
      docsUrl: resolvePaymentEventDocsUrl({
        providerKind: params.providerKind,
        eventName: 'payment-failed',
        operation: 'payment-failed',
        code,
      }),
      error: serializeError(params.error),
    }, params.providerContext),
  });
}

export function emitWebhookProcessingFailedEvent(params: PaymentEventParams & {
  providerKind?: string;
  operation?: string;
  code?: string;
  externalEventId?: string;
  providerResponse?: unknown;
  error: any;
}) {
  if (!params.tenant) {
    return;
  }

  const code = params.code ?? params.error?.code;

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: resolveSource(params.providerKind),
    kind: 'webhook',
    eventName: 'webhook-processing-failed',
    description: params.providerKind
      ? `Webhook processing failed for ${params.providerKind}`
      : 'Webhook processing failed',
    metadata: withPaymentMetadata({
      providerKind: params.providerKind,
      operation: params.operation,
      code,
      externalEventId: params.externalEventId,
      providerResponse: params.providerResponse,
      docsUrl: resolvePaymentEventDocsUrl({
        providerKind: params.providerKind,
        eventName: 'webhook-processing-failed',
        operation: params.operation,
        code,
      }),
      error: serializeError(params.error),
    }, params.providerContext),
  });
}
