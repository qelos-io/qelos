---
title: Payments API
editLink: true
---

# Payments API

Endpoints for managing plans, subscriptions, invoices, checkout, and coupons.

> **SDK guide:** [Payments SDK](/sdk/payments) · **Detailed docs:** [Payments](/payments/)

## Authentication

All endpoints require a `tenant` header identifying the tenant.

- **Authenticated** — any logged-in user (workspace member or individual user).
- **Admin / Privileged** — only users with `isPrivileged: true` (admins, service accounts).

---

## Two-Phase Flow

Subscribing and paying are two separate operations:

1. **Subscribe** — create a `pending` subscription record (`POST /api/subscriptions`).
2. **Checkout** — initiate a provider payment session (`POST /api/checkout`).

For **static plans** the steps can be collapsed into a single `POST /api/checkout` call.
For **dynamic plans** step 1 is mandatory and an admin must set the amount before step 2 can proceed.

```
User  →  POST /api/subscriptions                       creates pending subscription
Admin →  PUT  /api/subscriptions/:id/dynamic-amount    sets the charge amount
User  →  POST /api/checkout { subscriptionId }         initiates payment
```

---

## Plans

### `GET /api/plans/public`

Returns plans visible to the public (no authentication required).

**Query parameters**

| Name | Type | Description |
|---|---|---|
| `isActive` | boolean | Filter by active status |

**Response `200`**
```json
[
  {
    "_id": "plan_id",
    "name": "Pro",
    "monthlyPrice": 29,
    "yearlyPrice": 290,
    "currency": "USD",
    "dynamic": false,
    "isActive": true
  }
]
```

> **SDK:** `sdk.payments.getPlans(query)`

---

### `GET /api/plans/:planId`

Returns a single plan. **Auth**: authenticated.

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `PLAN_NOT_FOUND` | 404 | No plan with the given ID |

> **SDK:** `sdk.payments.getPlan(planId)`

---

### `POST /api/plans` <Badge type="warning" text="admin" />

Create a plan. **Auth**: admin.

**Request body** — plan fields (see `IPlan` type in [global-types](/api/api)).

**Response `200`** — created plan object.

> **SDK:** `adminSdk.managePayments.createPlan(data)`

---

### `PUT /api/plans/:planId` <Badge type="warning" text="admin" />

Update a plan. **Auth**: admin.

**Response `200`** — updated plan object.

> **SDK:** `adminSdk.managePayments.updatePlan(planId, data)`

---

### `DELETE /api/plans/:planId` <Badge type="warning" text="admin" />

Delete a plan. **Auth**: admin.

> **SDK:** `adminSdk.managePayments.deletePlan(planId)`

---

## Subscriptions

### `GET /api/subscriptions/me`

Returns the current user's active or trialing subscription. **Auth**: authenticated.

**Response `200`** — subscription object or `null`.

> **SDK:** `sdk.payments.getMySubscription()`

---

### `GET /api/subscriptions`

List subscriptions. **Auth**: authenticated. Regular users see only their own entity's subscriptions. Admins can filter by any entity.

**Query parameters**

| Name | Type | Description |
|---|---|---|
| `billableEntityType` | `user` \| `workspace` | Filter by entity type (admin only) |
| `billableEntityId` | string | Filter by entity ID (admin only) |
| `status` | `pending` \| `active` \| `trialing` \| `canceled` \| `past_due` | Filter by status |

> **SDK:** `adminSdk.managePayments.getSubscriptions(query)`

---

### `GET /api/subscriptions/:id`

