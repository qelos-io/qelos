import PlatformEvent from '../models/event.js';
import { emitPlatformEvent } from './hook-events.js';
import {
  appendPaymentProviderContext,
  buildPaymentAdminSuggestions,
  buildPaymentEventDescription,
  extractSumitProviderError,
  resolvePaymentProviderPublicContext,
  type PaymentProviderPublicContext,
} from '@qelos/global-types';

const SENSITIVE_METADATA_KEYS = new Set([
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
  'singleusetoken',
]);

function isSensitiveMetadataKey(key: string) {
  const normalized = key.replace(/[_-]/g, '').toLowerCase();
  return SENSITIVE_METADATA_KEYS.has(normalized) || normalized === 'card';
}

export function sanitizePaymentsMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizePaymentsMetadata);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveMetadataKey(key)) {
      continue;
    }
    sanitized[key] = sanitizePaymentsMetadata(nestedValue);
  }
  return sanitized;
}

export function serializePaymentsError(error: any) {
  if (!error) {
    return null;
  }

  return {
    message: error.message,
    code: error.code,
    type: error.type,
    status: error.status ?? error.response?.status,
    responseData: sanitizePaymentsMetadata(error.responseBody ?? error.response?.data),
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
}

export function buildPaymentsTriggerEventMetadata(
  providerKind: string,
  source: { metadata?: Record<string, unknown>; _id?: { toString(): string } },
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return sanitizePaymentsMetadata(appendPaymentProviderContext(
    metadata,
    resolvePaymentProviderPublicContext(providerKind, source.metadata, source._id?.toString()),
  )) as Record<string, unknown>;
}

export function emitPaymentsProviderFailureEvent(
  tenant: string | undefined,
  providerKind: string,
  operation: string,
  params: {
    status?: number;
    providerResponse?: unknown;
    error: any;
    eventName?: string;
    providerContext?: PaymentProviderPublicContext;
  },
) {
  if (!tenant) {
    return;
  }

  try {
    const eventName = params.eventName ?? (
      operation === 'setPaymentDetails' ? 'payment-method-save-failed' : 'provider-call-failed'
    );

    const description = eventName === 'payment-method-save-failed'
      ? `Failed to save payment method via ${providerKind}`
      : `Provider call failed: ${operation}`;

    const providerResponse = params.providerResponse;
    const providerError = providerKind === 'sumit'
      ? extractSumitProviderError(providerResponse)
      : (providerResponse && typeof providerResponse === 'object'
        ? providerResponse as Record<string, unknown>
        : null);
    const adminSuggestions = buildPaymentAdminSuggestions({
      providerKind,
      operation,
      code: params.error?.code ?? (providerResponse as any)?.Status,
      status: params.status ?? params.error?.status,
      message: params.error?.message,
      providerError,
    });

    const providerContext = params.providerContext
      ?? resolvePaymentProviderPublicContext(providerKind);

    const event = new PlatformEvent({
      tenant,
      source: `payments:${providerKind}`,
      kind: 'provider',
      eventName,
      description: buildPaymentEventDescription(description, providerError),
      metadata: sanitizePaymentsMetadata(appendPaymentProviderContext({
        providerKind,
        operation,
        code: params.error?.code ?? (providerResponse as any)?.Status,
        status: params.status ?? params.error?.status,
        providerResponse,
        providerError,
        adminSuggestions,
        error: serializePaymentsError(params.error),
      }, providerContext)),
    });

    event.save()
      .then(savedEvent => {
        try {
          emitPlatformEvent(savedEvent);
        } catch {
          // ignore
        }
      })
      .catch(() => {});
  } catch {
    // ignore
  }
}
