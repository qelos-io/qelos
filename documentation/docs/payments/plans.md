---
title: Pricing Plans
---

# Pricing Plans

Plans define the pricing tiers available to your users or workspaces. Each plan has monthly and yearly pricing, a feature list, and optional usage limits.

## Plan Structure

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name for the plan |
| `description` | `string` | Optional description |
| `features` | `string[]` | List of feature descriptions shown on pricing pages |
| `monthlyPrice` | `number` | Price per month |
| `yearlyPrice` | `number` | Price per year |
| `currency` | `string` | ISO 4217 currency code (default: `"USD"`) |
| `isActive` | `boolean` | Whether the plan is available for purchase |
| `sortOrder` | `number` | Display order (lower first) |
| `limits` | `object` | Optional key-value usage limits |
| `externalIds` | `object` | Provider-specific product/price IDs |
| `dynamic` | `boolean` | If `true`, the plan has no fixed price — amount must be provided at checkout time |
| `metadata` | `object` | Arbitrary metadata |

## API Endpoints

### List Public Plans

Returns active plans with public-safe fields (no `externalIds` or internal data).

```
GET /api/plans/public
```

**Response:**

```json
[
  {
    "_id": "plan-1",
    "name": "Starter",
    "description": "For individuals getting started",
    "features": ["5 projects", "1GB storage", "Email support"],
    "monthlyPrice": 9,
    "yearlyPrice": 90,
    "currency": "USD",
    "sortOrder": 0,
    "limits": { "maxProjects": 5, "storageGB": 1 }
  }
]
```

### Get Plan by ID

```
GET /api/plans/:planId
```

### Admin: Create Plan

```
POST /api/plans
```

**Body:**

```json
{
  "name": "Pro",
  "features": ["Unlimited projects", "10GB storage", "Priority support"],
  "monthlyPrice": 29,
  "yearlyPrice": 290,
  "currency": "USD",
  "sortOrder": 1,
  "limits": { "maxProjects": -1, "storageGB": 10 },
  "externalIds": {
    "paddle": {
      "productId": "pro_abc123",
      "monthlyPriceId": "pri_monthly_abc",
      "yearlyPriceId": "pri_yearly_abc"
    }
  }
}
```

### Admin: Update Plan

```
PUT /api/plans/:planId
```

### Admin: Delete (Deactivate) Plan

```
DELETE /api/plans/:planId
```

This sets `isActive` to `false` rather than removing the plan, preserving existing subscription references.

## SDK Usage

### Public SDK

```typescript
// List available plans
const plans = await sdk.payments.getPlans();

// Get specific plan
const plan = await sdk.payments.getPlan('plan-id');
```

### Admin SDK

```typescript
// Create a plan
const plan = await adminSdk.managePayments.createPlan({
  name: 'Enterprise',
  features: ['Unlimited everything', 'Dedicated support'],
  monthlyPrice: 99,
  yearlyPrice: 990,
  currency: 'USD',
  isActive: true,
  sortOrder: 2,
});

// Update a plan
await adminSdk.managePayments.updatePlan('plan-id', {
  monthlyPrice: 79,
  yearlyPrice: 790,
});

// Deactivate a plan
await adminSdk.managePayments.deletePlan('plan-id');
```

## Dynamic Pricing Plans

Some plans do not have a fixed price. These are called **dynamic plans** — the amount is calculated at checkout time based on factors like number of users, items, or custom billing logic.

To create a dynamic plan, set `dynamic: true`. When `dynamic` is enabled, `monthlyPrice` and `yearlyPrice` are ignored and do not need to be set.

```json
{
  "name": "Enterprise",
  "features": ["Unlimited seats", "Custom SLA"],
  "dynamic": true,
  "currency": "USD",
  "isActive": true
}
```

When checking out a dynamic plan, the `amount` field becomes **required** in the checkout request — see the [Checkout](./checkout.md) docs.

## External IDs

To connect plans with payment providers, you must configure `externalIds` with the provider-specific product and price identifiers:

- **Paddle**: `productId`, `monthlyPriceId`, `yearlyPriceId`
- **PayPal**: `productId` (PayPal plan ID)
- **Sumit**: No external IDs needed — Sumit uses amount-based recurring payments

## CLI Management

Pricing plans can be version-controlled as local JSON files using the Qelos CLI. This lets you manage plans in your repository like any other resource.

### File Format

Each plan is stored as `{slugified-name}.pricing-plan.json` in a `pricing-plans/` directory:

```json
{
  "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Pro",
  "description": "For growing teams",
  "features": ["Unlimited projects", "Priority support"],
  "monthlyPrice": 29,
  "yearlyPrice": 290,
  "currency": "USD",
  "isActive": true,
  "sortOrder": 2,
  "dynamic": false,
  "limits": { "seats": 10 },
  "externalIds": {},
  "metadata": {}
}
```

The `_id` field is preserved on pull so subsequent pushes update the correct remote plan. The server-managed fields `tenant` and `created` are stripped automatically.

### Typical Workflow

```bash
# 1. Pull existing plans from your Qelos instance
qelos pull pricing-plans ./pricing-plans

# 2. Edit plan files locally (prices, features, limits, etc.)

# 3. Push changes back
qelos push pricing-plans ./pricing-plans

# 4. Re-pull to capture server-assigned _id for any newly created plans
qelos pull pricing-plans ./pricing-plans

# 5. Hard push — removes remote plans not present in local files (prompts for confirmation)
qelos push pricing-plans ./pricing-plans --hard
```

### IDE Rules Generation

When pricing plan files are present, the CLI generates an IDE rules file documenting the plans and SDK usage:

```bash
qelos generate rules windsurf   # → .windsurf/rules/pricing-plans.md
qelos generate rules cursor     # → .cursorrules (combined)
```

See the [CLI Pull](/cli/pull) and [CLI Push](/cli/push) documentation for full details.
