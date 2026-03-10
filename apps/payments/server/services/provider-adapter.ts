import { service } from '@qelos/api-kit';

const callPluginsService = service('PLUGINS', { port: process.env.PLUGINS_SERVICE_PORT || 9006 });
const callContentService = service('CONTENT', { port: process.env.CONTENT_SERVICE_PORT || 9001 });
const internalSecret = process.env.INTERNAL_SECRET || '';

export interface PaymentsConfiguration {
  providerSourceId: string;
  providerKind: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutParams {
  plan: any;
  billingCycle: string;
  billableEntityType: string;
  billableEntityId: string;
  amount: number;
  currency: string;
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

function internalHeaders(tenant: string) {
  return { tenant, internal_secret: internalSecret };
}

async function callIntegrationSource(
  tenant: string,
  sourceId: string,
  operation: string,
  details: Record<string, any>,
  payload: Record<string, any>,
) {
  const response = await callPluginsService({
    method: 'POST',
    url: `/internal-api/integration-sources/${sourceId}/trigger`,
    headers: internalHeaders(tenant),
    data: { operation, details, payload },
  });
  return response.data;
}

export async function getPaymentsConfiguration(tenant: string): Promise<PaymentsConfiguration> {
  const response = await callContentService({
    method: 'GET',
    url: '/api/configurations/payments-configuration',
    headers: internalHeaders(tenant),
  });

  const config = response.data?.value || response.data;
  if (!config?.providerSourceId || !config?.providerKind) {
    throw { code: 'PAYMENTS_NOT_CONFIGURED', message: 'Payments provider is not configured' };
  }
  return config;
}

async function createPaddleCheckout(tenant: string, sourceId: string, params: CheckoutParams): Promise<CheckoutResult> {
  const externalIds = params.plan.externalIds?.paddle || {};
  const priceId = params.billingCycle === 'monthly' ? externalIds.monthlyPriceId : externalIds.yearlyPriceId;

  if (!priceId) {
    throw { code: 'MISSING_EXTERNAL_PRICE_ID', message: `No Paddle ${params.billingCycle} price ID configured for this plan` };
  }

  const result = await callIntegrationSource(tenant, sourceId, 'createSubscription', {}, {
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
    throw { code: 'MISSING_EXTERNAL_PRICE_ID', message: 'No PayPal product ID configured for this plan' };
  }

  const result = await callIntegrationSource(tenant, sourceId, 'createSubscription', {}, {
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

async function createSumitCheckout(tenant: string, sourceId: string, params: CheckoutParams): Promise<CheckoutResult> {
  const result = await callIntegrationSource(tenant, sourceId, 'createRecurringPayment', {}, {
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
    default:
      throw { code: 'UNSUPPORTED_PROVIDER', message: `Payment provider '${providerKind}' is not supported` };
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
    default:
      throw { code: 'UNSUPPORTED_PROVIDER', message: `Payment provider '${providerKind}' is not supported` };
  }

  const result = await callIntegrationSource(tenant, sourceId, operation, {}, payload);
  return { success: true, providerData: result };
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
    default:
      throw { code: 'UNSUPPORTED_PROVIDER', message: `getSubscription not supported for '${providerKind}'` };
  }

  return callIntegrationSource(tenant, sourceId, operation, {}, payload);
}
