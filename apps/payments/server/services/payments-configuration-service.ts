import { service } from '@qelos/api-kit';
import type { IPaymentsConfigurationMetadata } from '@qelos/global-types';

const callContentService = service('CONTENT', { port: process.env.CONTENT_SERVICE_PORT || 9001 });
const internalSecret = process.env.INTERNAL_SECRET || '';
const PAYMENTS_CONFIG_KEY = 'payments-configuration';

function internalHeaders(tenant: string) {
  return { tenant, internal_secret: internalSecret };
}

function extractConfigurationMetadata(responseData: any): IPaymentsConfigurationMetadata | null {
  if (!responseData || typeof responseData !== 'object') {
    return null;
  }

  if (responseData.metadata && typeof responseData.metadata === 'object') {
    return responseData.metadata as IPaymentsConfigurationMetadata;
  }

  if (responseData.value && typeof responseData.value === 'object') {
    return responseData.value as IPaymentsConfigurationMetadata;
  }

  if (!responseData.key) {
    return responseData as IPaymentsConfigurationMetadata;
  }

  return null;
}

function normalizeOptionalUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function validateRedirectUrl(value: string | undefined, field: 'successUrl' | 'cancelUrl') {
  if (!value) {
    return;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`${field} must use http or https`);
    }
  } catch {
    throw { code: 'INVALID_PAYMENTS_CONFIGURATION', message: `${field} must be a valid absolute URL` };
  }
}

export function normalizePaymentsConfigurationMetadata(
  metadata: Partial<IPaymentsConfigurationMetadata> = {},
): IPaymentsConfigurationMetadata {
  const paymentSourceId = metadata.paymentSourceId || metadata.providerSourceId;
  const normalized: IPaymentsConfigurationMetadata = {
    ...metadata,
    isEnabled: metadata.isEnabled ?? false,
    defaultCurrency: metadata.defaultCurrency ?? 'USD',
    gracePeriodDays: metadata.gracePeriodDays ?? 3,
    successUrl: normalizeOptionalUrl(metadata.successUrl),
    cancelUrl: normalizeOptionalUrl(metadata.cancelUrl),
  };

  if (paymentSourceId) {
    normalized.paymentSourceId = paymentSourceId;
    normalized.providerSourceId = paymentSourceId;
  }

  validateRedirectUrl(normalized.successUrl, 'successUrl');
  validateRedirectUrl(normalized.cancelUrl, 'cancelUrl');

  return normalized;
}

export async function getPaymentsConfigurationRecord(tenant: string): Promise<{
  key: string;
  metadata: IPaymentsConfigurationMetadata;
} | null> {
  try {
    const response = await callContentService({
      method: 'GET',
      url: `/internal-api/configurations/${PAYMENTS_CONFIG_KEY}`,
      headers: internalHeaders(tenant),
    });
    const metadata = extractConfigurationMetadata(response.data);
    if (!metadata) {
      return null;
    }

    return {
      key: PAYMENTS_CONFIG_KEY,
      metadata: normalizePaymentsConfigurationMetadata(metadata),
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function upsertPaymentsConfiguration(
  tenant: string,
  changes: Partial<IPaymentsConfigurationMetadata>,
): Promise<{ key: string; metadata: IPaymentsConfigurationMetadata }> {
  const existing = await getPaymentsConfigurationRecord(tenant);
  const metadata = normalizePaymentsConfigurationMetadata({
    ...(existing?.metadata || {}),
    ...changes,
  });

  if (existing) {
    await callContentService({
      method: 'PUT',
      url: `/internal-api/configurations/${PAYMENTS_CONFIG_KEY}`,
      headers: internalHeaders(tenant),
      data: { metadata },
    });
  } else {
    await callContentService({
      method: 'POST',
      url: '/internal-api/configurations',
      headers: internalHeaders(tenant),
      data: {
        key: PAYMENTS_CONFIG_KEY,
        metadata,
      },
    });
  }

  return {
    key: PAYMENTS_CONFIG_KEY,
    metadata,
  };
}
