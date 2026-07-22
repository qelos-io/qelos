import crypto from 'crypto';
import Subscription from '../models/subscription';
import WebhookEvent from '../models/webhook-event';
import * as SubscriptionsService from './subscriptions-service';
import * as CheckoutService from './checkout-service';
import * as ProviderAdapter from './provider-adapter';
import {
  emitWebhookPaymentFailedEvent,
  emitWebhookProcessingFailedEvent,
} from './platform-events.js';

export async function isEventProcessed(tenant: string, externalEventId: string, providerKind: string): Promise<boolean> {
  const existing = await (WebhookEvent as any).findOne({
    tenant,
    externalEventId,
    providerKind,
  }).lean().exec();
  return !!existing;
}

async function recordEvent(tenant: string, externalEventId: string, providerKind: string, eventType: string) {
  try {
    const event = new WebhookEvent({ tenant, externalEventId, providerKind, eventType });
    await event.save();
  } catch (err: any) {
    if (err?.code === 11000) {
      throw { code: 'DUPLICATE_EVENT', message: 'Event already recorded' };
    }
    throw err;
  }
}

function extractTenantFromCustomData(customData: any): string | undefined {
  if (typeof customData === 'string') {
    try { customData = JSON.parse(customData); } catch { return undefined; }
  }
  return customData?.tenant;
}

function parseSumitExternalIdentifier(value: unknown): Record<string, any> | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function resolveSumitTenant(body: any): string | undefined {
  let customData: any = {};
  if (body.CustomData) {
    if (typeof body.CustomData === 'string') {
      try { customData = JSON.parse(body.CustomData); } catch { customData = {}; }
    } else {
      customData = body.CustomData;
    }
  }

  if (customData.tenant) {
    return customData.tenant;
  }

  return parseSumitExternalIdentifier(body.ExternalIdentifier)?.tenant;
}

async function findSumitSubscription(tenant: string, body: any) {
  const recurringPaymentId = body.RecurringPaymentId?.toString()
    || body.RecurringItemID?.toString()
    || body.RecurringCustomerItemID?.toString();
  if (recurringPaymentId) {
    return findSubscriptionByExternalId(recurringPaymentId, 'sumit');
  }

  const externalIdentifier = body.ExternalIdentifier?.toString();
  if (externalIdentifier) {
    const byExternalId = await findSubscriptionByExternalId(externalIdentifier, 'sumit');
    if (byExternalId) {
      return byExternalId;
    }
  }

  const parsed = parseSumitExternalIdentifier(body.ExternalIdentifier);
  if (parsed?.billableEntityType && parsed?.billableEntityId) {
    return (Subscription as any).findOne({
      tenant,
      providerKind: 'sumit',
      billableEntityType: parsed.billableEntityType,
      billableEntityId: parsed.billableEntityId,
      status: 'pending',
    }).sort({ created: -1 }).lean().exec();
  }

  return null;
}

export async function processWebhook(providerKind: string, headers: Record<string, any>, body: any, rawBody?: string) {
  switch (providerKind) {
    case 'paddle':
      return processPaddleWebhook(headers, body, rawBody || JSON.stringify(body));
    case 'paypal':
      return processPayPalWebhook(headers, body);
    case 'sumit':
      return processSumitWebhook(headers, body);
    case 'dodopayments':
      return processDodoPaymentsWebhook(headers, body, rawBody || JSON.stringify(body));
    default:
      throw { code: 'UNSUPPORTED_PROVIDER', message: `Webhook provider '${providerKind}' is not supported` };
  }
}

async function findSubscriptionByExternalId(externalId: string, providerKind: string) {
  return (Subscription as any).findOne({
    externalSubscriptionId: externalId,
    providerKind,
  }).lean().exec();
}

function subscriptionEventMetadata(subscription: any) {
  return {
    subscriptionId: subscription._id?.toString(),
    planId: subscription.planId?.toString(),
    billableEntityType: subscription.billableEntityType,
    billableEntityId: subscription.billableEntityId,
  };
}

