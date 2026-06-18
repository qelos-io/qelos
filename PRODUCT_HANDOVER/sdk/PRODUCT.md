# SDK (@qelos/sdk)

TypeScript SDK that lets external developers call a Qelos app's REST API for data, auth, workspaces, AI, payments, and tenant administration.

## What Developers Can Do

- **Instantiate client**: `new QelosSDK({ appUrl, fetch, apiToken? })`
- **CRUD entities**: Query and mutate blueprint-backed records with fluent API
- **Authenticate users**: Sign in/up, refresh sessions, social OAuth, API tokens
- **Manage workspaces**: Create, invite, switch, manage members
- **Run AI**: Agents, chat, threads, vector storage
- **Handle billing**: Plans, subscriptions, checkout, coupons, invoices — including dynamic plans where an admin sets the charge amount on the subscription before the user completes checkout
- **Administer tenants**: Separate administrator export for full platform management

## Core Modules

| Module | Actions |
|--------|---------|
| `sdk.entities('key')` | Shorthand for blueprint entity CRUD |
| `sdk.blueprints` | List/fetch schemas; fluent query builder |
| `sdk.authentication` | Sign in/up, refresh, social, profile, logout, API tokens |
| `sdk.workspaces` | CRUD, activate, members, invites |
| `sdk.invites` | List, accept, decline |
| `sdk.appConfigurations` | Read/update app config |
| `sdk.blocks` | Content block CRUD |
| `sdk.ai` | Agents, chat (stream/non-stream), threads, RAG storage |
| `sdk.lambdas` | Execute serverless integrations |
| `sdk.payments` | Plans, checkout, subscriptions, invoices, coupons |

## Entity Query Builder

```typescript
sdk.entities('todos')
  .where({ status: 'open' })
  .sort('-createdAt')
  .limit(20)
  .find()
```

Also: `findOne`, `count`, `chart`, `pieChart`, `sum`

## Payments — Two-Phase Flow

Payments use a two-phase model: plan selection first, payment second.

### Phase 1 — Subscribe to plan

```typescript
const subscription = await sdk.payments.subscribeToPlan(planId, ‘monthly’);
// subscription.status === ‘pending’
```

Creates a pending subscription. No payment details are collected. For dynamic plans, an admin must call `sdk.managePayments.setSubscriptionDynamicAmount()` before the user can proceed to checkout.

### Phase 2 — Checkout

```typescript
const { checkoutUrl } = await sdk.payments.checkout({ subscriptionId: subscription._id });
// redirect user to checkoutUrl
```

For fixed-price plans the subscription step can be skipped — pass `planId` + `billingCycle` directly to `checkout()` for an inline flow.

### CheckoutRequest

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `subscriptionId` | string | No* | *Preferred path; required for dynamic plans |
| `planId` | string | No* | *Inline path for fixed-price plans only |
| `billingCycle` | `’monthly’ \| ‘yearly’` | No* | *Required on inline path |
| `couponCode` | string | No | |
| `successUrl` | string | No | |
| `cancelUrl` | string | No | |

### Administrator SDK — `managePayments`

`QelosAdministratorSDK` exposes **`sdk.managePayments`** with full subscription and plan management:

- **`checkout(params)`** — same as public checkout plus optional `billableEntityType`/`billableEntityId` overrides, and `amount` for a one-call dynamic-plan shortcut (creates pending subscription with `dynamicAmount` set, then proceeds to checkout)
- **`setSubscriptionDynamicAmount(subscriptionId, amount)`** — sets the charge amount on a pending subscription; required before a user can complete checkout on a dynamic plan
- **`createSubscription(data)`** — creates a subscription for any billable entity; accepts `dynamicAmount` for dynamic plans

Dynamic plans require the **Sumit** payment provider. Paddle and PayPal use fixed catalog prices and return `DYNAMIC_PLAN_UNSUPPORTED_PROVIDER` for dynamic plans.

## Package Exports

| Import | Purpose |
|--------|---------|
| `@qelos/sdk` | Main runtime SDK |
| `@qelos/sdk/administrator` | Tenant admin SDK with impersonation |
| `@qelos/sdk/ai` | AI module only |
| `@qelos/sdk/workspaces` | Workspaces module only |
| `@qelos/sdk/types` | Shared TypeScript types |

## Related

- [API](../api/PRODUCT.md)
- [Integrators](../integrators/PRODUCT.md)
- [Web SDK](../web-sdk/PRODUCT.md)
