---
title: Platform Events
---

# Payments Platform Events

When checkout, provider API calls, or payment webhooks fail, Qelos dispatches structured **platform events** to the tenant Events log. Admins can filter these in **Admin → Events** or query them programmatically via the administrator SDK.

Events are **non-blocking** (failures in dispatch never affect the payment request) and **sanitized** — card numbers, API keys, credentials, and webhook secrets are stripped from metadata before persistence.

## Event taxonomy

| Event name | Kind | Source | When it is emitted |
|------------|------|--------|--------------------|
| `checkout-failed` | `checkout` | `payments` or `payments:{provider}` | Checkout validation fails, plan/subscription preconditions are not met, or checkout cancellation fails |
| `provider-call-failed` | `provider` | `payments` or `payments:{provider}` | A payment-provider integration call fails (e.g. create subscription, create recurring payment, cancel subscription) |
| `payment-method-save-failed` | `provider` | `payments:sumit` | Sumit `setPaymentDetails` fails when saving a credit card |
| `payment-failed` | `webhook` | `payments` or `payments:{provider}` | A provider webhook reports a failed or past-due payment |
| `webhook-processing-failed` | `webhook` | `payments` or `payments:{provider}` | Webhook signature verification, tenant resolution, or event handling fails |

### Source values

| Source | Meaning |
|--------|---------|
| `payments` | Generic payments event (no provider context, or provider unknown) |
| `payments:sumit` | Sumit-specific — filter here for Israeli card/recurring-payment issues |
| `payments:paddle` | Paddle checkout or webhook failures |
| `payments:paypal` | PayPal checkout or webhook failures |
| `payments:dodopayments` | DodoPayments checkout or webhook failures |

Provider-specific sources (`payments:sumit`, etc.) are used when `providerKind` is known at emit time. Use the generic `payments` source to see failures across all providers.

## Metadata fields

Every payment event includes a sanitized `metadata` object:

