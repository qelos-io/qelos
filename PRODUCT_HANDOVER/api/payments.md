# Payments & Billing

Subscription plans, checkout, coupons, invoices, and payment provider webhooks.

## What Users Can Do

- **Browse plans**: View public plan catalog for pricing/signup pages
- **Manage plans (admin)**: Create, update, deactivate subscription tiers — including dynamic pricing plans where the charge amount is set per-subscription by an admin
- **Subscribe to a plan**: Create a pending subscription (plan selection step) without entering payment details
- **Start checkout**: Redirect to provider-hosted checkout using a pre-created subscription or inline for fixed-price plans; supports coupons
- **Set dynamic amounts (admin)**: Admins can set a custom charge amount on any pending subscription before the user proceeds to checkout
- **Manage subscriptions**: View, cancel own subscription or admin-manage all
- **View invoices**: List and retrieve billing records
- **Manage coupons (admin)**: Create percentage or fixed discount codes

## Two-Phase Payment Flow

The payment process is separated into two distinct steps:

### Phase 1 — Subscribe to Plan

The user calls `POST /api/subscriptions` to select a plan and create a **pending** subscription. No payment details are collected here. For dynamic plans, the subscription starts with no amount set — an admin must set it before checkout is possible.

### Phase 2 — Checkout

The user calls `POST /api/checkout` with the `subscriptionId` from phase 1 (or inline with `planId` + `billingCycle` for fixed-price plans). The checkout service reads the amount from the subscription (`dynamicAmount` for dynamic plans, plan price for fixed plans) and redirects to the payment provider.

**Dynamic plan checkout gate**: If the plan is `dynamic: true` and the admin has not yet called `PUT /api/subscriptions/:id/dynamic-amount`, checkout returns `DYNAMIC_AMOUNT_NOT_SET` (HTTP 400).

## Plan Endpoints

### GET /api/plans/public
Unauthenticated active plans for pricing UI.

### GET /api/plans
Admin list of all plans.

### GET /api/plans/:planId
Retrieve plan details.

### POST /api/plans
Admin create plan (prices, features, limits, provider IDs).

**Field**: `dynamic` (boolean, default `false`) — marks the plan as variable-price. When `true`, `monthlyPrice` and `yearlyPrice` are ignored; the amount is set per-subscription by an admin before checkout.

### PUT /api/plans/:planId
Admin update plan. Supports updating `dynamic`.

### DELETE /api/plans/:planId
Soft-deactivate plan.

## Subscription Endpoints

### GET /api/subscriptions
List subscriptions (scoped to caller unless admin). Query params: `billableEntityType`, `billableEntityId`, `status`.

### GET /api/subscriptions/me
Current active subscription for the authenticated user or workspace.

### GET /api/subscriptions/:id
Retrieve subscription with ownership check.

### POST /api/subscriptions
Create a pending subscription (phase 1 of checkout flow).

**Regular users** supply `planId`, `billingCycle`, and optional `couponCode`. The entity is inferred from the authenticated user. Status is set to `pending`.

**Admins** can supply any field, including `billableEntityType`, `billableEntityId`, and `dynamicAmount` (for dynamic plans).

### PUT /api/subscriptions/:id/dynamic-amount _(admin only)_
Set or update the `dynamicAmount` on a pending subscription. Must be a positive number. This is required before a user can complete checkout on a dynamic plan. Returns `INVALID_AMOUNT` (HTTP 400) for non-positive values, `SUBSCRIPTION_NOT_FOUND` (HTTP 404) if not found.

### PUT /api/subscriptions/:id/cancel
Cancel subscription record (with ownership check for non-admins).

## Checkout Endpoints

### POST /api/checkout
Start provider checkout; returns checkout URL. Authenticated callers only.

**Subscription-first path (recommended for dynamic plans)**:
Supply `subscriptionId` (a pending subscription). The checkout service derives `planId`, `billingCycle`, billable entity, and amount from the subscription. The subscription must be in `pending` status or checkout returns `SUBSCRIPTION_NOT_PENDING` (HTTP 400).

**Inline path (fixed-price plans only)**:
Supply `planId` + `billingCycle`. A subscription is created inline during checkout. Dynamic plans cannot use this path — they return `DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION` (HTTP 400) with a message directing the caller to create a subscription and have an admin set the amount first.

**Admin convenience path**:
Admins may supply `planId` + `billingCycle` + `amount` in a single call. The server creates the pending subscription with `dynamicAmount` set and immediately proceeds to checkout. Optional `billableEntityType` / `billableEntityId` override the target entity.

**Common optional fields**: `couponCode`, `successUrl`, `cancelUrl`.

**Error codes**:

| Code | HTTP | Meaning |
|------|------|---------|
| `PLAN_NOT_FOUND` | 404 | Plan does not exist |
| `PLAN_NOT_ACTIVE` | 400 | Plan is inactive |
| `DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION` | 400 | Dynamic plan used on inline path; create a subscription first |
| `DYNAMIC_AMOUNT_NOT_SET` | 400 | Admin has not set `dynamicAmount` on the subscription |
| `DYNAMIC_PLAN_UNSUPPORTED_PROVIDER` | 400 | Dynamic plans require Sumit; Paddle/PayPal use fixed catalog prices |
| `SUBSCRIPTION_NOT_PENDING` | 400 | Subscription exists but is not in pending status |
| `ACTIVE_SUBSCRIPTION_EXISTS` | 409 | Billable entity already has an active subscription |
| `AMOUNT_REQUIRED` | 400 | Legacy: amount not provided for dynamic plan (inline path) |
| `PAYMENTS_NOT_CONFIGURED` | 500 | Tenant has no payment provider configured |
| `MISSING_EXTERNAL_PRICE_ID` | 400 | Plan missing provider price ID (Paddle/PayPal) |
| `UNSUPPORTED_PROVIDER` | 400 | Unknown payment provider kind |

### PUT /api/checkout/:subscriptionId/cancel
Cancel at payment provider and update local subscription state to `canceled`.

## Invoice & Coupon Endpoints

### GET /api/invoices, GET /api/invoices/:id
List/retrieve invoices.

### POST /api/coupons/validate
Validate coupon for a plan before checkout.

### GET/POST/PUT/DELETE /api/coupons
Admin coupon CRUD.

## Payment Providers

Paddle, PayPal, Sumit — configured via integration sources in Plugins service.

**Provider constraints for dynamic plans**: Dynamic amounts are only supported by **Sumit**. Paddle and PayPal rely on fixed catalog price IDs; using a dynamic plan with those providers returns `DYNAMIC_PLAN_UNSUPPORTED_PROVIDER`.

## Related

- [Pricing screen](../frontend/pricing/PRODUCT.md)
- [Workspaces payments tab](../frontend/workspaces/PRODUCT.md)
