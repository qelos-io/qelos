---
title: Checkout
---

# Checkout Flow

The checkout endpoint creates a payment session with the configured provider and returns a URL or token for the user to complete payment.

## Two-Phase Flow

Subscribing and paying are **two separate processes** that do not have to happen together:

1. **Subscribe** — create a pending subscription record (`POST /api/subscriptions`).
2. **Checkout** — initiate a provider payment session (`POST /api/checkout`).

For **static plans** both phases can be collapsed into a single call by passing `planId` directly to the checkout endpoint — Qelos creates the pending subscription internally.

For **dynamic plans** step 1 is mandatory and an **admin must set the `dynamicAmount`** before step 2 can proceed. Users cannot set their own checkout amount.

### Static Plan Flow (one step)

```
User  →  POST /api/checkout { planId, billingCycle }   subscription created + checkout initiated
```

### Dynamic Plan Flow (two steps + admin)

```
User  →  POST /api/subscriptions                       creates pending subscription
Admin →  PUT  /api/subscriptions/:id/dynamic-amount    sets the charge amount
User  →  POST /api/checkout { subscriptionId }         initiates payment
          ↓
Provider checkout page (redirect or SDK)
          ↓
POST /api/payments/webhooks/:providerKind               payment confirmed
          ↓
Subscription status → active, invoice created
```

## API

### Initiate Checkout

```
POST /api/checkout
```

Either `subscriptionId` **or** `planId` is required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscriptionId` | `string` | conditional | ID of an existing `pending` subscription. Required for dynamic plans. All plan/entity data is read from the subscription — no other fields are needed. |
| `planId` | `string` | conditional | Plan ID for inline checkout of static plans (no prior subscribe call needed). Ignored when `subscriptionId` is provided. |
| `billingCycle` | `"monthly"` \| `"yearly"` | conditional | Required when using the `planId` path. |
| `billableEntityType` | `"user"` \| `"workspace"` | no | Admin-only override. Defaults to the authenticated user's entity type. |
| `billableEntityId` | `string` | no | Admin-only override. Defaults to the authenticated user's entity ID. |
| `couponCode` | `string` | no | Discount coupon code. |
| `successUrl` | `string` | no | Override the redirect URL on payment success. Falls back to tenant payment configuration. |
| `cancelUrl` | `string` | no | Override the redirect URL on payment cancellation. |
| `amount` | `number` | no | **Admin only.** For dynamic plans: creates a pending subscription with this amount and immediately initiates checkout. Ignored for non-admins. |

**Response:**

```json
{
  "subscriptionId": "sub-123",
  "checkoutUrl": "https://checkout.paddle.com/...",
  "clientToken": null
}
```

`checkoutUrl` is used for redirect-based providers (Paddle, PayPal). `clientToken` is used for SDK-based providers (Sumit).

### Cancel a Checkout Subscription

```
PUT /api/checkout/:subscriptionId/cancel
```

Cancels the subscription at the payment provider and marks it locally as `canceled`. Non-admins can only cancel their own entity's subscriptions.

### Error Responses

| Code | Status | Description |
|------|--------|-------------|
| `PLAN_NOT_FOUND` | 404 | Plan does not exist |
| `PLAN_NOT_ACTIVE` | 400 | Plan is deactivated |
| `DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION` | 400 | Dynamic plan checkout requires a pre-created subscription with `dynamicAmount` set by an admin |
| `DYNAMIC_AMOUNT_NOT_SET` | 400 | The subscription's `dynamicAmount` is missing or ≤ 0 |
| `SUBSCRIPTION_NOT_PENDING` | 400 | The referenced subscription is not in `pending` status |
| `ACTIVE_SUBSCRIPTION_EXISTS` | 409 | The entity already has an active or trialing subscription |
| `PAYMENTS_NOT_CONFIGURED` | 500 | No payment provider configured for this tenant |
| `MISSING_EXTERNAL_PRICE_ID` | 400 | Plan has no external price ID for the configured provider |
| `UNSUPPORTED_PROVIDER` | 400 | Configured payment provider is not supported |
| `COUPON_NOT_FOUND` | 400 | Coupon code does not exist |
| `COUPON_EXPIRED` | 400 | Coupon has passed its expiry date |
| `COUPON_NOT_YET_VALID` | 400 | Coupon is not yet valid |
| `COUPON_MAX_REDEMPTIONS` | 400 | Coupon has reached its redemption limit |
| `COUPON_NOT_APPLICABLE` | 400 | Coupon does not apply to this plan |

## SDK Usage

See the [Payments SDK guide](/sdk/payments) for complete examples.

### Static plan (user)

```typescript
const { checkoutUrl } = await sdk.payments.checkout({
  planId: 'plan-pro',
  billingCycle: 'yearly',
  couponCode: 'WELCOME',
  successUrl: 'https://myapp.com/success',
  cancelUrl: 'https://myapp.com/cancel',
});

window.location.href = checkoutUrl;
```

### Dynamic plan (user side)

```typescript
// Step 1: subscribe (user)
const sub = await sdk.payments.subscribeToPlan('plan-enterprise', 'monthly');

// Step 2: admin sets amount — see admin SDK
// Step 3: user completes checkout (once admin has set the amount)
const { checkoutUrl } = await sdk.payments.checkout({
  subscriptionId: sub._id,
  successUrl: 'https://myapp.com/success',
});

window.location.href = checkoutUrl;
```

### Dynamic plan (admin convenience shortcut)

```typescript
// Admin creates subscription + initiates checkout in one call
const { checkoutUrl } = await adminSdk.managePayments.checkout({
  planId: 'plan-enterprise',
  billingCycle: 'monthly',
  amount: 149.00,
  billableEntityType: 'workspace',
  billableEntityId: 'workspace-id',
  successUrl: 'https://myapp.com/success',
});
```

## Webhooks

Each provider sends webhooks to confirm payment. The endpoint is:

```
POST /api/payments/webhooks/:providerKind
```

Where `:providerKind` is `paddle`, `paypal`, or `sumit`.

### Idempotency

All webhook events are tracked by their external event ID. Duplicate events are safely ignored and return `{ status: "already_processed" }`.

### Paddle Events

| Event | Action |
|-------|--------|
| `subscription.activated` | Activate subscription, set billing period |
| `subscription.canceled` | Cancel subscription |
| `subscription.past_due` | Mark as past due |
| `transaction.completed` | Create invoice |
| `transaction.payment_failed` | Mark as past due |

### PayPal Events

| Event | Action |
|-------|--------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Activate subscription |
| `BILLING.SUBSCRIPTION.CANCELLED` | Cancel subscription |
| `BILLING.SUBSCRIPTION.EXPIRED` | Mark as expired |
| `PAYMENT.SALE.COMPLETED` | Create invoice |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` | Mark as past due |

### Sumit Events

| Event | Action |
|-------|--------|
| `payment_success` / `RecurringPaymentCharged` | Activate subscription + create invoice |
| `payment_failed` / `RecurringPaymentFailed` | Mark as past due |
| `recurring_canceled` / `RecurringPaymentCanceled` | Cancel subscription |