| Field | Type | Description |
|-------|------|-------------|
| `providerKind` | `string` | Payment provider (`sumit`, `paddle`, `paypal`, `dodopayments`, …) |
| `operation` | `string` | Operation that failed — see [Operations](#operations) below |
| `code` | `string` | Application or provider error code (e.g. `PLAN_NOT_ACTIVE`, `MISSING_EXTERNAL_PRICE_ID`) |
| `subscriptionId` | `string` | Internal Qelos subscription ID |
| `planId` | `string` | Plan ID involved in the checkout |
| `billableEntityType` | `"user"` \| `"workspace"` | Who is being billed |
| `billableEntityId` | `string` | User or workspace ID |
| `externalSubscriptionId` | `string` | Provider-side subscription / recurring-payment ID |
| `externalEventId` | `string` | Provider webhook event ID (webhook events only) |
| `couponCode` | `string` | Coupon applied during checkout (checkout events only) |
| `providerResponse` | `object` | Sanitized provider response body or summary |
| `error` | `object` | Serialized error — see [Error object](#error-object) |

Sensitive keys (`Credentials`, card fields, API keys, secrets) are never stored.

### Error object

The `metadata.error` field contains:

| Field | Description |
|-------|-------------|
| `message` | Human-readable error message |
| `code` | Error code when available |
| `type` | Error type when available |
| `status` | HTTP status from provider responses |
| `responseData` | Sanitized provider error payload |
| `stack` | Stack trace (non-production environments only) |

## Operations

The `metadata.operation` field identifies where the failure occurred:

### Checkout (`checkout-failed`)

| Operation | Typical `code` values |
|-----------|----------------------|
| `initiateCheckout` | `PLAN_NOT_ACTIVE`, `DYNAMIC_AMOUNT_NOT_SET`, `SUBSCRIPTION_NOT_PENDING`, `ACTIVE_SUBSCRIPTION_EXISTS`, `PAYMENTS_NOT_CONFIGURED`, `MISSING_EXTERNAL_PRICE_ID`, `UNSUPPORTED_PROVIDER`, `DYNAMIC_PLAN_UNSUPPORTED_PROVIDER`, coupon validation codes |
| `cancelCheckoutSubscription` | Provider cancellation errors, `ACCESS_DENIED`, `SUBSCRIPTION_NOT_FOUND` |

Controller-level validation (before service logic) also emits `checkout-failed` with operation `initiateCheckout`:

| Code | Meaning |
|------|---------|
| `MISSING_CHECKOUT_TARGET` | Neither `subscriptionId` nor `planId` provided |
| `MISSING_BILLING_CYCLE` | `billingCycle` required but missing |
| `INVALID_BILLING_CYCLE` | `billingCycle` is not `monthly` or `yearly` |
| `MISSING_BILLABLE_ENTITY` | Could not resolve user/workspace entity |

### Provider API (`provider-call-failed`, `payment-method-save-failed`)

| Operation | Provider | Event name |
|-----------|----------|------------|
| `getPaymentsConfiguration` | any | `provider-call-failed` |
| `createRecurringPayment` | Sumit | `provider-call-failed` |
| `setPaymentDetails` | Sumit | `payment-method-save-failed` |
| `createSubscription` | Paddle, PayPal, DodoPayments | `provider-call-failed` |
| `cancelSubscription` / `deleteRecurringPayment` | any | `provider-call-failed` |
| `verifyWebhookSignature` | PayPal | `provider-call-failed` |

### Webhooks (`payment-failed`, `webhook-processing-failed`)

| Operation | Event name | Meaning |
|-----------|------------|---------|
| `payment-failed` | `payment-failed` | Provider reported a failed charge (Paddle `transaction.payment_failed`, PayPal `BILLING.SUBSCRIPTION.PAYMENT.FAILED`, Sumit `payment_failed` / `RecurringPaymentFailed`, DodoPayments payment failure) |
| `verifySignature` | `webhook-processing-failed` | Webhook signature invalid or missing |
| `resolveTenant` | `webhook-processing-failed` | Could not resolve tenant from webhook payload |
| `getWebhookSecret` | `webhook-processing-failed` | Webhook secret not configured |
| `validateWebhook` | `webhook-processing-failed` | Malformed or unrecognised webhook payload |
| `processWebhook` | `webhook-processing-failed` | Unhandled error during webhook processing |
| `handleEvent` | `webhook-processing-failed` | Unhandled provider event type |

## Filtering in Admin

Open **Admin → Events** and use the source/kind/event filters. Payment events appear under source `payments` or `payments:sumit` (and other provider-specific sources). The event catalog in the admin UI lists all registered payment event names.

## SDK example

Use the administrator SDK to query the Events log from scripts, cron jobs, or support tooling:

```typescript
import QelosAdminSDK from '@qelos/sdk/administrator';

const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://your-app.qelos.app',
  fetch: globalThis.fetch,
});

await sdkAdmin.authentication.oAuthSignin({ username, password });

// All webhook-reported payment failures across providers
const paymentFailures = await sdkAdmin.events.getList({
  source: 'payments',
  eventName: 'payment-failed',
});

// Sumit credit-card save failures only
const cardSaveFailures = await sdkAdmin.events.getList({
  source: 'payments:sumit',
  eventName: 'payment-method-save-failed',
});

// Checkout validation errors in the last 24 hours
const checkoutErrors = await sdkAdmin.events.getList({
  source: 'payments',
  kind: 'checkout',
  eventName: 'checkout-failed',
  period: '24h',
});
```

Each returned event includes `description`, `metadata`, `user`, `created`, and other standard `IQelosEvent` fields.

## Sumit troubleshooting

Sumit is the primary provider for **dynamic plans** and **SDK-based checkout** (`clientToken`). Use provider-specific filters to narrow down failures.

### Failed credit-card capture (`payment-method-save-failed`)

**Symptoms:** User submits card details; save fails before or during checkout.

**Filter:**

```typescript
await sdkAdmin.events.getList({
  source: 'payments:sumit',
  eventName: 'payment-method-save-failed',
});
```

**What to inspect:**

- `metadata.operation` — always `setPaymentDetails`
- `metadata.error.status` / `metadata.error.responseData` — Sumit HTTP status and error body (credentials stripped)
- `metadata.code` — Sumit `Status` field when present

**Common causes:** Invalid or expired card, Sumit API key / Company ID misconfiguration, customer record missing in Sumit.

### Checkout initiation failure (`checkout-failed` or `provider-call-failed`)

**Symptoms:** `POST /api/checkout` returns an error; user never reaches the Sumit payment page.

**Filters:**

```typescript
// Validation / plan issues before calling Sumit
await sdkAdmin.events.getList({
  source: 'payments:sumit',
  kind: 'checkout',
  eventName: 'checkout-failed',
});

// Sumit API rejected createRecurringPayment
await sdkAdmin.events.getList({
  source: 'payments:sumit',
  kind: 'provider',
  eventName: 'provider-call-failed',
});
```

**What to inspect:**

- `checkout-failed` — check `metadata.code` (`DYNAMIC_AMOUNT_NOT_SET`, `PLAN_NOT_ACTIVE`, etc.)
- `provider-call-failed` with `metadata.operation` = `createRecurringPayment` — Sumit rejected the recurring payment setup; inspect `metadata.providerResponse` and `metadata.error.responseData`

### Webhook-reported payment failure (`payment-failed`)

**Symptoms:** Checkout succeeded initially but a recurring charge later failed; subscription moves to `past_due`.

**Filter:**

```typescript
await sdkAdmin.events.getList({
  source: 'payments:sumit',
  eventName: 'payment-failed',
});
```

**What to inspect:**

- `metadata.externalEventId` — correlate with Sumit webhook delivery logs
- `metadata.externalSubscriptionId` — match to the Qelos subscription's `externalSubscriptionId`
- `metadata.subscriptionId`, `metadata.planId`, `metadata.billableEntityId` — identify the affected customer

### Webhook processing failure (`webhook-processing-failed`)

**Symptoms:** Sumit sends a webhook but Qelos cannot process it (signature, tenant, or handler error).

**Filter:**

```typescript
await sdkAdmin.events.getList({
  source: 'payments:sumit',
  eventName: 'webhook-processing-failed',
});
```

**What to inspect:**

- `metadata.operation` — `verifySignature`, `resolveTenant`, `handleEvent`, etc.
- `metadata.externalEventId` — provider event ID for deduplication review (duplicate webhooks are ignored for processing but first-failure events are still emitted)

## Related documentation

- [Checkout flow](./checkout.md) — API, error codes, and webhook event types
- [Sumit integration](./sumit.md) — provider setup
- [SDK events reference](/sdk/sdk_reference#events) — full `sdkAdmin.events` API
