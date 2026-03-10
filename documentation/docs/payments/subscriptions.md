---
title: Subscriptions
---

# Subscriptions

Subscriptions track which user or workspace is subscribed to a plan, including billing cycle, status, and provider details.

## Subscription Structure

| Field | Type | Description |
|-------|------|-------------|
| `planId` | `string` | Reference to the plan |
| `billableEntityType` | `"user"` \| `"workspace"` | B2C or B2B billing target |
| `billableEntityId` | `string` | User or workspace ID |
| `status` | `string` | Current lifecycle status |
| `billingCycle` | `"monthly"` \| `"yearly"` | Billing interval |
| `currentPeriodStart` | `Date` | Start of current billing period |
| `currentPeriodEnd` | `Date` | End of current billing period |
| `externalSubscriptionId` | `string` | Provider-side subscription ID |
| `providerKind` | `string` | Payment provider (e.g. `"paddle"`) |
| `couponId` | `string` | Applied coupon, if any |

## Status Lifecycle

```
pending → active → canceled
                 → past_due → active (payment retry succeeds)
                            → canceled (payment retries exhausted)
         trialing → active
                  → expired
```

| Status | Description |
|--------|-------------|
| `pending` | Checkout initiated but payment not yet confirmed |
| `active` | Subscription is active and paid |
| `trialing` | In a free trial period |
| `past_due` | Payment failed, awaiting retry |
| `canceled` | Subscription has been canceled |
| `expired` | Trial or subscription period ended without renewal |

## API Endpoints

### Get Current Subscription

Returns the active subscription for the authenticated user/workspace.

```
GET /api/subscriptions/me
```

### Cancel Subscription

```
PUT /api/subscriptions/:id/cancel
```

Cancels the subscription both locally and at the payment provider.

### Admin: List Subscriptions

```
GET /api/subscriptions?billableEntityType=user&status=active
```

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `billableEntityType` | Filter by `user` or `workspace` |
| `billableEntityId` | Filter by specific entity |
| `status` | Filter by subscription status |

### Admin: Get Subscription

```
GET /api/subscriptions/:id
```

## SDK Usage

### Public SDK

```typescript
// Get current subscription
const subscription = await sdk.payments.getMySubscription();

// Cancel subscription
await sdk.payments.cancelSubscription('subscription-id');
```

### Admin SDK

```typescript
// List all active subscriptions
const subs = await adminSdk.managePayments.getSubscriptions({
  status: 'active',
});

// Get specific subscription
const sub = await adminSdk.managePayments.getSubscription('sub-id');

// Cancel a subscription
await adminSdk.managePayments.cancelSubscription('sub-id');
```

## Webhook-Driven Updates

Subscription status is primarily updated via provider webhooks. When a payment provider sends a webhook event:

1. The webhook handler identifies the subscription by `externalSubscriptionId`
2. Status is updated according to the event type (e.g. payment completed → `active`, payment failed → `past_due`)
3. A webhook event record is created for idempotency — duplicate events are safely ignored

See [Checkout](./checkout.md) for the full payment flow.
