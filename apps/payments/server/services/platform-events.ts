import { emitPlatformEvent, type PlatformEvent } from '@qelos/api-kit';
import {
  appendPaymentProviderContext,
  buildPaymentAdminSuggestions,
  buildPaymentEventDescription,
  extractSumitProviderError,
  type PaymentAdminSuggestion,
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
  providerError?: Record<string, unknown> | null;
  adminSuggestions?: PaymentAdminSuggestion[];
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

  const responseData = error.response?.data ?? error.responseData;
  const providerError = error.providerError
    ?? (error.providerKind === 'sumit' ? extractSumitProviderError(responseData?.providerError ?? responseData) : responseData?.providerError);

  return {
    message: error.message,
    code: error.code,
    type: error.type,
    status: error.status ?? error.response?.status,
    responseData: sanitizeValue(responseData),
    providerError: sanitizeValue(providerError),
    adminSuggestions: error.adminSuggestions,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
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

function resolveAdminSuggestions(params: {
  providerKind?: string;
  operation?: string;
  code?: string;
  error: any;
  providerError?: Record<string, unknown> | null;
}) {
  if (Array.isArray(params.error?.adminSuggestions) && params.error.adminSuggestions.length > 0) {
    return params.error.adminSuggestions;
  }

  return buildPaymentAdminSuggestions({
    providerKind: params.providerKind,
    operation: params.operation,
    code: params.code ?? params.error?.code,
    status: params.error?.status ?? params.error?.response?.status,
    message: params.error?.message,
    providerError: params.providerError,
  });
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
  const providerError = resolveProviderError(params);
  const adminSuggestions = resolveAdminSuggestions({
    providerKind: params.providerKind,
    operation,
    code: params.code,
    error: params.error,
    providerError,
  });
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
      code: params.code ?? params.error?.code,
      planId: params.planId,
      subscriptionId: params.subscriptionId,
      existingSubscriptionId: params.existingSubscriptionId,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      externalSubscriptionId: params.externalSubscriptionId,
      couponCode: params.couponCode,
      providerError,
      adminSuggestions,
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
  const providerError = resolveProviderError(params);
  const adminSuggestions = resolveAdminSuggestions({
    providerKind: params.providerKind,
    operation: params.operation,
    code: params.code,
    error: params.error,
    providerError,
  });

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
      code: params.code ?? params.error?.code,
      subscriptionId: params.subscriptionId,
      planId: params.planId,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      externalSubscriptionId: params.externalSubscriptionId,
      providerResponse: params.providerResponse,
      providerError,
      adminSuggestions,
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
      code: params.code ?? params.error?.code,
      subscriptionId: params.subscriptionId,
      planId: params.planId,
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      externalSubscriptionId: params.externalSubscriptionId,
      externalEventId: params.externalEventId,
      providerResponse: params.providerResponse,
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
      code: params.code ?? params.error?.code,
      externalEventId: params.externalEventId,
      providerResponse: params.providerResponse,
      error: serializeError(params.error),
    }, params.providerContext),
  });
}