function emitWebhookProcessingFailure(params: {
  tenant?: string;
  providerKind: string;
  operation?: string;
  externalEventId?: string;
  providerResponse?: unknown;
  providerContext?: ProviderAdapter.PaymentsConfiguration['providerContext'];
  error: any;
}) {
  emitWebhookProcessingFailedEvent({
    tenant: params.tenant,
    providerKind: params.providerKind,
    operation: params.operation,
    code: params.error?.code,
    externalEventId: params.externalEventId,
    providerResponse: params.providerResponse,
    providerContext: params.providerContext,
    error: params.error,
  });
}

// --- Signature Verification ---

function verifyPaddleSignature(headers: Record<string, any>, rawBody: string, webhookSecret: string) {
  const signature = headers['paddle-signature'];
  if (!signature) throw { code: 'INVALID_SIGNATURE', message: 'Missing Paddle-Signature header' };

  const parts: Record<string, string> = {};
  for (const part of signature.split(';')) {
    const [key, ...rest] = part.split('=');
    parts[key] = rest.join('=');
  }

  const ts = parts['ts'];
  const h1 = parts['h1'];
  if (!ts || !h1) throw { code: 'INVALID_SIGNATURE', message: 'Invalid Paddle-Signature format' };

  const signedPayload = `${ts}:${rawBody}`;
  const expected = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(h1, 'hex'), Buffer.from(expected, 'hex'))) {
    throw { code: 'INVALID_SIGNATURE', message: 'Paddle webhook signature verification failed' };
  }
}

function verifySumitSignature(headers: Record<string, any>, webhookSecret: string) {
  const token = headers['x-webhook-secret'] || headers['x-sumit-secret'];
  if (token !== webhookSecret) {
    throw { code: 'INVALID_SIGNATURE', message: 'Sumit webhook secret verification failed' };
  }
}

function resolveWebhookFailureOperation(error: any) {
  switch (error?.code) {
    case 'INVALID_SIGNATURE':
      return 'verifySignature';
    case 'TENANT_NOT_FOUND':
      return 'resolveTenant';
    case 'WEBHOOK_SECRET_NOT_CONFIGURED':
      return 'getWebhookSecret';
    case 'INVALID_WEBHOOK':
      return 'validateWebhook';
    default:
      return 'processWebhook';
  }
}

function requireWebhookSecret(config: ProviderAdapter.PaymentsConfiguration): string {
  if (!config.webhookSecret) {
    throw { code: 'WEBHOOK_SECRET_NOT_CONFIGURED', message: 'Webhook secret is not configured for this tenant' };
  }
  return config.webhookSecret;
}

// --- Paddle Webhooks ---

async function processPaddleWebhook(headers: Record<string, any>, body: any, rawBody: string) {
  let tenant: string | undefined;
  let eventId: string | undefined;

  try {
    eventId = body.event_id || body.notification_id;
    const eventType = body.event_type;
    const data = body.data || {};

    if (!eventId || !eventType) {
      throw { code: 'INVALID_WEBHOOK', message: 'Missing event_id or event_type' };
    }

    const subscription = data.id ? await findSubscriptionByExternalId(data.id, 'paddle') : null;
    tenant = subscription?.tenant || extractTenantFromCustomData(data.custom_data);

    if (!tenant) {
      throw { code: 'TENANT_NOT_FOUND', message: 'Could not determine tenant from webhook data' };
    }

    const config = await ProviderAdapter.getPaymentsConfiguration(tenant);
    const webhookSecret = requireWebhookSecret(config);
    verifyPaddleSignature(headers, rawBody, webhookSecret);

    if (await isEventProcessed(tenant, eventId, 'paddle')) {
      return { status: 'already_processed' };
    }

    await recordEvent(tenant, eventId, 'paddle', eventType);

    let result: any;

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.activated':
        result = await handlePaddleSubscriptionActivated(tenant, data);
        break;
      case 'subscription.updated':
        result = await handlePaddleSubscriptionUpdated(tenant, data);
        break;
      case 'subscription.canceled':
        result = await handlePaddleSubscriptionCanceled(tenant, data);
        break;
      case 'subscription.past_due':
        result = await handlePaddleSubscriptionPastDue(tenant, data);
        break;
      case 'transaction.completed':
        result = await handlePaddleTransactionCompleted(tenant, data);
        break;
      case 'transaction.payment_failed':
        result = await handlePaddlePaymentFailed(tenant, data, eventId, config.providerContext);
        break;
      default:
        emitWebhookProcessingFailure({
          tenant,
          providerKind: 'paddle',
          operation: 'handleEvent',
          externalEventId: eventId,
          providerResponse: { eventType },
          providerContext: config.providerContext,
          error: { code: 'UNHANDLED_EVENT_TYPE', message: `Unhandled Paddle event type: ${eventType}` },
        });
        result = { status: 'unhandled', eventType };
    }

    return result;
  } catch (error: any) {
    emitWebhookProcessingFailure({
      tenant,
      providerKind: 'paddle',
      operation: resolveWebhookFailureOperation(error),
      externalEventId: eventId,
      error,
    });
    throw error;
  }
}

