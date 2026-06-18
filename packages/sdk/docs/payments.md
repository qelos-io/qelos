# Payments SDK

The payments SDK is split into two classes:

- **`QlPayments`** (`sdk.payments`) — available to any authenticated user. Covers subscribing, checkout, invoices, and coupon validation. Users cannot set prices.
- **`QlPaymentsAdmin`** (`adminSdk.payments`) — available to privileged callers only. Extends the user surface with plan/coupon management, cross-entity subscription control, and the ability to set dynamic amounts.

---

## Setup

```typescript
import { QelosSDK } from '@qelos/sdk';
import { QelosAdminSDK } from '@qelos/sdk/administrator';

const sdk = new QelosSDK({ baseUrl: 'https://your-qelos-instance.com' });
const adminSdk = new QelosAdminSDK({ baseUrl: 'https://your-qelos-instance.com' });
```

---

## Static Plan Checkout (One Step)

For plans where the price is fixed, the user can subscribe and pay in a single `checkout()` call. Qelos creates the pending subscription internally.

```typescript
// List available plans
const plans = await sdk.payments.getPlans({ isActive: true });
const plan = plans.find(p => p.name === 'Pro');

// Validate an optional coupon
const coupon = await sdk.payments.validateCoupon('SUMMER20', plan._id);

// Initiate checkout — subscription is created inline
const result = await sdk.payments.checkout({
  planId: plan._id,
  billingCycle: 'monthly',
  couponCode: 'SUMMER20',
  successUrl: 'https://myapp.com/success',
  cancelUrl: 'https://myapp.com/cancel',
});

// Redirect the user
window.location.href = result.checkoutUrl;
```

---

## Dynamic Plan Two-Phase Flow

Dynamic plans have variable pricing (e.g., usage-based). The user cannot set the amount — only an admin can. The flow is:

1. User creates a pending subscription.
2. Admin reviews usage / context and sets the amount.
3. User initiates checkout with the subscription ID.

### Step 1 — User subscribes

```typescript
const subscription = await sdk.payments.subscribeToPlan(
  'dynamic-plan-id',
  'monthly',
);
// subscription.status === 'pending'
// Store subscription._id and show the user a "waiting for quote" state
```

### Step 2 — Admin sets the amount

```typescript
// Admin SDK — run server-side or in the admin dashboard
await adminSdk.payments.setSubscriptionDynamicAmount(
  subscription._id,
  149.00,  // amount in the plan's currency
);
```

### Step 3 — User completes checkout

```typescript
const result = await sdk.payments.checkout({
  subscriptionId: subscription._id,
  successUrl: 'https://myapp.com/success',
  cancelUrl: 'https://myapp.com/cancel',
});

window.location.href = result.checkoutUrl;
```

### Admin convenience shortcut

Admins can collapse steps 1–3 into a single call. This creates a pending subscription with the given amount and immediately initiates checkout:

```typescript
const result = await adminSdk.payments.checkout({
  planId: 'dynamic-plan-id',
  billingCycle: 'monthly',
  amount: 149.00,
  billableEntityType: 'workspace',
  billableEntityId: 'workspace-id',
  successUrl: 'https://myapp.com/success',
});
```

---

## Listing Plans and Subscriptions

### User SDK

```typescript
// Public plan listing (unauthenticated)
const plans = await sdk.payments.getPlans({ isActive: true });

// Single plan
const plan = await sdk.payments.getPlan('plan-id');

// Current user's active subscription
const subscription = await sdk.payments.getMySubscription();

// User's invoices
const invoices = await sdk.payments.getInvoices();
const invoice = await sdk.payments.getInvoice('invoice-id');
```

### Admin SDK

```typescript
// All plans (including inactive)
const allPlans = await adminSdk.payments.getPlans();

// All subscriptions with optional filters
const workspaceSubs = await adminSdk.payments.getSubscriptions({
  billableEntityType: 'workspace',
  billableEntityId: 'workspace-id',
  status: 'active',
});

// All invoices across entities
const invoices = await adminSdk.payments.getInvoices({
  billableEntityType: 'user',
  billableEntityId: 'user-id',
  status: 'paid',
});
```

---

## Coupon Validation

Validate a coupon before showing it applied in the UI:

```typescript
try {
  const coupon = await sdk.payments.validateCoupon('PROMO10', 'plan-id');
  console.log(coupon.discountType);  // 'percentage' | 'fixed'
  console.log(coupon.discountValue); // e.g. 10 (%)
} catch (err) {
  // err.code: COUPON_NOT_FOUND | COUPON_EXPIRED | COUPON_NOT_APPLICABLE | ...
}
```

