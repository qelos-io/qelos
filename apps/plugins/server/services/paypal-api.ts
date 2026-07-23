import fetch from 'node-fetch';
import httpAgent from './http-agent.js';

export type PayPalEnvironment = 'sandbox' | 'live';

export function getPayPalApiBaseUrl(environment: PayPalEnvironment): string {
  return environment === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function exchangePayPalAccessToken(params: {
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
}): Promise<{ accessToken: string; expiresIn?: number }> {
  const baseUrl = getPayPalApiBaseUrl(params.environment);
  const credentials = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    agent: httpAgent,
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.access_token) {
    const error: any = new Error(`PayPal OAuth token exchange failed: ${JSON.stringify(body)}`);
    error.status = response.status;
    error.responseBody = body;
    throw error;
  }

  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in,
  };
}

export async function checkPayPalStatus(params: {
  metadata: { clientId?: string; environment?: PayPalEnvironment };
  authentication: { clientSecret?: string };
}): Promise<{ environment: PayPalEnvironment; tokenType?: string }> {
  const { clientId, environment = 'sandbox' } = params.metadata;
  const { clientSecret } = params.authentication;

  if (!clientId || !clientSecret) {
    const error: any = new Error('Missing client ID or client secret for PayPal integration');
    error.status = 400;
    error.code = 'MISSING_PAYPAL_CREDENTIALS';
    throw error;
  }

  const { expiresIn } = await exchangePayPalAccessToken({
    clientId,
    clientSecret,
    environment,
  });

  return {
    environment,
    ...(expiresIn != null ? { expiresIn } : {}),
  };
}