async function handlePaddleSubscriptionActivated(tenant: string, data: any) {
  const subscription = await findSubscriptionByExternalId(data.id, 'paddle');
  if (!subscription) return { status: 'subscription_not_found' };

  const periodStart = data.current_billing_period?.starts_at ? new Date(data.current_billing_period.starts_at) : undefined;
  const periodEnd = data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : undefined;

  return CheckoutService.activateSubscription(tenant, subscription._id.toString(), {
    externalSubscriptionId: data.id,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });
}

async function handlePaddleSubscriptionUpdated(tenant: string, data: any) {
  const subscription = await findSubscriptionByExternalId(data.id, 'paddle');
  if (!subscription) return { status: 'subscription_not_found' };

  const updates: Record<string, any> = {};
  if (data.current_billing_period?.starts_at) {
    updates.currentPeriodStart = new Date(data.current_billing_period.starts_at);
  }
  if (data.current_billing_period?.ends_at) {
    updates.currentPeriodEnd = new Date(data.current_billing_period.ends_at);
  }

  const statusMap: Record<string, string> = {
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    paused: 'canceled',
    trialing: 'trialing',
  };

  const status = statusMap[data.status] || subscription.status;
  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), status as any, updates);
}

async function handlePaddleSubscriptionCanceled(tenant: string, data: any) {
  const subscription = await findSubscriptionByExternalId(data.id, 'paddle');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'canceled');
}

async function handlePaddleSubscriptionPastDue(tenant: string, data: any) {
  const subscription = await findSubscriptionByExternalId(data.id, 'paddle');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}

async function handlePaddleTransactionCompleted(tenant: string, data: any) {
  const subscriptionId = data.subscription_id;
  if (!subscriptionId) return { status: 'no_subscription' };

  const subscription = await findSubscriptionByExternalId(subscriptionId, 'paddle');
  if (!subscription) return { status: 'subscription_not_found' };

  const total = data.details?.totals?.total;
  const amount = total ? parseInt(total, 10) / 100 : 0;

  return CheckoutService.createInvoiceForPayment(tenant, subscription, {
    amount,
    currency: data.currency_code || subscription.currency,
    externalInvoiceId: data.id,
    invoiceUrl: data.invoice_url,
    periodStart: data.billing_period?.starts_at ? new Date(data.billing_period.starts_at) : undefined,
    periodEnd: data.billing_period?.ends_at ? new Date(data.billing_period.ends_at) : undefined,
  });
}

async function handlePaddlePaymentFailed(
  tenant: string,
  data: any,
  externalEventId: string | undefined,
  providerContext: ProviderAdapter.PaymentsConfiguration['providerContext'],
) {
  const subscriptionId = data.subscription_id;
  if (!subscriptionId) return { status: 'no_subscription' };

  const subscription = await findSubscriptionByExternalId(subscriptionId, 'paddle');
  if (!subscription) return { status: 'subscription_not_found' };

  emitWebhookPaymentFailedEvent({
    tenant,
    providerKind: 'paddle',
    externalSubscriptionId: subscriptionId,
    externalEventId,
    providerResponse: data,
    providerContext,
    ...subscriptionEventMetadata(subscription),
  });

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}