---

## Invoice Retrieval

```typescript
// User's own invoices
const invoices = await sdk.payments.getInvoices({ status: 'paid' });

// Single invoice (e.g. for download link)
const invoice = await sdk.payments.getInvoice('invoice-id');
console.log(invoice.invoiceUrl);
```

---

## Cancellation

```typescript
// User cancels their own subscription
await sdk.payments.cancelSubscription('subscription-id');

// Admin cancels any subscription
await adminSdk.payments.cancelSubscription('subscription-id');
```

---

## Admin Plan Management

```typescript
// Create a plan
const plan = await adminSdk.payments.createPlan({
  name: 'Enterprise',
  monthlyPrice: 299,
  yearlyPrice: 2990,
  currency: 'USD',
  dynamic: false,
  isActive: true,
});

// Create a dynamic plan
const dynamicPlan = await adminSdk.payments.createPlan({
  name: 'Usage-Based',
  currency: 'USD',
  dynamic: true,
  isActive: true,
  monthlyPrice: 0,
  yearlyPrice: 0,
});

// Update
await adminSdk.payments.updatePlan(plan._id, { monthlyPrice: 349 });

// Delete
await adminSdk.payments.deletePlan(plan._id);
```

---

## Admin Coupon Management

```typescript
// Create a 20% off coupon
const coupon = await adminSdk.payments.createCoupon({
  code: 'SUMMER20',
  discountType: 'percentage',
  discountValue: 20,
  isActive: true,
  applicablePlanIds: ['plan-id'],
  maxRedemptions: 100,
});

// Update
await adminSdk.payments.updateCoupon(coupon._id, { isActive: false });

// Delete
await adminSdk.payments.deleteCoupon(coupon._id);
```

---

## `QlPayments` Reference (User SDK)

| Method | Description |
|---|---|
| `getPlans(query?)` | List public plans |
| `getPlan(planId)` | Get a single plan |
| `subscribeToPlan(planId, billingCycle, couponCode?)` | Create a pending subscription (first step for dynamic plans) |
| `checkout(params)` | Initiate a checkout session |
| `getMySubscription()` | Get the current user's active subscription |
| `cancelSubscription(subscriptionId)` | Cancel a subscription |
| `getInvoices(query?)` | List the current user's invoices |
| `getInvoice(invoiceId)` | Get a single invoice |
| `validateCoupon(code, planId?)` | Validate a coupon code |

---

## `QlPaymentsAdmin` Reference (Admin SDK)

| Method | Description |
|---|---|
| `getPlans(query?)` | List all plans |
| `getPlan(planId)` | Get a single plan |
| `createPlan(data)` | Create a plan |
| `updatePlan(planId, data)` | Update a plan |
| `deletePlan(planId)` | Delete a plan |
| `checkout(params)` | Initiate checkout with entity overrides and optional `amount` |
| `getSubscriptions(query?)` | List subscriptions across all entities |
| `getSubscription(subscriptionId)` | Get a single subscription |
| `createSubscription(data)` | Create a pending subscription on behalf of any entity |
| `cancelSubscription(subscriptionId)` | Cancel any subscription |
| `setSubscriptionDynamicAmount(subscriptionId, amount)` | Set or update the dynamic amount on a pending subscription |
| `getInvoices(query?)` | List invoices across all entities |
| `getInvoice(invoiceId)` | Get a single invoice |
| `getCoupons(query?)` | List coupons |
| `getCoupon(couponId)` | Get a single coupon |
| `createCoupon(data)` | Create a coupon |
| `updateCoupon(couponId, data)` | Update a coupon |
| `deleteCoupon(couponId)` | Delete a coupon |

---

## Permissions Summary

| Action | User SDK | Admin SDK |
|---|---|---|
| List/get plans | public plans only | all plans |
| Create/update/delete plans | no | yes |
| Create subscription (own entity) | yes | yes |
| Create subscription (any entity) | no | yes |
| Set `dynamicAmount` | no | yes |
| Initiate checkout | yes | yes, with entity override |
| Set checkout `amount` directly | no | yes (dynamic plans) |
| List own subscriptions/invoices | yes | yes |
| List all subscriptions/invoices | no | yes |
| Cancel own subscription | yes | yes |
| Cancel any subscription | no | yes |
| Validate coupon | yes | yes |
| Manage coupons | no | yes |
