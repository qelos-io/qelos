import Subscription from '../models/subscription';
import WebhookEvent from '../models/webhook-event';
import * as SubscriptionsService from './subscriptions-service';
import * as CheckoutService from './checkout-service';

export async function isEventProcessed(tenant: string, externalEventId: string, providerKind: string): Promise<boolean> {
  const existing = await (WebhookEvent as any).findOne({
    tenant,
    externalEventId,
    providerKind,
  }).lean().exec();
  return !!existing;
}

async function recordEvent(tenant: string, externalEventId: string, providerKind: string, eventType: string) {
  const event = new WebhookEvent({ tenant, externalEventId, providerKind, eventType });
  await event.save().catch(() => {});
}

function extractTenantFromCustomData(customData: any): string | undefined {
  if (typeof customData === 'string') {
    try { customData = JSON.parse(customData); } catch { return undefined; }
  }
  return customData?.tenant;
}

export async function processWebhook(providerKind: string, headers: Record<string, any>, body: any) {
  switch (providerKind) {
    case 'paddle':
      return processPaddleWebhook(headers, body);
    case 'paypal':
      return processPayPalWebhook(headers, body);
    case 'sumit':
      return processSumitWebhook(headers, body);
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

// --- Paddle Webhooks ---

async function processPaddleWebhook(headers: Record<string, any>, body: any) {
  const eventId = body.event_id || body.notification_id;
  const eventType = body.event_type;
  const data = body.data || {};

  if (!eventId || !eventType) {
    throw { code: 'INVALID_WEBHOOK', message: 'Missing event_id or event_type' };
  }

  const subscription = data.id ? await findSubscriptionByExternalId(data.id, 'paddle') : null;
  const tenant = subscription?.tenant || extractTenantFromCustomData(data.custom_data);

  if (!tenant) {
    throw { code: 'TENANT_NOT_FOUND', message: 'Could not determine tenant from webhook data' };
  }

  if (await isEventProcessed(tenant, eventId, 'paddle')) {
    return { status: 'already_processed' };
  }

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
      result = await handlePaddlePaymentFailed(tenant, data);
      break;
    default:
      result = { status: 'unhandled', eventType };
  }

  await recordEvent(tenant, eventId, 'paddle', eventType);
  return result;
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

async function handlePaddlePaymentFailed(tenant: string, data: any) {
  const subscriptionId = data.subscription_id;
  if (!subscriptionId) return { status: 'no_subscription' };

  const subscription = await findSubscriptionByExternalId(subscriptionId, 'paddle');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}

// --- PayPal Webhooks ---

async function processPayPalWebhook(headers: Record<string, any>, body: any) {
  const eventId = body.id;
  const eventType = body.event_type;
  const resource = body.resource || {};

  if (!eventId || !eventType) {
    throw { code: 'INVALID_WEBHOOK', message: 'Missing id or event_type' };
  }

  const subscriptionId = resource.id || resource.billing_agreement_id;
  const subscription = subscriptionId ? await findSubscriptionByExternalId(subscriptionId, 'paypal') : null;
  const tenant = subscription?.tenant || extractTenantFromCustomData(resource.custom_id);

  if (!tenant) {
    throw { code: 'TENANT_NOT_FOUND', message: 'Could not determine tenant from webhook data' };
  }

  if (await isEventProcessed(tenant, eventId, 'paypal')) {
    return { status: 'already_processed' };
  }

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
      result = await handlePayPalPaymentFailed(tenant, resource);
      break;
    default:
      result = { status: 'unhandled', eventType };
  }

  await recordEvent(tenant, eventId, 'paypal', eventType);
  return result;
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

async function handlePayPalPaymentFailed(tenant: string, resource: any) {
  const subscription = await findSubscriptionByExternalId(resource.id, 'paypal');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}

// --- Sumit Webhooks ---

async function processSumitWebhook(headers: Record<string, any>, body: any) {
  const eventId = body.EventId || body.TransactionId || `sumit-${Date.now()}`;
  const eventType = body.EventType || body.Type || 'payment';

  const customData = body.CustomData ? (typeof body.CustomData === 'string' ? JSON.parse(body.CustomData) : body.CustomData) : {};
  const tenant = customData.tenant;

  if (!tenant) {
    throw { code: 'TENANT_NOT_FOUND', message: 'Could not determine tenant from webhook data' };
  }

  if (await isEventProcessed(tenant, eventId, 'sumit')) {
    return { status: 'already_processed' };
  }

  let result: any;

  switch (eventType) {
    case 'payment_success':
    case 'RecurringPaymentCharged':
      result = await handleSumitPaymentSuccess(tenant, body);
      break;
    case 'payment_failed':
    case 'RecurringPaymentFailed':
      result = await handleSumitPaymentFailed(tenant, body);
      break;
    case 'recurring_canceled':
    case 'RecurringPaymentCanceled':
      result = await handleSumitRecurringCanceled(tenant, body);
      break;
    default:
      result = { status: 'unhandled', eventType };
  }

  await recordEvent(tenant, eventId, 'sumit', eventType);
  return result;
}

async function handleSumitPaymentSuccess(tenant: string, body: any) {
  const recurringPaymentId = body.RecurringPaymentId?.toString();
  if (!recurringPaymentId) return { status: 'no_subscription' };

  const subscription = await findSubscriptionByExternalId(recurringPaymentId, 'sumit');
  if (!subscription) return { status: 'subscription_not_found' };

  if (subscription.status === 'pending') {
    await CheckoutService.activateSubscription(tenant, subscription._id.toString(), {
      externalSubscriptionId: recurringPaymentId,
    });
  }

  return CheckoutService.createInvoiceForPayment(tenant, subscription, {
    amount: body.Amount || 0,
    currency: body.Currency,
    externalInvoiceId: body.TransactionId?.toString(),
    invoiceUrl: body.InvoiceUrl,
  });
}

async function handleSumitPaymentFailed(tenant: string, body: any) {
  const recurringPaymentId = body.RecurringPaymentId?.toString();
  if (!recurringPaymentId) return { status: 'no_subscription' };

  const subscription = await findSubscriptionByExternalId(recurringPaymentId, 'sumit');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'past_due');
}

async function handleSumitRecurringCanceled(tenant: string, body: any) {
  const recurringPaymentId = body.RecurringPaymentId?.toString();
  if (!recurringPaymentId) return { status: 'no_subscription' };

  const subscription = await findSubscriptionByExternalId(recurringPaymentId, 'sumit');
  if (!subscription) return { status: 'subscription_not_found' };

  return SubscriptionsService.updateSubscriptionStatus(tenant, subscription._id.toString(), 'canceled');
}
