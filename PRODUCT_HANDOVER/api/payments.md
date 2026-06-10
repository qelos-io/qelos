# Payments & Billing

Subscription plans, checkout, coupons, invoices, and payment provider webhooks.

## What Users Can Do

- **Browse plans**: View public plan catalog for pricing/signup pages
- **Manage plans (admin)**: Create, update, deactivate subscription tiers
- **Start checkout**: Provider-hosted checkout for monthly/yearly subscriptions with coupons
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

### PUT /api/plans/:planId
Admin update plan.

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
Start provider checkout; returns checkout URL.

**Request**: planId, billingCycle (monthly/yearly), optional couponCode

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
