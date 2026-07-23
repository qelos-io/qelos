import { service } from '@qelos/api-kit';
import { resolvePaymentProviderPublicContext, type PaymentProviderPublicContext, type CheckoutCustomer } from '@qelos/global-types';
import { emitCheckoutFailedEvent, emitProviderCallFailedEvent } from './platform-events.js';

const callPluginsService = service('PLUGINS', { port: process.env.PLUGINS_SERVICE_PORT || 9006 });
const callContentService = service('CONTENT', { port: process.env.CONTENT_SERVICE_PORT || 9001 });
const internalSecret = process.env.INTERNAL_SECRET || '';

export interface PaymentsConfiguration {
  providerSourceId: string;
  providerKind: string;
  providerContext: PaymentProviderPublicContext;
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
  /**
   * Real-world identity of the billable entity, used to create a properly-named
   * customer record with the payment provider (e.g. Sumit) instead of falling
   * back to the raw billable entity ID.
   */
  customer?: CheckoutCustomer;
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

async function resolveProviderSource(
  tenant: string,
  sourceId: string,
  providerKind?: string,
): Promise<{
  kind?: string;
  providerContext: PaymentProviderPublicContext;
}> {
  try {
    const response = await callPluginsService({
      method: 'GET',
      url: `/internal-api/integration-sources/${sourceId}`,
      headers: internalHeaders(tenant),
    });
    const kind = providerKind || response.data?.kind;
    return {
      kind,
      providerContext: resolvePaymentProviderPublicContext(kind, response.data?.metadata, sourceId),
    };
  } catch {
    return {
      providerContext: resolvePaymentProviderPublicContext(providerKind, undefined, sourceId),
    };
  }
}

export async function resolveProviderPublicContext(
  tenant: string,
  providerSourceId: string,
  providerKind?: string,
): Promise<PaymentProviderPublicContext> {
  const { providerContext } = await resolveProviderSource(tenant, providerSourceId, providerKind);
  return providerContext;
}

async function callIntegrationSource(
  tenant: string,
  sourceId: string,
  providerKind: string,
  operation: string,
  details: Record<string, any>,
  payload: Record<string, any>,
  providerContext?: PaymentProviderPublicContext,
) {
  const resolvedProviderContext = providerContext
    ?? resolvePaymentProviderPublicContext(providerKind, undefined, sourceId);

  try {
    const response = await callPluginsService({
      method: 'POST',
      url: `/internal-api/integration-sources/${sourceId}/trigger`,
      headers: internalHeaders(tenant),
      data: { operation, details, payload },
    });
    return response.data;
  } catch (error: any) {
    const responseData = error.response?.data;
    const enrichedError = {
      message: responseData?.description || responseData?.message || error.message,
      code: responseData?.code || error.code || 'INTEGRATION_TARGET_FAILED',
      status: error.response?.status || error.status,
      providerKind: responseData?.providerKind || providerKind,
      providerError: responseData?.providerError,
      adminSuggestions: responseData?.adminSuggestions,
      response: error.response,
      responseData,
    };

    emitProviderCallFailedEvent({
      tenant,
      providerKind: enrichedError.providerKind,
      operation,
      code: enrichedError.code,
      error: enrichedError,
      providerContext: resolvedProviderContext,
      providerResponse: {
        sourceId,
        payloadSummary: summarizePayload(payload),
        providerError: responseData?.providerError,
        operation: responseData?.operation,
      },
    });
    throw enrichedError;
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
  let providerContext: PaymentProviderPublicContext = resolvePaymentProviderPublicContext(
    providerKind,
    undefined,
    providerSourceId,
  );

  if (providerSourceId && !providerKind) {
    const resolvedSource = await resolveProviderSource(tenant, providerSourceId);
    providerKind = resolvedSource.kind;
    providerContext = resolvedSource.providerContext;
  } else if (providerSourceId && providerKind) {
    providerContext = (await resolveProviderSource(tenant, providerSourceId, providerKind)).providerContext;
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
    providerContext,
    successUrl: metadata.successUrl,
    cancelUrl: metadata.cancelUrl,
    webhookSecret: metadata.webhookSecret,
  };
}

async function createPaddleCheckout(
  tenant: string,
  sourceId: string,
  params: CheckoutParams,
  providerContext: PaymentProviderPublicContext,
): Promise<CheckoutResult> {
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
      providerContext,
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
  }, providerContext);

  return {
    checkoutUrl: result?.data?.checkout?.url,
    externalSubscriptionId: result?.data?.id,
    providerData: result,
  };
}

async function createPayPalCheckout(
  tenant: string,
  sourceId: string,
  params: CheckoutParams,
  providerContext: PaymentProviderPublicContext,
): Promise<CheckoutResult> {
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
      providerContext,
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
  }, providerContext);

  const approvalLink = result?.links?.find((l: any) => l.rel === 'approve');
  return {
    checkoutUrl: approvalLink?.href,
    externalSubscriptionId: result?.id,
    providerData: result,
  };
}

async function createDodoPaymentsCheckout(
  tenant: string,
  sourceId: string,
  params: CheckoutParams,
  providerContext: PaymentProviderPublicContext,
): Promise<CheckoutResult> {
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
      providerContext,
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
    customer: params.customer?.email ? { email: params.customer.email, name: params.customer.name } : undefined,
    return_url: params.successUrl,
  }, providerContext);

  return {
    checkoutUrl: result?.payment_link,
    externalSubscriptionId: result?.subscription_id,
    providerData: result,
  };
}

