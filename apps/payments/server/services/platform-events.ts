import { emitPlatformEvent, type PlatformEvent } from '@qelos/api-kit';

type BaseEventParams = {
  tenant?: string;
  userId?: string;
};

export type PaymentMetadata = {
  providerKind?: string;
  operation?: string;
  code?: string;
  subscriptionId?: string;
  planId?: string;
  billableEntityType?: string;
  billableEntityId?: string;
  externalSubscriptionId?: string;
  externalEventId?: string;
  couponCode?: string;
  providerResponse?: unknown;
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
    responseData: sanitizeValue(error.response?.data),
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
}

export function sanitizePaymentMetadata(metadata: Record<string, unknown>): PaymentMetadata {
  return sanitizeValue(metadata) as PaymentMetadata;
}

function resolveSource(providerKind?: string) {
  return providerKind ? `payments:${providerKind}` : 'payments';
}

function emitSafePlatformEvent(event: PlatformEvent) {
  try {
    emitPlatformEvent(event);
  } catch (error) {
    console.error('Failed to emit platform event', error);
  }
}

export function emitCheckoutFailedEvent(params: BaseEventParams & {
  providerKind?: string;
  operation?: string;
  code?: string;
  planId?: string;
  subscriptionId?: string;
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
  const description = operation === 'initiateCheckout'
    ? 'Checkout initiation failed'
    : `Checkout ${operation} failed`;

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: resolveSource(params.providerKind),
    kind: 'checkout',
    eventName: 'checkout-failed',
    description,
    metadata: sanitizePaymentMetadata({
      providerKind: params.providerKind,
      operation,
      code: params.code ?? params.error?.code,
      planId: params.planId,
      subscriptionId: params.subscriptionId,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      externalSubscriptionId: params.externalSubscriptionId,
      couponCode: params.couponCode,
      error: serializeError(params.error),
    }),
  });
}

export function emitProviderCallFailedEvent(params: BaseEventParams & {
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

  const description = eventName === 'payment-method-save-failed'
    ? `Failed to save payment method via ${params.providerKind}`
    : eventName === 'payment-failed'
      ? `Payment failed via ${params.providerKind}`
      : `Provider call failed: ${params.operation}`;

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: resolveSource(params.providerKind),
    kind: 'provider',
    eventName,
    description,
    metadata: sanitizePaymentMetadata({
      providerKind: params.providerKind,
      operation: params.operation,
      code: params.code ?? params.error?.code,
      subscriptionId: params.subscriptionId,
      planId: params.planId,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      externalSubscriptionId: params.externalSubscriptionId,
      providerResponse: params.providerResponse,
      error: serializeError(params.error),
    }),
  });
}

export function emitWebhookPaymentFailedEvent(params: BaseEventParams & {
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

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: resolveSource(params.providerKind),
    kind: 'webhook',
    eventName: 'payment-failed',
    description: `Webhook reported payment failure via ${params.providerKind}`,
    metadata: sanitizePaymentMetadata({
      providerKind: params.providerKind,
      operation: 'payment-failed',
      code: params.code ?? params.error?.code,
      subscriptionId: params.subscriptionId,
      planId: params.planId,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      externalSubscriptionId: params.externalSubscriptionId,
      externalEventId: params.externalEventId,
      providerResponse: params.providerResponse,
      error: serializeError(params.error),
    }),
  });
}

export function emitWebhookProcessingFailedEvent(params: BaseEventParams & {
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

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: resolveSource(params.providerKind),
    kind: 'webhook',
    eventName: 'webhook-processing-failed',
    description: params.providerKind
      ? `Webhook processing failed for ${params.providerKind}`
      : 'Webhook processing failed',
    metadata: sanitizePaymentMetadata({
      providerKind: params.providerKind,
      operation: params.operation,
      code: params.code ?? params.error?.code,
      externalEventId: params.externalEventId,
      providerResponse: params.providerResponse,
      error: serializeError(params.error),
    }),
  });
}
