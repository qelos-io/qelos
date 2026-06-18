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
| `dynamicAmount` | `number` | For dynamic plans — the amount set by an admin before checkout |
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
| `pending` | Subscription created but payment not yet confirmed — checkout has not been initiated or completed |
| `active` | Subscription is active and paid |
| `trialing` | In a free trial period |
| `past_due` | Payment failed, awaiting retry |
| `canceled` | Subscription has been canceled |
| `expired` | Trial or subscription period ended without renewal |

## Two-Phase Flow

Subscribing and paying are **two separate operations**. The subscription record is created first (in `pending` status) and the [checkout](./checkout.md) step initiates the provider payment session.

For **static plans** both phases can be collapsed: pass `planId` directly to the checkout endpoint and Qelos creates the pending subscription internally.

For **dynamic plans** the subscription must be created first, an admin must set the `dynamicAmount`, and only then can checkout proceed.

```
User  →  POST /api/subscriptions                        creates pending subscription
Admin →  PUT  /api/subscriptions/:id/dynamic-amount     sets the charge amount
User  →  POST /api/checkout { subscriptionId }          initiates payment
```

## API Endpoints

### Create Subscription

```
POST /api/subscriptions
```

Creates a pending subscription. Regular users can only subscribe their own entity. Admins can create subscriptions for any entity and optionally pre-set `dynamicAmount`.

**Request body (regular user)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `planId` | `string` | yes | ID of the plan to subscribe to |
| `billingCycle` | `"monthly"` \| `"yearly"` | yes | Billing frequency |
| `couponCode` | `string` | no | Coupon code to apply |

**Request body (admin)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `planId` | `string` | yes | |
| `billingCycle` | `"monthly"` \| `"yearly"` | yes | |
| `billableEntityType` | `"user"` \| `"workspace"` | yes | |
| `billableEntityId` | `string` | yes | |
| `dynamicAmount` | `number` | no | Pre-set amount for dynamic plans |
| `couponCode` | `string` | no | |

**Response** — created subscription with `status: "pending"`.

### Get Current Subscription

Returns the active or trialing subscription for the authenticated user/workspace.

```
GET /api/subscriptions/me
```

### List Subscriptions (admin)

```
GET /api/subscriptions
```

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `billableEntityType` | Filter by `user` or `workspace` |
| `billableEntityId` | Filter by specific entity ID |
| `status` | Filter by subscription status |

### Get Subscription

```
GET /api/subscriptions/:id
```

Non-admins can only access their own entity's subscriptions.

### Set Dynamic Amount (admin only)

Sets or updates the charge amount on a pending subscription before checkout. Can also be called during an active subscription period to reprice the next billing cycle.

```
PUT /api/subscriptions/:id/dynamic-amount
```

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | `number` | yes | Positive number in the plan's currency |

### Cancel Subscription

```
PUT /api/subscriptions/:id/cancel
```

Cancels the subscription both locally and at the payment provider. Non-admins can only cancel their own entity's subscriptions.

## SDK Usage

### User SDK

```typescript
// Subscribe to a plan (creates pending subscription)
const subscription = await sdk.payments.subscribeToPlan(
  'plan-id',
  'monthly',
  'COUPON20',  // optional coupon
);

// Get current subscription
const subscription = await sdk.payments.getMySubscription();

// Cancel subscription
await sdk.payments.cancelSubscription('subscription-id');
```

### Admin SDK

```typescript
// Create a subscription on behalf of any entity
const sub = await adminSdk.managePayments.createSubscription({
  planId: 'plan-id',
  billingCycle: 'monthly',
  billableEntityType: 'workspace',
  billableEntityId: 'workspace-id',
});

// Set the dynamic amount before the user can check out
await adminSdk.managePayments.setSubscriptionDynamicAmount(sub._id, 149.00);

// List all active subscriptions
const subs = await adminSdk.managePayments.getSubscriptions({
  status: 'active',
});

// Get specific subscription
const sub = await adminSdk.managePayments.getSubscription('sub-id');

// Cancel any subscription
await adminSdk.managePayments.cancelSubscription('sub-id');
```

## Webhook-Driven Updates

Subscription status is primarily updated via provider webhooks. When a payment provider sends a webhook event:

1. The webhook handler identifies the subscription by `externalSubscriptionId`
2. Status is updated according to the event type (e.g. payment completed → `active`, payment failed → `past_due`)
3. A webhook event record is created for idempotency — duplicate events are safely ignored

See [Checkout](./checkout.md) for the full payment flow and webhook details.