async function createSumitCheckout(
  tenant: string,
  sourceId: string,
  params: CheckoutParams,
  providerContext: PaymentProviderPublicContext,
): Promise<CheckoutResult> {
  if (!params.amount || params.amount <= 0) {
    const error = {
      code: 'INVALID_CHECKOUT_AMOUNT',
      message: 'Checkout amount must be greater than zero before calling Sumit',
    };
    emitCheckoutFailedEvent({
      tenant,
      providerKind: 'sumit',
      code: error.code,
      planId: params.plan._id.toString(),
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      providerContext,
      error,
    });
    throw error;
  }

  if (!params.successUrl || !params.cancelUrl) {
    const error = {
      code: 'MISSING_REDIRECT_URLS',
      message: 'Sumit checkout requires both successUrl and cancelUrl',
    };
    emitCheckoutFailedEvent({
      tenant,
      providerKind: 'sumit',
      code: error.code,
      planId: params.plan._id.toString(),
      billableEntityType: params.billableEntityType,
      billableEntityId: params.billableEntityId,
      providerContext,
      error,
    });
    throw error;
  }

  const externalIdentifier = JSON.stringify({
    tenant,
    billableEntityType: params.billableEntityType,
    billableEntityId: params.billableEntityId,
    planId: params.plan._id.toString(),
  });

  const result = await callIntegrationSource(tenant, sourceId, 'sumit', 'beginCheckoutRedirect', {}, {
    Customer: {
      ExternalIdentifier: `${params.billableEntityType}:${params.billableEntityId}`,
      SearchMode: 2,
      // Falling back to the raw billable entity ID is a last resort — it should
      // rarely trigger once callers populate `customer`.
      Name: params.customer?.name || params.customer?.email || params.billableEntityId,
      NameForInvoice: params.customer?.nameForInvoice,
      EmailAddress: params.customer?.email,
      Phone: params.customer?.phone,
      Address: params.customer?.address,
      City: params.customer?.city,
    },
    Items: [{
      Item: {
        Name: params.plan.name,
        Description: params.plan.name,
      },
      Quantity: 1,
      UnitPrice: params.amount,
      Currency: params.currency,
    }],
    RedirectURL: params.successUrl,
    CancelRedirectURL: params.cancelUrl,
    ExternalIdentifier: externalIdentifier,
    VATIncluded: true,
  }, providerContext);

  const recurringItemId = result?.RecurringCustomerItemIDs?.[0]?.toString()
    || result?.RecurringPaymentId?.toString();

  return {
    checkoutUrl: result?.RedirectURL,
    externalSubscriptionId: recurringItemId || externalIdentifier,
    providerData: result,
  };
}

export async function createCheckout(
  tenant: string,
  sourceId: string,
  providerKind: string,
  params: CheckoutParams,
): Promise<CheckoutResult> {
  const { providerContext } = await resolveProviderSource(tenant, sourceId, providerKind);

  switch (providerKind) {
    case 'paddle':
      return createPaddleCheckout(tenant, sourceId, params, providerContext);
    case 'paypal':
      return createPayPalCheckout(tenant, sourceId, params, providerContext);
    case 'sumit':
      return createSumitCheckout(tenant, sourceId, params, providerContext);
    case 'dodopayments':
      return createDodoPaymentsCheckout(tenant, sourceId, params, providerContext);
    default: {
      const error = { code: 'UNSUPPORTED_PROVIDER', message: `Payment provider '${providerKind}' is not supported` };
      emitCheckoutFailedEvent({
        tenant,
        providerKind,
        code: error.code,
        planId: params.plan._id?.toString(),
        billableEntityType: params.billableEntityType,
        billableEntityId: params.billableEntityId,
        providerContext,
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
  const { providerContext } = await resolveProviderSource(tenant, sourceId, providerKind);
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
        providerContext,
        error,
      });
      throw error;
    }
  }

  const result = await callIntegrationSource(tenant, sourceId, providerKind, operation, {}, payload, providerContext);
  return { success: true, providerData: result };
}

export async function verifyPayPalWebhook(
  tenant: string,
  sourceId: string,
  headers: Record<string, any>,
  body: any,
  webhookId: string,
): Promise<boolean> {
  const { providerContext } = await resolveProviderSource(tenant, sourceId, 'paypal');
  const result = await callIntegrationSource(tenant, sourceId, 'paypal', 'verifyWebhookSignature', {}, {
    webhook_id: webhookId,
    transmission_id: headers['paypal-transmission-id'],
    transmission_time: headers['paypal-transmission-time'],
    transmission_sig: headers['paypal-transmission-sig'],
    cert_url: headers['paypal-cert-url'],
    auth_algo: headers['paypal-auth-algo'],
    webhook_event: body,
  }, providerContext);
  return result?.verification_status === 'SUCCESS';
}

export async function getProviderSubscription(
  tenant: string,
  sourceId: string,
  providerKind: string,
  externalSubscriptionId: string,
) {
  const { providerContext } = await resolveProviderSource(tenant, sourceId, providerKind);
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

  return callIntegrationSource(tenant, sourceId, providerKind, operation, {}, payload, providerContext);
}
