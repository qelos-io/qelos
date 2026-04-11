---
title: Payments API
editLink: true
---
# Payments API

Endpoints for managing plans, subscriptions, invoices, checkout, and coupons.

> **SDK equivalent:** [`sdk.payments`](/sdk/basic_usage)

## List Plans

Retrieve available subscription plans.

```
GET /api/plans/public
```

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `isActive` | `boolean` | Filter by active/inactive plans |

### Response

```json
[
  {
    "_id": "plan-id",
    "name": "Pro Plan",
    "price": 29.99,
    "interval": "month",
    "isActive": true,
    "features": ["feature1", "feature2"]
  }
]
```

> **SDK:** [`sdk.payments.getPlans(query)`](/sdk/basic_usage)

---

## Get Plan

Retrieve a specific plan by ID.

```
GET /api/plans/{planId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `planId` | `string` | The plan ID |

### Response

Returns the plan object.

> **SDK:** [`sdk.payments.getPlan(planId)`](/sdk/basic_usage)

---

## Checkout

Initiate a checkout session for a subscription.

```
POST /api/checkout
```

### Request Body

```json
{
  "planId": "plan-id",
  "billingCycle": "monthly",
  "successUrl": "https://your-app.com/success",
  "cancelUrl": "https://your-app.com/cancel",
  "couponCode": "SAVE20"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `planId` | `string` | Yes | The plan to subscribe to |
| `billingCycle` | `string` | Yes | Billing cycle (e.g., `"monthly"`, `"yearly"`) |
| `successUrl` | `string` | No | Redirect URL on successful checkout |
| `cancelUrl` | `string` | No | Redirect URL on cancelled checkout |
| `couponCode` | `string` | No | Coupon code to apply |

### Response

```json
{
  "subscriptionId": "subscription-id",
  "checkoutUrl": "https://payment-provider.com/checkout/session-id",
  "clientToken": "client-token"
}
```

> **SDK:** [`sdk.payments.checkout(params)`](/sdk/basic_usage)

---

## Get My Subscription

Retrieve the current user's active subscription.

```
GET /api/subscriptions/me
```

### Response

```json
{
  "_id": "subscription-id",
  "plan": "plan-id",
  "status": "active",
  "currentPeriodStart": "2025-01-01T00:00:00.000Z",
  "currentPeriodEnd": "2025-02-01T00:00:00.000Z"
}
```

> **SDK:** [`sdk.payments.getMySubscription()`](/sdk/basic_usage)

---

## Cancel Subscription

Cancel an active subscription.

```
PUT /api/subscriptions/{subscriptionId}/cancel
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `subscriptionId` | `string` | The subscription ID |

### Response

Returns the updated subscription object with cancelled status.

> **SDK:** [`sdk.payments.cancelSubscription(subscriptionId)`](/sdk/basic_usage)

---

## List Invoices

Retrieve invoices for the current user.

```
GET /api/invoices
```

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `status` | `string` | Filter by invoice status |

### Response

```json
[
  {
    "_id": "invoice-id",
    "amount": 29.99,
    "status": "paid",
    "created": "2025-01-01T00:00:00.000Z"
  }
]
```

> **SDK:** [`sdk.payments.getInvoices(query)`](/sdk/basic_usage)

---

## Get Invoice

Retrieve a specific invoice by ID.

```
GET /api/invoices/{invoiceId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `invoiceId` | `string` | The invoice ID |

### Response

Returns the invoice object.

> **SDK:** [`sdk.payments.getInvoice(invoiceId)`](/sdk/basic_usage)

---

## Validate Coupon

Validate a coupon code, optionally against a specific plan.

```
POST /api/coupons/validate
```

### Request Body

```json
{
  "code": "SAVE20",
  "planId": "plan-id"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | Yes | The coupon code to validate |
| `planId` | `string` | No | Plan ID to validate the coupon against |

### Response

Returns the coupon object if valid.

```json
{
  "_id": "coupon-id",
  "code": "SAVE20",
  "discount": 20,
  "discountType": "percentage",
  "isActive": true
}
```

> **SDK:** [`sdk.payments.validateCoupon(code, planId)`](/sdk/basic_usage)