// --- PayPal Webhooks ---

async function processPayPalWebhook(headers: Record<string, any>, body: any) {
  let tenant: string | undefined;
  let eventId: string | undefined;

  try {
    eventId = body.id;
    const eventType = body.event_type;
    const resource = body.resource || {};

    if (!eventId || !eventType) {
      throw { code: 'INVALID_WEBHOOK', message: 'Missing id or event_type' };
    }

    const subscriptionId = resource.id || resource.billing_agreement_id;
    const subscription = subscriptionId ? await findSubscriptionByExternalId(subscriptionId, 'paypal') : null;
    tenant = subscription?.tenant || extractTenantFromCustomData(resource.custom_id);

    if (!tenant) {
      throw { code: 'TENANT_NOT_FOUND', message: 'Could not determine tenant from webhook data' };
    }

    const config = await ProviderAdapter.getPaymentsConfiguration(tenant);
    const webhookSecret = requireWebhookSecret(config);
    const verified = await ProviderAdapter.verifyPayPalWebhook(
      tenant, config.providerSourceId, headers, body, webhookSecret,
    );
    if (!verified) {
      throw { code: 'INVALID_SIGNATURE', message: 'PayPal webhook signature verification failed' };
    }

    if (await isEventProcessed(tenant, eventId, 'paypal')) {
      return { status: 'already_processed' };
    }

    await recordEvent(tenant, eventId, 'paypal', eventType);

    let result: any;

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        result = await handlePayPalSubscriptionActivated(tenant, resource);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        result = await handlePayPalSubscriptionCanceled(tenant, resource);
        break;
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        result = await handlePayPalSubscriptionExpired(tenant, resource);
        break;
      case 'PAYMENT.SALE.COMPLETED':
        result = await handlePayPalPaymentCompleted(tenant, resource);
        break;
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        result = await handlePayPalPaymentFailed(tenant, resource, eventId, config.providerContext);
        break;
      default:
        emitWebhookProcessingFailure({
          tenant,
          providerKind: 'paypal',
          operation: 'handleEvent',
          externalEventId: eventId,
          providerResponse: { eventType },
          providerContext: config.providerContext,
          error: { code: 'UNHANDLED_EVENT_TYPE', message: `Unhandled PayPal event type: ${eventType}` },
        });
        result = { status: 'unhandled', eventType };
    }

    return result;
  } catch (error: any) {
    emitWebhookProcessingFailure({
      tenant,
      providerKind: 'paypal',
      operation: resolveWebhookFailureOperation(error),
      externalEventId: eventId,
      error,
    });
    throw error;
  }
}

async function handlePayPalSubscriptionActivated(tenant: string, resource: any) {
  const subscription = await findSubscriptionByExternalId(resource.id, 'paypal');
  if (!subscription) return { status: 'subscription_not_found' };

  const startTime = resource.start_time ? new Date(resource.start_time) : new Date();
  const billingInfo = resource.billing_info;
  const nextBilling = billingInfo?.next_billing_time ? new Date(billingInfo.next_billing_time) : undefined;

  return CheckoutService.activateSubscription(tenant, subscription._id.toString(), {
    externalSubscriptionId: resource.id,
    currentPeriodStart: startTime,
    currentPeriodEnd: nextBilling,
  });
}

async function handlePayPalSubscriptionCanceled(tenant: string, resource: any) {
  const subscription = await findSubscriptionByExternalId(resource.id, 'paypal');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'canceled');
}

async function handlePayPalSubscriptionExpired(tenant: string, resource: any) {
  const subscription = await findSubscriptionByExternalId(resource.id, 'paypal');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'expired');
}

async function handlePayPalPaymentCompleted(tenant: string, resource: any) {
  const subscriptionId = resource.billing_agreement_id;
  if (!subscriptionId) return { status: 'no_subscription' };

  const subscription = await findSubscriptionByExternalId(subscriptionId, 'paypal');
  if (!subscription) return { status: 'subscription_not_found' };

  return CheckoutService.createInvoiceForPayment(tenant, subscription, {
    amount: parseFloat(resource.amount?.total || '0'),
    currency: resource.amount?.currency,
    externalInvoiceId: resource.id,
  });
}

