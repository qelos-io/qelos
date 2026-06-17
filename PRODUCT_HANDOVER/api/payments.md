# Payments & Billing

Subscription plans, checkout, coupons, invoices, and payment provider webhooks.

## What Users Can Do

- **Browse plans**: View public plan catalog for pricing/signup pages
- **Manage plans (admin)**: Create, update, deactivate subscription tiers — including dynamic pricing plans where the charge amount is set at checkout time
- **Start checkout**: Provider-hosted checkout for monthly/yearly subscriptions with coupons; dynamic plans require a caller-supplied amount
- **Manage subscriptions**: View, cancel own subscription or admin-manage all
- **View invoices**: List and retrieve billing records
- **Manage coupons (admin)**: Create percentage or fixed discount codes

## Plan Endpoints

### GET /api/plans/public
Unauthenticated active plans for pricing UI.

### GET /api/plans
Admin list of all plans.

### GET /api/plans/:planId
Retrieve plan details.

### POST /api/plans
Admin create plan (prices, features, limits, provider IDs).

**New field**: `dynamic` (boolean, default `false`) — marks the plan as variable-price. When `true`, `monthlyPrice` and `yearlyPrice` are ignored; the checkout caller must supply `amount` instead.

### PUT /api/plans/:planId
Admin update plan. Supports updating `dynamic`.

### DELETE /api/plans/:planId
Soft-deactivate plan.

## Subscription Endpoints

### GET /api/subscriptions
List subscriptions (scoped to caller unless admin).

### GET /api/subscriptions/me
Current active subscription for user or workspace.

### GET /api/subscriptions/:id
Retrieve subscription with ownership check.

### POST /api/subscriptions
Admin manual subscription creation.

### PUT /api/subscriptions/:id/cancel
Cancel subscription record.

## Checkout Endpoints

### POST /api/checkout
Start provider checkout; returns checkout URL. Authenticated callers only (end users or admins using the same route).

**Request**: `planId`, `billingCycle` (monthly/yearly), optional `couponCode`, optional `successUrl`/`cancelUrl`, optional `billableEntityType` / `billableEntityId` (when an admin or integration needs to start checkout for a specific user or workspace).

**`amount` (number)**: Required when the plan has `dynamic: true`. Must be a **positive** finite number. Ignored for fixed-price plans (those use `monthlyPrice` / `yearlyPrice` from the plan). Omitting `amount`, passing zero, or passing a non-numeric value for a dynamic plan returns **`AMOUNT_REQUIRED`** (HTTP 400).

**Dynamic plans and providers**: Variable-amount checkout is implemented for **Sumit** (the integration passes `Amount` through). **Paddle** and **PayPal** rely on fixed catalog price IDs; starting checkout for a dynamic plan while the tenant is configured for Paddle or PayPal returns **`DYNAMIC_PLAN_UNSUPPORTED_PROVIDER`** (HTTP 400). Use Sumit in Payments Configuration for dynamic plans, or use fixed-price plans with Paddle/PayPal.

### PUT /api/checkout/:subscriptionId/cancel
Cancel at payment provider and update local state.

## Invoice & Coupon Endpoints

### GET /api/invoices, GET /api/invoices/:id
List/retrieve invoices.

### POST /api/coupons/validate
Validate coupon for a plan before checkout.

### GET/POST/PUT/DELETE /api/coupons
Admin coupon CRUD.

## Payment Providers

Paddle, PayPal, Sumit — configured via integration sources in Plugins service.

## Related

- [Pricing screen](../frontend/pricing/PRODUCT.md)
- [Workspaces payments tab](../frontend/workspaces/PRODUCT.md)
