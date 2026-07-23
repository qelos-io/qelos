import fetch from 'node-fetch';
import {
  extractSumitProviderError,
  IntegrationSourceKind,
  IIntegrationSourceStatusResult,
  PAYMENT_INTEGRATION_SOURCE_KINDS,
  sanitizeProviderErrorBody,
} from '@qelos/global-types';
import httpAgent from './http-agent.js';
import { checkPayPalStatus } from './paypal-api.js';
import { checkSumitStatus } from './sumit-api.js';

type StatusCheckParams = {
  tenant: string;
  kind: IntegrationSourceKind;
  metadata: Record<string, unknown>;
  authentication?: Record<string, unknown>;
};

function buildStatusResult(
  kind: IntegrationSourceKind,
  status: IIntegrationSourceStatusResult['status'],
  message: string,
  details?: Record<string, unknown>,
): IIntegrationSourceStatusResult {
  return {
    status,
    message,
    kind,
    checkedAt: new Date().toISOString(),
    ...(details ? { details } : {}),
  };
}

function missingCredentialsError(message: string, code: string) {
  const error: any = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

export function resolveStatusAuthentication(
  storedAuth: Record<string, unknown> | null | undefined,
  bodyAuth: Record<string, unknown> | null | undefined,
  kind: IntegrationSourceKind,
): Record<string, unknown> {
  const merged = { ...(storedAuth || {}) };

  if (bodyAuth) {
    for (const [key, value] of Object.entries(bodyAuth)) {
      if (value !== undefined && value !== null && value !== '') {
        merged[key] = value;
      }
    }
  }

  if (
    kind === IntegrationSourceKind.Sumit
    || kind === IntegrationSourceKind.Paddle
    || kind === IntegrationSourceKind.N8n
  ) {
    const apiKey = merged.apiKey ?? merged.apikey;
    if (apiKey !== undefined) {
      merged.apiKey = apiKey;
      delete merged.apikey;
    }
  }

  return merged;
}

function sanitizeStatusDetails(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replace(/[_-]/g, '').toLowerCase();
    if (
      normalized === 'credentials'
      || normalized === 'apikey'
      || normalized === 'companyid'
      || normalized === 'authorization'
      || normalized === 'clientsecret'
      || normalized === 'accesstoken'
      || normalized === 'password'
      || normalized === 'secret'
    ) {
      continue;
    }

    sanitized[key] = nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)
      ? sanitizeStatusDetails(nestedValue)
      : nestedValue;
  }

  return sanitized;
}

function providerFailureMessage(error: any, fallback: string): string {
  const responseBody = error?.responseBody;
  if (responseBody && typeof responseBody === 'object') {
    const sanitized = sanitizeProviderErrorBody(responseBody);
    const message = sanitized?.message ?? sanitized?.error ?? sanitized?.UserErrorMessage;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function checkPaddleStatus(params: {
  metadata: Record<string, unknown>;
  authentication: Record<string, unknown>;
}): Promise<{ environment: string; productCount?: number }> {
  const environment = params.metadata.environment === 'live' ? 'live' : 'sandbox';
  const apiKey = params.authentication.apiKey as string | undefined;

  if (!apiKey) {
    throw missingCredentialsError('Missing API key for Paddle integration', 'MISSING_PADDLE_CREDENTIALS');
  }

  const baseUrl = environment === 'live'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';
  const url = new URL('/products', baseUrl);
  url.searchParams.set('page[size]', '1');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    agent: httpAgent,
  });

  let responseBody: any = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const error: any = new Error(
      `Paddle API request failed with status ${response.status}: ${JSON.stringify(responseBody)}`,
    );
    error.status = response.status;
    error.responseBody = responseBody;
    throw error;
  }

  const products = Array.isArray(responseBody?.data) ? responseBody.data : undefined;

  return {
    environment,
    ...(products ? { productCount: products.length } : {}),
  };
}

async function checkDodoPaymentsStatus(params: {
  metadata: Record<string, unknown>;
  authentication: Record<string, unknown>;
}): Promise<{ environment: string; productCount?: number }> {
  const environment = params.metadata.environment === 'live' ? 'live' : 'test';
  const apiKey = params.authentication.apiKey as string | undefined;

  if (!apiKey) {
    throw missingCredentialsError('Missing API key for DodoPayments integration', 'MISSING_DODO_PAYMENTS_CREDENTIALS');
  }

  const baseUrl = environment === 'live'
    ? 'https://live.dodopayments.com'
    : 'https://test.dodopayments.com';
  const url = new URL('/products', baseUrl);
  url.searchParams.set('page', '1');
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    agent: httpAgent,
  });

  let responseBody: any = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const error: any = new Error(
      `DodoPayments API request failed with status ${response.status}: ${JSON.stringify(responseBody)}`,
    );
    error.status = response.status;
    error.responseBody = responseBody;
    throw error;
  }

  const products = Array.isArray(responseBody?.data)
    ? responseBody.data
    : Array.isArray(responseBody?.products)
      ? responseBody.products
      : undefined;

  return {
    environment,
    ...(products ? { productCount: products.length } : {}),
  };
}

