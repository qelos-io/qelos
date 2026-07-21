import PlatformEvent from '../models/event.js';
import { emitPlatformEvent } from './hook-events.js';

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

export function emitPaymentsProviderFailureEvent(
  tenant: string | undefined,
  providerKind: string,
  operation: string,
  params: {
    status?: number;
    providerResponse?: unknown;
    error: any;
    eventName?: string;
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

    const event = new PlatformEvent({
      tenant,
      source: `payments:${providerKind}`,
      kind: 'provider',
      eventName,
      description,
      metadata: sanitizePaymentsMetadata({
        providerKind,
        operation,
        code: params.error?.code ?? (params.providerResponse as any)?.Status,
        status: params.status ?? params.error?.status,
        providerResponse: params.providerResponse,
        error: serializePaymentsError(params.error),
      }),
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