async function handlePayPalPaymentFailed(
  tenant: string,
  resource: any,
  externalEventId: string | undefined,
  providerContext: ProviderAdapter.PaymentsConfiguration['providerContext'],
) {
  const subscription = await findSubscriptionByExternalId(resource.id, 'paypal');
  if (!subscription) return { status: 'subscription_not_found' };

  emitWebhookPaymentFailedEvent({
    tenant,
    providerKind: 'paypal',
    externalSubscriptionId: resource.id,
    externalEventId,
    providerResponse: resource,
    providerContext,
    ...subscriptionEventMetadata(subscription),
  });

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}

// --- Sumit Webhooks ---

async function processSumitWebhook(headers: Record<string, any>, body: any) {
  let tenant: string | undefined;
  let eventId: string | undefined;

  try {
    eventId = body.EventId || body.TransactionId || `sumit-${Date.now()}`;
    const eventType = body.EventType || body.Type || 'payment';

    tenant = resolveSumitTenant(body);

    if (!tenant) {
      throw { code: 'TENANT_NOT_FOUND', message: 'Could not determine tenant from webhook data' };
    }

    const config = await ProviderAdapter.getPaymentsConfiguration(tenant);
    const webhookSecret = requireWebhookSecret(config);
    verifySumitSignature(headers, webhookSecret);

    if (await isEventProcessed(tenant, eventId, 'sumit')) {
      return { status: 'already_processed' };
    }

    await recordEvent(tenant, eventId, 'sumit', eventType);

    let result: any;

    switch (eventType) {
      case 'payment_success':
      case 'RecurringPaymentCharged':
        result = await handleSumitPaymentSuccess(tenant, body);
        break;
      case 'payment_failed':
      case 'RecurringPaymentFailed':
        result = await handleSumitPaymentFailed(tenant, body, eventId, config.providerContext);
        break;
      case 'recurring_canceled':
      case 'RecurringPaymentCanceled':
        result = await handleSumitRecurringCanceled(tenant, body);
        break;
      default:
        emitWebhookProcessingFailure({
          tenant,
          providerKind: 'sumit',
          operation: 'handleEvent',
          externalEventId: eventId,
          providerResponse: { eventType },
          providerContext: config.providerContext,
          error: { code: 'UNHANDLED_EVENT_TYPE', message: `Unhandled Sumit event type: ${eventType}` },
        });
        result = { status: 'unhandled', eventType };
    }

    return result;
  } catch (error: any) {
    emitWebhookProcessingFailure({
      tenant,
      providerKind: 'sumit',
      operation: resolveWebhookFailureOperation(error),
      externalEventId: eventId,
      error,
    });
    throw error;
  }
}

async function handleSumitPaymentSuccess(tenant: string, body: any) {
  const recurringPaymentId = body.RecurringPaymentId?.toString()
    || body.RecurringItemID?.toString()
    || body.RecurringCustomerItemID?.toString();

  const subscription = await findSumitSubscription(tenant, body);
  if (!subscription) return { status: 'subscription_not_found' };

  if (subscription.status === 'pending') {
    await CheckoutService.activateSubscription(tenant, subscription._id.toString(), {
      externalSubscriptionId: recurringPaymentId || subscription.externalSubscriptionId,
    });
  }

  return CheckoutService.createInvoiceForPayment(tenant, subscription, {
    amount: body.Amount || 0,
    currency: body.Currency,
    externalInvoiceId: body.TransactionId?.toString() || body.PaymentID?.toString(),
    invoiceUrl: body.InvoiceUrl || body.DocumentDownloadURL,
  });
}

