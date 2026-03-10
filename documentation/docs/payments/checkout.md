---
title: Checkout
---

# Checkout Flow

The checkout endpoint creates a payment session with the configured provider and returns a URL or token for the user to complete payment.

## Flow Overview

```
1. User selects plan    →  POST /api/checkout
2. Server validates     →  Checks plan, coupon, existing subscription
3. Provider session     →  Creates checkout via integration source
4. Response             →  Returns checkoutUrl / clientToken
5. User pays            →  Redirected to provider checkout page
6. Provider webhook     →  POST /api/payments/webhooks/:providerKind
7. Subscription active  →  Status updated, invoice created
```

## API

### Initiate Checkout

```
POST /api/checkout
```

**Body:**

```json
{
  "planId": "plan-id",
  "billingCycle": "monthly",
  "couponCode": "SAVE20",
  "successUrl": "https://your-app.com/billing/success",
  "cancelUrl": "https://your-app.com/billing"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `planId` | `string` | Yes | ID of the plan to subscribe to |
| `billingCycle` | `"monthly"` \| `"yearly"` | Yes | Billing interval |
| `couponCode` | `string` | No | Discount coupon code |
| `successUrl` | `string` | No | Redirect URL after successful payment |
| `cancelUrl` | `string` | No | Redirect URL if user cancels |

**Response:**

```json
{
  "subscriptionId": "sub-123",
  "checkoutUrl": "https://checkout.paddle.com/...",
  "clientToken": null
}
```

### Error Responses

| Code | Status | Description |
|------|--------|-------------|
| `PLAN_NOT_FOUND` | 404 | Plan does not exist |
| `PLAN_NOT_ACTIVE` | 400 | Plan is deactivated |
| `ACTIVE_SUBSCRIPTION_EXISTS` | 409 | User/workspace already has an active subscription |
| `PAYMENTS_NOT_CONFIGURED` | 500 | No payment provider configured |
| `MISSING_EXTERNAL_PRICE_ID` | 400 | Plan lacks provider-specific price IDs |
| `COUPON_*` | 400 | Various coupon validation errors |

## Webhooks

Each provider sends webhooks to confirm payment status:

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

## SDK Usage

```typescript
// Start checkout
const { checkoutUrl } = await sdk.payments.checkout({
  planId: 'plan-pro',
  billingCycle: 'yearly',
  couponCode: 'WELCOME',
});

// Redirect user
window.location.href = checkoutUrl;

// After redirect back, check subscription status
const subscription = await sdk.payments.getMySubscription();
```

## Cancel Subscription

```typescript
await sdk.payments.cancelSubscription('subscription-id');
```

This cancels the subscription both locally and at the payment provider. For Paddle, cancellation takes effect at the end of the current billing period.
