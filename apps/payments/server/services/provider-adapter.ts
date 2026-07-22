import { service } from '@qelos/api-kit';
import { emitCheckoutFailedEvent, emitProviderCallFailedEvent } from './platform-events.js';

const callPluginsService = service('PLUGINS', { port: process.env.PLUGINS_SERVICE_PORT || 9006 });
const callContentService = service('CONTENT', { port: process.env.CONTENT_SERVICE_PORT || 9001 });
const internalSecret = process.env.INTERNAL_SECRET || '';

export interface PaymentsConfiguration {
  providerSourceId: string;
  providerKind: string;
  successUrl?: string;
  cancelUrl?: string;
  webhookSecret?: string;
}

export interface CheckoutParams {
  plan: any;
  billingCycle: string;
  billableEntityType: string;
  billableEntityId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResult {
  checkoutUrl?: string;
  clientToken?: string;
  externalSubscriptionId?: string;
  externalOrderId?: string;
  providerData: any;
}

export interface CancelResult {
  success: boolean;
  providerData: any;
}

const PAYMENTS_CONFIG_KEY = 'payments-configuration';

function internalHeaders(tenant: string) {
  return { tenant, internal_secret: internalSecret };
}

function summarizePayload(payload: Record<string, any>) {
  return { keys: Object.keys(payload) };
}

function extractConfigurationMetadata(responseData: any) {
  if (!responseData || typeof responseData !== 'object') {
    return null;
  }

  if (responseData.metadata && typeof responseData.metadata === 'object') {
    return responseData.metadata;
  }

  if (responseData.value && typeof responseData.value === 'object') {
    return responseData.value;
  }

  if (!responseData.key) {
    return responseData;
  }

  return null;
}

function paymentsNotConfiguredError(message: string) {
  return { code: 'PAYMENTS_NOT_CONFIGURED', message };
}

async function resolveProviderKind(tenant: string, sourceId: string): Promise<string | undefined> {
  try {
    const response = await callPluginsService({
      method: 'GET',
      url: `/internal-api/integration-sources/${sourceId}`,
      headers: internalHeaders(tenant),
    });
    return response.data?.kind;
  } catch {
    return undefined;
  }
}

async function callIntegrationSource(
  tenant: string,
  sourceId: string,
  providerKind: string,
  operation: string,
  details: Record<string, any>,
  payload: Record<string, any>,
) {
  try {
    const response = await callPluginsService({
      method: 'POST',
      url: `/internal-api/integration-sources/${sourceId}/trigger`,
      headers: internalHeaders(tenant),
      data: { operation, details, payload },
    });
    return response.data;
  } catch (error) {
    emitProviderCallFailedEvent({
      tenant,
      providerKind,
      operation,
      error,
      providerResponse: { sourceId, payloadSummary: summarizePayload(payload) },
    });
    throw error;
  }
}

export async function getPaymentsConfiguration(tenant: string): Promise<PaymentsConfiguration> {
  let responseData: any;

  try {
    const response = await callContentService({
      method: 'GET',
      url: `/internal-api/configurations/${PAYMENTS_CONFIG_KEY}`,
      headers: internalHeaders(tenant),
    });
    responseData = response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const contentMessage = error.response?.data?.message;
    let configError: { code: string; message: string };

    if (status === 404) {
      configError = paymentsNotConfiguredError(
        `Payments configuration "${PAYMENTS_CONFIG_KEY}" was not found for this tenant. Add it in Admin → Pricing Plans → Configuration.`,
      );
    } else if (status === 401) {
      configError = {
        code: 'PAYMENTS_CONFIG_ACCESS_DENIED',
        message: 'Could not load payments configuration: payments service is not authorized to read tenant configuration',
      };
    } else {
      configError = {
        code: 'PAYMENTS_CONFIG_LOAD_FAILED',
        message: contentMessage
          ? `Could not load payments configuration: ${contentMessage}`
          : `Could not load payments configuration from content service${status ? ` (HTTP ${status})` : ''}`,
      };
    }

    emitProviderCallFailedEvent({
      tenant,
      providerKind: 'unknown',
      operation: 'getPaymentsConfiguration',
      code: configError.code,
      error: { ...configError, status, responseData: contentMessage },
    });
    throw configError;
  }

  const metadata = extractConfigurationMetadata(responseData);
  if (!metadata) {
    const error = paymentsNotConfiguredError(
      `Payments configuration "${PAYMENTS_CONFIG_KEY}" exists but has no metadata. Re-save it in Admin → Pricing Plans → Configuration.`,
    );
    emitProviderCallFailedEvent({
      tenant,
      providerKind: 'unknown',
      operation: 'getPaymentsConfiguration',
      code: error.code,
      error,
    });
    throw error;
  }

  if (metadata.isEnabled === false) {
    const error = paymentsNotConfiguredError(
      'Payments are disabled in payments-configuration. Enable them in Admin → Pricing Plans → Configuration.',
    );
    emitProviderCallFailedEvent({
      tenant,
      providerKind: metadata.providerKind || 'unknown',
      operation: 'getPaymentsConfiguration',
      code: error.code,
      error,
    });
    throw error;
  }

  const providerSourceId = metadata.providerSourceId || metadata.paymentSourceId;
  let providerKind = metadata.providerKind;

  if (providerSourceId && !providerKind) {
    providerKind = await resolveProviderKind(tenant, providerSourceId);
  }

  if (!providerSourceId) {
    const error = paymentsNotConfiguredError(
      'Payments configuration is missing a payment provider integration source. Select a provider in Admin → Pricing Plans → Configuration.',
    );
    emitProviderCallFailedEvent({
      tenant,
      providerKind: 'unknown',
      operation: 'getPaymentsConfiguration',
      code: error.code,
      error,
    });
    throw error;
  }

  if (!providerKind) {
    const error = paymentsNotConfiguredError(
      `Payments configuration references integration source "${providerSourceId}" but the provider type could not be determined. Verify the integration source exists and re-save payments-configuration.`,
    );
    emitProviderCallFailedEvent({
      tenant,
      providerKind: 'unknown',
      operation: 'getPaymentsConfiguration',
      code: error.code,
      error,
    });
    throw error;
  }

  return {
    providerSourceId,
    providerKind,
    successUrl: metadata.successUrl,
    cancelUrl: metadata.cancelUrl,
    webhookSecret: metadata.webhookSecret,
  };
}

async function createPaddleCheckout(tenant: string, sourceId: string, params: CheckoutParams): Promise<CheckoutResult> {
  const externalIds = params.plan.externalIds?.paddle || {};
  const priceId = params.billingCycle === 'monthly' ? externalIds.monthlyPriceId : externalIds.yearlyPriceId;

  if (!priceId) {
    const error = { code: 'MISSING_EXTERNAL_PRICE_ID', message: `No Paddle ${params.billingCycle} price ID configured for this plan` };
    emitCheckoutFailedEvent({
      tenant,
      providerKind: 'paddle',
      code: error.code,
      planId: params.plan._id.toString(),
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      error,
    });
    throw error;
  }

  const result = await callIntegrationSource(tenant, sourceId, 'paddle', 'createSubscription', {}, {
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: {
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      planId: params.plan._id.toString(),
    },
  });

  return {
    checkoutUrl: result?.data?.checkout?.url,
    externalSubscriptionId: result?.data?.id,
    providerData: result,
  };
}

async function createPayPalCheckout(tenant: string, sourceId: string, params: CheckoutParams): Promise<CheckoutResult> {
  const externalIds = params.plan.externalIds?.paypal || {};
  const planId = externalIds.productId;

  if (!planId) {
    const error = { code: 'MISSING_EXTERNAL_PRICE_ID', message: 'No PayPal product ID configured for this plan' };
    emitCheckoutFailedEvent({
      tenant,
      providerKind: 'paypal',
      code: error.code,
      planId: params.plan._id.toString(),
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      error,
    });
    throw error;
  }

  const result = await callIntegrationSource(tenant, sourceId, 'paypal', 'createSubscription', {}, {
    plan_id: planId,
    application_context: {
      return_url: params.successUrl,
      cancel_url: params.cancelUrl,
      brand_name: 'Qelos',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
    },
    custom_id: JSON.stringify({
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      planId: params.plan._id.toString(),
    }),
  });

  const approvalLink = result?.links?.find((l: any) => l.rel === 'approve');
  return {
    checkoutUrl: approvalLink?.href,
    externalSubscriptionId: result?.id,
    providerData: result,
  };
}

async function createDodoPaymentsCheckout(tenant: string, sourceId: string, params: CheckoutParams): Promise<CheckoutResult> {
  const externalIds = params.plan.externalIds?.dodopayments || {};
  const priceId = params.billingCycle === 'monthly' ? externalIds.monthlyPriceId : externalIds.yearlyPriceId;

  if (!priceId) {
    const error = { code: 'MISSING_EXTERNAL_PRICE_ID', message: `No DodoPayments ${params.billingCycle} price ID configured for this plan` };
    emitCheckoutFailedEvent({
      tenant,
      providerKind: 'dodopayments',
      code: error.code,
      planId: params.plan._id.toString(),
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      error,
    });
    throw error;
  }

  const result = await callIntegrationSource(tenant, sourceId, 'dodopayments', 'createSubscription', {}, {
    payment_link: true,
    product_id: priceId,
    quantity: 1,
    metadata: {
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      planId: params.plan._id.toString(),
    },
    customer: params.customerEmail ? { email: params.customerEmail, name: params.customerName } : undefined,
    return_url: params.successUrl,
  });

  return {
    checkoutUrl: result?.payment_link,
    externalSubscriptionId: result?.subscription_id,
    providerData: result,
  };
}

async function createSumitCheckout(tenant: string, sourceId: string, params: CheckoutParams): Promise<CheckoutResult> {
  const result = await callIntegrationSource(tenant, sourceId, 'sumit', 'createRecurringPayment', {}, {
    Amount: params.amount,
    Currency: params.currency,
    Description: params.plan.name,
    RecurringInterval: params.billingCycle === 'monthly' ? 1 : 12,
    RecurringIntervalType: 'month',
    CustomData: JSON.stringify({
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      planId: params.plan._id.toString(),
    }),
  });

  return {
    checkoutUrl: result?.PaymentUrl,
    externalSubscriptionId: result?.RecurringPaymentId?.toString(),
    providerData: result,
  };
}

export async function createCheckout(
  tenant: string,
  sourceId: string,
  providerKind: string,
  params: CheckoutParams,
): Promise<CheckoutResult> {
  switch (providerKind) {
    case 'paddle':
      return createPaddleCheckout(tenant, sourceId, params);
    case 'paypal':
      return createPayPalCheckout(tenant, sourceId, params);
    case 'sumit':
      return createSumitCheckout(tenant, sourceId, params);
    case 'dodopayments':
      return createDodoPaymentsCheckout(tenant, sourceId, params);
    default: {
      const error = { code: 'UNSUPPORTED_PROVIDER', message: `Payment provider '${providerKind}' is not supported` };
      emitCheckoutFailedEvent({
        tenant,
        providerKind,
        code: error.code,
        planId: params.plan._id?.toString(),
        billableEntityType: params.billableEntityType,
        billableEntityId: params.billableEntityId,
        error,
      });
      throw error;
    }
  }
}

export async function cancelProviderSubscription(
  tenant: string,
  sourceId: string,
  providerKind: string,
  externalSubscriptionId: string,
): Promise<CancelResult> {
  let operation: string;
  let payload: Record<string, any>;

  switch (providerKind) {
    case 'paddle':
      operation = 'cancelSubscription';
      payload = { subscriptionId: externalSubscriptionId, effective_from: 'next_billing_period' };
      break;
    case 'paypal':
      operation = 'cancelSubscription';
      payload = { subscriptionId: externalSubscriptionId, reason: 'User requested cancellation' };
      break;
    case 'sumit':
      operation = 'deleteRecurringPayment';
      payload = { RecurringPaymentId: externalSubscriptionId };
      break;
    case 'dodopayments':
      operation = 'cancelSubscription';
      payload = { subscription_id: externalSubscriptionId };
      break;
    default: {
      const error = { code: 'UNSUPPORTED_PROVIDER', message: `Payment provider '${providerKind}' is not supported` };
      emitProviderCallFailedEvent({
        tenant,
        providerKind,
        operation: 'cancelSubscription',
        code: error.code,
        externalSubscriptionId: externalSubscriptionId,
        error,
      });
      throw error;
    }
  }

  const result = await callIntegrationSource(tenant, sourceId, providerKind, operation, {}, payload);
  return { success: true, providerData: result };
}

export async function verifyPayPalWebhook(
  tenant: string,
  sourceId: string,
  headers: Record<string, any>,
  body: any,
  webhookId: string,
): Promise<boolean> {
  const result = await callIntegrationSource(tenant, sourceId, 'paypal', 'verifyWebhookSignature', {}, {
    webhook_id: webhookId,
    transmission_id: headers['paypal-transmission-id'],
    transmission_time: headers['paypal-transmission-time'],
    transmission_sig: headers['paypal-transmission-sig'],
    cert_url: headers['paypal-cert-url'],
    auth_algo: headers['paypal-auth-algo'],
    webhook_event: body,
  });
  return result?.verification_status === 'SUCCESS';
}

export async function getProviderSubscription(
  tenant: string,
  sourceId: string,
  providerKind: string,
  externalSubscriptionId: string,
) {
  let operation: string;
  let payload: Record<string, any>;

  switch (providerKind) {
    case 'paddle':
      operation = 'getSubscription';
      payload = { subscriptionId: externalSubscriptionId };
      break;
    case 'dodopayments':
      operation = 'getSubscription';
      payload = { subscription_id: externalSubscriptionId };
      break;
    default:
      throw { code: 'UNSUPPORTED_PROVIDER', message: `getSubscription not supported for '${providerKind}'` };
  }

  return callIntegrationSource(tenant, sourceId, providerKind, operation, {}, payload);
}