async function checkSumitIntegrationStatus(
  kind: IntegrationSourceKind,
  metadata: Record<string, unknown>,
  authentication: Record<string, unknown>,
): Promise<IIntegrationSourceStatusResult> {
  const companyId = metadata.companyId;
  const apiKey = authentication.apiKey as string | undefined;

  if (companyId == null || companyId === '' || !apiKey) {
    throw missingCredentialsError(
      'Missing API key or Company ID for Sumit integration',
      'MISSING_SUMIT_CREDENTIALS',
    );
  }

  try {
    const details = await checkSumitStatus({
      companyId: companyId as string | number,
      apiKey,
    });

    return buildStatusResult(
      kind,
      'connected',
      'Sumit connection verified',
      details,
    );
  } catch (error: any) {
    if (error?.code === 'INVALID_SUMIT_COMPANY_ID') {
      return buildStatusResult(kind, 'failed', error.message);
    }

    const providerError = extractSumitProviderError(error?.responseBody);
    const message = providerError?.UserErrorMessage as string
      ?? providerError?.TechnicalErrorDetails as string
      ?? providerFailureMessage(error, 'Sumit connection check failed');

    return buildStatusResult(kind, 'failed', message, providerError ?? undefined);
  }
}

async function checkPayPalIntegrationStatus(
  kind: IntegrationSourceKind,
  metadata: Record<string, unknown>,
  authentication: Record<string, unknown>,
): Promise<IIntegrationSourceStatusResult> {
  const clientId = metadata.clientId as string | undefined;
  const clientSecret = authentication.clientSecret as string | undefined;
  const environment = metadata.environment === 'live' ? 'live' : 'sandbox';

  if (!clientId || !clientSecret) {
    throw missingCredentialsError(
      'Missing client ID or client secret for PayPal integration',
      'MISSING_PAYPAL_CREDENTIALS',
    );
  }

  try {
    const details = await checkPayPalStatus({
      metadata: { clientId, environment },
      authentication: { clientSecret },
    });

    return buildStatusResult(
      kind,
      'connected',
      'PayPal connection verified',
      details,
    );
  } catch (error: any) {
    const sanitized = sanitizeStatusDetails(error?.responseBody);
    return buildStatusResult(
      kind,
      'failed',
      providerFailureMessage(error, 'PayPal connection check failed'),
      sanitized,
    );
  }
}

async function checkPaddleIntegrationStatus(
  kind: IntegrationSourceKind,
  metadata: Record<string, unknown>,
  authentication: Record<string, unknown>,
): Promise<IIntegrationSourceStatusResult> {
  try {
    const details = await checkPaddleStatus({ metadata, authentication });

    return buildStatusResult(
      kind,
      'connected',
      'Paddle connection verified',
      details,
    );
  } catch (error: any) {
    if (error?.code === 'MISSING_PADDLE_CREDENTIALS') {
      throw error;
    }

    const sanitized = sanitizeStatusDetails(error?.responseBody?.error ?? error?.responseBody);
    return buildStatusResult(
      kind,
      'failed',
      providerFailureMessage(error, 'Paddle connection check failed'),
      sanitized,
    );
  }
}

async function checkDodoPaymentsIntegrationStatus(
  kind: IntegrationSourceKind,
  metadata: Record<string, unknown>,
  authentication: Record<string, unknown>,
): Promise<IIntegrationSourceStatusResult> {
  try {
    const details = await checkDodoPaymentsStatus({ metadata, authentication });

    return buildStatusResult(
      kind,
      'connected',
      'DodoPayments connection verified',
      details,
    );
  } catch (error: any) {
    if (error?.code === 'MISSING_DODO_PAYMENTS_CREDENTIALS') {
      throw error;
    }

    const sanitized = sanitizeStatusDetails(error?.responseBody);
    return buildStatusResult(
      kind,
      'failed',
      providerFailureMessage(error, 'DodoPayments connection check failed'),
      sanitized,
    );
  }
}

export async function checkIntegrationSourceStatus(
  params: StatusCheckParams,
): Promise<IIntegrationSourceStatusResult> {
  const { kind, metadata, authentication = {} } = params;

  if (!PAYMENT_INTEGRATION_SOURCE_KINDS.includes(kind)) {
    return buildStatusResult(
      kind,
      'unsupported',
      `Status checks are not supported for ${kind} integration sources yet`,
    );
  }

  switch (kind) {
    case IntegrationSourceKind.Sumit:
      return checkSumitIntegrationStatus(kind, metadata, authentication);
    case IntegrationSourceKind.PayPal:
      return checkPayPalIntegrationStatus(kind, metadata, authentication);
    case IntegrationSourceKind.Paddle:
      return checkPaddleIntegrationStatus(kind, metadata, authentication);
    case IntegrationSourceKind.DodoPayments:
      return checkDodoPaymentsIntegrationStatus(kind, metadata, authentication);
    default:
      return buildStatusResult(
        kind,
        'unsupported',
        `Status checks are not supported for ${kind} integration sources yet`,
      );
  }
}
