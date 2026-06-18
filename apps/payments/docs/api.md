# Payments API

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

### Dynamic Pricing Flow

```
User  →  POST /api/subscriptions          (creates pending subscription)
Admin →  PUT  /api/subscriptions/:id/dynamic-amount  (sets the charge amount)
User  →  POST /api/checkout { subscriptionId }       (initiates payment)
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

---

### `GET /api/plans/:planId`

Returns a single plan.

**Auth**: authenticated

**Response `200`** — plan object.

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `PLAN_NOT_FOUND` | 404 | No plan with the given ID |

---

### `POST /api/plans` (admin)

Create a plan.

**Auth**: admin

**Request body** — plan fields (see `IPlan` type).

**Response `200`** — created plan object.

---

### `PUT /api/plans/:planId` (admin)

Update a plan.

**Auth**: admin

**Request body** — partial plan fields.

**Response `200`** — updated plan object.

---

### `DELETE /api/plans/:planId` (admin)

Delete a plan.

**Auth**: admin

**Response `200`** — deleted plan object.

---

## Subscriptions

### `GET /api/subscriptions`

List subscriptions.

**Auth**: authenticated

Regular users see only their own entity's subscriptions. Admins can filter by any entity.

**Query parameters**

| Name | Type | Description |
|---|---|---|
| `billableEntityType` | `user` \| `workspace` | Filter by entity type (admin only) |
| `billableEntityId` | string | Filter by entity ID (admin only) |
| `status` | `pending` \| `active` \| `trialing` \| `canceled` \| `past_due` | Filter by status |

**Response `200`** — array of subscription objects.

---

### `GET /api/subscriptions/me`

Returns the current user's active or trialing subscription.

**Auth**: authenticated

**Response `200`** — subscription object or `null`.

---

### `GET /api/subscriptions/:id`

Returns a single subscription.

**Auth**: authenticated (non-admins can only access their own entity's subscriptions)

**Response `200`** — subscription object.

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `SUBSCRIPTION_NOT_FOUND` | 404 | No subscription with the given ID |
| — | 403 | Access denied (non-admin requesting another entity's subscription) |

---

### `POST /api/subscriptions`

Create a pending subscription.

**Auth**: authenticated

Regular users can only create subscriptions for their own entity. The fields `dynamicAmount`, `providerKind`, `providerId`, `status`, `billableEntityType`, and `billableEntityId` are ignored from the request body for non-admins — the server derives them from the authenticated user.

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

---

### `PUT /api/subscriptions/:id/dynamic-amount` (admin)

Set or update the dynamic amount on a pending subscription. Must be called before a user can complete checkout on a dynamic plan. Can also be called during an active subscription period to reprice the next billing cycle.

**Auth**: admin

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `amount` | number | yes | Positive number representing the charge amount |

**Response `200`** — updated subscription object.

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `SUBSCRIPTION_NOT_FOUND` | 404 | No subscription with the given ID |
| `INVALID_AMOUNT` | 400 | Amount must be a positive number |

---

### `PUT /api/subscriptions/:id/cancel`

Cancel a subscription.

**Auth**: authenticated (non-admins can only cancel their own entity's subscriptions)

**Response `200`** — updated subscription object with `status: "canceled"`.

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `SUBSCRIPTION_NOT_FOUND` | 404 | |
| — | 403 | Access denied |

---

## Checkout

### `POST /api/checkout`

Initiate a payment provider checkout session.

**Auth**: authenticated

Returns a `checkoutUrl` (redirect-based providers: Paddle, PayPal) or a `clientToken` (SDK-based providers: Sumit) along with the `subscriptionId`.

**Request body**

Either `subscriptionId` **or** `planId` is required.

| Field | Type | Required | Description |
|---|---|---|---|
| `subscriptionId` | string | conditional | ID of an existing `pending` subscription. Required for dynamic plans. When provided, all plan/entity fields are read from the subscription. |
| `planId` | string | conditional | Plan ID. Used for inline checkout of static plans (no prior `subscribeToPlan` call needed). Ignored when `subscriptionId` is provided. |
| `billingCycle` | `monthly` \| `yearly` | conditional | Required when using the inline `planId` path. |
| `billableEntityType` | `user` \| `workspace` | no | Defaults to the authenticated user's entity type. Admin-only override. |
| `billableEntityId` | string | no | Defaults to the authenticated user's entity ID. Admin-only override. |
| `couponCode` | string | no | Discount coupon code. |
| `successUrl` | string | no | Override the redirect URL on payment success. Falls back to tenant payment configuration. |
| `cancelUrl` | string | no | Override the redirect URL on payment cancellation. |
| `amount` | number | no | **Admin only.** For dynamic plans: triggers admin convenience mode — creates a pending subscription with this amount, then immediately initiates checkout. Ignored for non-admins. |

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
| `DYNAMIC_PLAN_UNSUPPORTED_PROVIDER` | 400 | Dynamic plans are only supported with the Sumit payment provider |
| `SUBSCRIPTION_NOT_PENDING` | 400 | The referenced subscription is not in `pending` status |
| `ACTIVE_SUBSCRIPTION_EXISTS` | 409 | The billable entity already has an active or trialing subscription |
| `PAYMENTS_NOT_CONFIGURED` | 500 | Tenant has no payment provider configured |
| `MISSING_EXTERNAL_PRICE_ID` | 400 | Plan has no external price ID for the configured provider |
| `UNSUPPORTED_PROVIDER` | 400 | The configured payment provider is not supported |
| `COUPON_NOT_FOUND` | 400 | Coupon code does not exist |
| `COUPON_EXPIRED` | 400 | Coupon has passed its expiry date |
| `COUPON_NOT_YET_VALID` | 400 | Coupon is not yet valid |
| `COUPON_MAX_REDEMPTIONS` | 400 | Coupon has reached its redemption limit |
| `COUPON_NOT_APPLICABLE` | 400 | Coupon does not apply to this plan |

---

### `PUT /api/checkout/:subscriptionId/cancel`

Cancel a subscription initiated through checkout.

**Auth**: authenticated (non-admins can only cancel their own entity's subscriptions)

Attempts to cancel the subscription with the external payment provider before marking it as `canceled` locally.

**Response `200`** — updated subscription object.

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `SUBSCRIPTION_NOT_FOUND` | 404 | |
| — | 403 | Access denied |

---

## Invoices

### `GET /api/invoices`

List invoices.

**Auth**: authenticated

Non-admins see only their own entity's invoices.

**Query parameters (admin only)**

| Name | Type | Description |
|---|---|---|
| `billableEntityType` | `user` \| `workspace` | |
| `billableEntityId` | string | |
| `status` | `paid` \| `open` \| `void` | |

**Response `200`** — array of invoice objects.

---

### `GET /api/invoices/:invoiceId`

Returns a single invoice.

**Auth**: authenticated

**Response `200`** — invoice object.

---

## Coupons

### `POST /api/coupons/validate`

Validate a coupon code before checkout.

**Auth**: authenticated

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | yes | Coupon code |
| `planId` | string | no | When provided, validates that the coupon applies to this plan |

**Response `200`** — coupon object with discount details.

**Errors**

| Code | HTTP | Description |
|---|---|---|
| `COUPON_NOT_FOUND` | 400 | |
| `COUPON_EXPIRED` | 400 | |
| `COUPON_NOT_YET_VALID` | 400 | |
| `COUPON_MAX_REDEMPTIONS` | 400 | |
| `COUPON_NOT_APPLICABLE` | 400 | Coupon does not apply to the given plan |

---

### `GET /api/coupons` (admin)

List coupons.

**Auth**: admin

**Query parameters**

| Name | Type | Description |
|---|---|---|
| `isActive` | boolean | Filter by active status |

**Response `200`** — array of coupon objects.

---

### `POST /api/coupons` (admin)

Create a coupon.

**Auth**: admin

**Response `200`** — created coupon object.

---

### `PUT /api/coupons/:couponId` (admin)

Update a coupon.

**Auth**: admin

**Response `200`** — updated coupon object.

---

### `DELETE /api/coupons/:couponId` (admin)

Delete a coupon.

**Auth**: admin

**Response `200`** — deleted coupon object.

---

## Webhooks

### `POST /api/payments/webhooks/:providerKind`

Receives payment provider webhook events. Verifies the webhook signature and updates subscription/invoice state accordingly.

**Auth**: none (provider-signed payload)

**Path parameters**

| Name | Description |
|---|---|
| `providerKind` | Payment provider identifier (`stripe`, `paddle`, `paypal`, `sumit`) |