async function handleSumitPaymentFailed(
  tenant: string,
  body: any,
  externalEventId: string | undefined,
  providerContext: ProviderAdapter.PaymentsConfiguration['providerContext'],
) {
  const recurringPaymentId = body.RecurringPaymentId?.toString()
    || body.RecurringItemID?.toString()
    || body.RecurringCustomerItemID?.toString();

  const subscription = await findSumitSubscription(tenant, body);
  if (!subscription) return { status: 'subscription_not_found' };

  emitWebhookPaymentFailedEvent({
    tenant,
    providerKind: 'sumit',
    externalSubscriptionId: recurringPaymentId || subscription.externalSubscriptionId,
    externalEventId,
    providerResponse: body,
    providerContext,
    ...subscriptionEventMetadata(subscription),
  });

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}

async function handleSumitRecurringCanceled(tenant: string, body: any) {
  const subscription = await findSumitSubscription(tenant, body);
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'canceled');
}

// --- DodoPayments Webhooks ---

function verifyDodoPaymentsSignature(headers: Record<string, any>, rawBody: string, webhookSecret: string) {
  const webhookId = headers['webhook-id'];
  const webhookTimestamp = headers['webhook-timestamp'];
  const webhookSignature = headers['webhook-signature'];

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    throw { code: 'INVALID_SIGNATURE', message: 'Missing DodoPayments webhook signature headers' };
  }

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;

  // DodoPayments secrets are prefixed with "whsec_"; strip prefix before base64 decoding
  const secretBase64 = webhookSecret.includes('_') ? webhookSecret.split('_').slice(1).join('_') : webhookSecret;
  const secretBytes = Buffer.from(secretBase64, 'base64');

  const computedSignature = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  // Signature header may contain multiple space-separated "v1,<sig>" entries
  const signatures = webhookSignature.split(' ');
  const valid = signatures.some((sig: string) => {
    const [version, value] = sig.split(',');
    if (version !== 'v1' || !value) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(value, 'base64'), Buffer.from(computedSignature, 'base64'));
    } catch {
      return false;
    }
  });

  if (!valid) {
    throw { code: 'INVALID_SIGNATURE', message: 'DodoPayments webhook signature verification failed' };
  }
}

async function processDodoPaymentsWebhook(headers: Record<string, any>, body: any, rawBody: string) {
  let tenant: string | undefined;
  let eventId: string | undefined;

  try {
    eventId = body.webhook_id || headers['webhook-id'];
    const eventType = body.type || body.event_type;
    const data = body.data || {};

    if (!eventId || !eventType) {
      throw { code: 'INVALID_WEBHOOK', message: 'Missing webhook_id or type in DodoPayments webhook' };
    }

    const externalSubscriptionId = data.subscription_id || data.id;
    const subscription = externalSubscriptionId
      ? await findSubscriptionByExternalId(externalSubscriptionId, 'dodopayments')
      : null;
    tenant = subscription?.tenant || extractTenantFromCustomData(data.metadata);

    if (!tenant) {
      throw { code: 'TENANT_NOT_FOUND', message: 'Could not determine tenant from DodoPayments webhook data' };
    }

    const config = await ProviderAdapter.getPaymentsConfiguration(tenant);
    const webhookSecret = requireWebhookSecret(config);
    verifyDodoPaymentsSignature(headers, rawBody, webhookSecret);

    if (await isEventProcessed(tenant, eventId, 'dodopayments')) {
      return { status: 'already_processed' };
    }

    await recordEvent(tenant, eventId, 'dodopayments', eventType);

    let result: any;

    switch (eventType) {
      case 'subscription.active':
      case 'subscription.created':
        result = await handleDodoSubscriptionActivated(tenant, data);
        break;
      case 'subscription.cancelled':
        result = await handleDodoSubscriptionCancelled(tenant, data);
        break;
      case 'subscription.past_due':
        result = await handleDodoSubscriptionPastDue(tenant, data);
        break;
      case 'subscription.on_hold':
        result = await handleDodoSubscriptionOnHold(tenant, data);
        break;
      case 'subscription.renewed':
        result = await handleDodoSubscriptionRenewed(tenant, data);
        break;
      case 'payment.succeeded':
        result = await handleDodoPaymentSucceeded(tenant, data);
        break;
      case 'payment.failed':
        result = await handleDodoPaymentFailed(tenant, data, eventId, config.providerContext);
        break;
      default:
        emitWebhookProcessingFailure({
          tenant,
          providerKind: 'dodopayments',
          operation: 'handleEvent',
          externalEventId: eventId,
          providerResponse: { eventType },
          providerContext: config.providerContext,
          error: { code: 'UNHANDLED_EVENT_TYPE', message: `Unhandled DodoPayments event type: ${eventType}` },
        });
        result = { status: 'unhandled', eventType };
    }

    return result;
  } catch (error: any) {
    emitWebhookProcessingFailure({
      tenant,
      providerKind: 'dodopayments',
      operation: resolveWebhookFailureOperation(error),
      externalEventId: eventId,
      error,
    });
    throw error;
  }
}