Returns a single subscription. **Auth**: authenticated (non-admins can only access their own entity's subscriptions).

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `SUBSCRIPTION_NOT_FOUND` | 404 | No subscription with the given ID |
| — | 403 | Access denied |

> **SDK:** `adminSdk.managePayments.getSubscription(subscriptionId)`

---

### `POST /api/subscriptions`

Create a pending subscription. **Auth**: authenticated.

Regular users can only create subscriptions for their own entity. Fields `dynamicAmount`, `providerKind`, `billableEntityType`, and `billableEntityId` are ignored from the request body for non-admins — the server derives them from the authenticated user.

**Request body (regular user)**

| Field | Type | Required | Description |
|---|---|---|---|
| `planId` | string | yes | ID of the plan to subscribe to |
| `billingCycle` | `monthly` \| `yearly` | yes | Billing frequency |
| `couponCode` | string | no | Coupon to apply |

**Request body (admin)**

| Field | Type | Required | Description |
|---|---|---|---|
| `planId` | string | yes | |
| `billingCycle` | `monthly` \| `yearly` | yes | |
| `billableEntityType` | `user` \| `workspace` | yes | |
| `billableEntityId` | string | yes | |
| `dynamicAmount` | number | no | Pre-set dynamic amount (dynamic plans only) |
| `couponCode` | string | no | |

**Response `200`** — created subscription object with `status: "pending"`.

> **SDK (user):** `sdk.payments.subscribeToPlan(planId, billingCycle, couponCode?)`  
> **SDK (admin):** `adminSdk.managePayments.createSubscription(data)`

---

### `PUT /api/subscriptions/:id/dynamic-amount` <Badge type="warning" text="admin" />

Set or update the dynamic amount on a pending subscription. Must be called before checkout for dynamic plans. Can also update the amount on an active subscription to reprice the next billing cycle.

**Auth**: admin.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `amount` | number | yes | Positive number representing the charge amount |

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `SUBSCRIPTION_NOT_FOUND` | 404 | No subscription with the given ID |
| `INVALID_AMOUNT` | 400 | Amount must be a positive number |

> **SDK:** `adminSdk.managePayments.setSubscriptionDynamicAmount(subscriptionId, amount)`

---

### `PUT /api/subscriptions/:id/cancel`

Cancel a subscription. **Auth**: authenticated (non-admins can only cancel their own entity's subscriptions).

**Response `200`** — updated subscription object with `status: "canceled"`.

> **SDK (user):** `sdk.payments.cancelSubscription(subscriptionId)`  
> **SDK (admin):** `adminSdk.managePayments.cancelSubscription(subscriptionId)`

---

## Checkout

### `POST /api/checkout`

Initiate a payment provider checkout session. **Auth**: authenticated.

Returns a `checkoutUrl` (redirect-based providers: Paddle, PayPal) or a `clientToken` (SDK-based providers: Sumit) along with the `subscriptionId`.

Either `subscriptionId` **or** `planId` is required.

| Field | Type | Required | Description |
|---|---|---|---|
| `subscriptionId` | string | conditional | ID of an existing `pending` subscription. Required for dynamic plans. All plan/entity data is read from the subscription. |
| `planId` | string | conditional | Plan ID for inline checkout of static plans. Ignored when `subscriptionId` is provided. |
| `billingCycle` | `monthly` \| `yearly` | conditional | Required when using the `planId` path. |
| `billableEntityType` | `user` \| `workspace` | no | Admin-only override. |
| `billableEntityId` | string | no | Admin-only override. |
| `couponCode` | string | no | Discount coupon code. |
| `successUrl` | string | no | Override the redirect URL on success. Falls back to tenant payment configuration. |
| `cancelUrl` | string | no | Override the redirect URL on cancellation. |
| `amount` | number | no | **Admin only.** For dynamic plans: creates a pending subscription with this amount and immediately initiates checkout. |

**Response `200`**

```json
{
  "subscriptionId": "sub_id",
  "checkoutUrl": "https://checkout.provider.com/session/xxx",
  "clientToken": null
}
```

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `PLAN_NOT_FOUND` | 404 | Plan does not exist |
| `PLAN_NOT_ACTIVE` | 400 | Plan is inactive |
| `DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION` | 400 | Dynamic plan checkout requires a pre-created subscription with `dynamicAmount` set by an admin |
| `DYNAMIC_AMOUNT_NOT_SET` | 400 | The subscription's `dynamicAmount` is missing or ≤ 0 |
| `SUBSCRIPTION_NOT_PENDING` | 400 | The referenced subscription is not in `pending` status |
| `ACTIVE_SUBSCRIPTION_EXISTS` | 409 | The entity already has an active or trialing subscription |
| `PAYMENTS_NOT_CONFIGURED` | 500 | Tenant has no payment provider configured |
| `MISSING_EXTERNAL_PRICE_ID` | 400 | Plan has no external price ID for the configured provider |
| `UNSUPPORTED_PROVIDER` | 400 | The configured payment provider is not supported |
| `COUPON_NOT_FOUND` | 400 | Coupon code does not exist |
| `COUPON_EXPIRED` | 400 | Coupon has passed its expiry date |
| `COUPON_NOT_YET_VALID` | 400 | Coupon is not yet valid |
| `COUPON_MAX_REDEMPTIONS` | 400 | Coupon has reached its redemption limit |
| `COUPON_NOT_APPLICABLE` | 400 | Coupon does not apply to this plan |

> **SDK (user):** `sdk.payments.checkout(params)`  
> **SDK (admin):** `adminSdk.managePayments.checkout(params)`

---

### `PUT /api/checkout/:subscriptionId/cancel`

Cancel a subscription initiated through checkout. Attempts provider-side cancellation before marking it locally. **Auth**: authenticated (non-admins can only cancel their own entity's subscriptions).

---

## Invoices

### `GET /api/invoices`

List invoices. **Auth**: authenticated. Non-admins see only their own entity's invoices.

**Query parameters (admin only)**

| Name | Type | Description |
|---|---|---|
| `billableEntityType` | `user` \| `workspace` | |
| `billableEntityId` | string | |
| `status` | `paid` \| `open` \| `void` | |

> **SDK (user):** `sdk.payments.getInvoices(query)`  
> **SDK (admin):** `adminSdk.managePayments.getInvoices(query)`

---

### `GET /api/invoices/:invoiceId`

Returns a single invoice. **Auth**: authenticated.

> **SDK:** `sdk.payments.getInvoice(invoiceId)`

---

## Coupons

### `POST /api/coupons/validate`

Validate a coupon code before checkout. **Auth**: authenticated.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | yes | Coupon code |
| `planId` | string | no | Validates that the coupon applies to this plan |

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `COUPON_NOT_FOUND` | 400 | |
| `COUPON_EXPIRED` | 400 | |
| `COUPON_NOT_YET_VALID` | 400 | |
| `COUPON_MAX_REDEMPTIONS` | 400 | |
| `COUPON_NOT_APPLICABLE` | 400 | Coupon does not apply to the given plan |

> **SDK:** `sdk.payments.validateCoupon(code, planId?)`

---

### `GET /api/coupons` <Badge type="warning" text="admin" />

List coupons. **Auth**: admin.

| Name | Type | Description |
|---|---|---|
| `isActive` | boolean | Filter by active status |

> **SDK:** `adminSdk.managePayments.getCoupons(query)`

---

### `POST /api/coupons` <Badge type="warning" text="admin" />

Create a coupon. **Auth**: admin.

> **SDK:** `adminSdk.managePayments.createCoupon(data)`

---

### `PUT /api/coupons/:couponId` <Badge type="warning" text="admin" />

Update a coupon. **Auth**: admin.

> **SDK:** `adminSdk.managePayments.updateCoupon(couponId, data)`

---

### `DELETE /api/coupons/:couponId` <Badge type="warning" text="admin" />

Delete a coupon. **Auth**: admin.

> **SDK:** `adminSdk.managePayments.deleteCoupon(couponId)`

---

## Webhooks

### `POST /api/payments/webhooks/:providerKind`

Receives payment provider webhook events. Verifies the webhook signature and updates subscription/invoice state.

**Auth**: none (provider-signed payload).

| `:providerKind` | Description |
|---|---|
| `sumit` | Sumit recurring payment events |
| `paypal` | PayPal Billing subscription events |
| `paddle` | Paddle subscription and transaction events |

All events are tracked for idempotency — duplicates are safely ignored.