async function handleDodoSubscriptionActivated(tenant: string, data: any) {
  const externalId = data.subscription_id || data.id;
  const subscription = await findSubscriptionByExternalId(externalId, 'dodopayments');
  if (!subscription) return { status: 'subscription_not_found' };

  const periodStart = data.current_period_start ? new Date(data.current_period_start) : undefined;
  const periodEnd = data.current_period_end ? new Date(data.current_period_end) : undefined;

  return CheckoutService.activateSubscription(tenant, subscription._id.toString(), {
    externalSubscriptionId: externalId,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });
}

async function handleDodoSubscriptionCancelled(tenant: string, data: any) {
  const externalId = data.subscription_id || data.id;
  const subscription = await findSubscriptionByExternalId(externalId, 'dodopayments');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'canceled');
}

async function handleDodoSubscriptionPastDue(tenant: string, data: any) {
  const externalId = data.subscription_id || data.id;
  const subscription = await findSubscriptionByExternalId(externalId, 'dodopayments');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}

async function handleDodoSubscriptionOnHold(tenant: string, data: any) {
  const externalId = data.subscription_id || data.id;
  const subscription = await findSubscriptionByExternalId(externalId, 'dodopayments');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}

async function handleDodoSubscriptionRenewed(tenant: string, data: any) {
  const externalId = data.subscription_id || data.id;
  const subscription = await findSubscriptionByExternalId(externalId, 'dodopayments');
  if (!subscription) return { status: 'subscription_not_found' };

  const periodStart = data.current_period_start ? new Date(data.current_period_start) : undefined;
  const periodEnd = data.current_period_end ? new Date(data.current_period_end) : undefined;

  await SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'active', {
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });

  return CheckoutService.createInvoiceForPayment(tenant, subscription, {
    amount: data.amount ? data.amount / 100 : 0,
    currency: data.currency || subscription.currency,
    externalInvoiceId: data.payment_id || data.id,
    periodStart,
    periodEnd,
  });
}

async function handleDodoPaymentSucceeded(tenant: string, data: any) {
  const subscriptionId = data.subscription_id;
  if (subscriptionId) {
    const subscription = await findSubscriptionByExternalId(subscriptionId, 'dodopayments');
    if (!subscription) return { status: 'subscription_not_found' };

    return CheckoutService.createInvoiceForPayment(tenant, subscription, {
      amount: data.amount ? data.amount / 100 : 0,
      currency: data.currency || subscription.currency,
      externalInvoiceId: data.payment_id || data.id,
    });
  }

  // One-time payment without a subscription
  return { status: 'payment_recorded', paymentId: data.payment_id || data.id };
}

async function handleDodoPaymentFailed(
  tenant: string,
  data: any,
  externalEventId: string | undefined,
  providerContext: ProviderAdapter.PaymentsConfiguration['providerContext'],
) {
  const subscriptionId = data.subscription_id;
  if (!subscriptionId) return { status: 'no_subscription' };

  const subscription = await findSubscriptionByExternalId(subscriptionId, 'dodopayments');
  if (!subscription) return { status: 'subscription_not_found' };

  emitWebhookPaymentFailedEvent({
    tenant,
    providerKind: 'dodopayments',
    externalSubscriptionId: subscriptionId,
    externalEventId,
    providerResponse: data,
    providerContext,
    ...subscriptionEventMetadata(subscription),
  });

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}
