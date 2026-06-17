# SDK (@qelos/sdk)

TypeScript SDK that lets external developers call a Qelos app's REST API for data, auth, workspaces, AI, payments, and tenant administration.

## What Developers Can Do

- **Instantiate client**: `new QelosSDK({ appUrl, fetch, apiToken? })`
- **CRUD entities**: Query and mutate blueprint-backed records with fluent API
- **Authenticate users**: Sign in/up, refresh sessions, social OAuth, API tokens
- **Manage workspaces**: Create, invite, switch, manage members
- **Run AI**: Agents, chat, threads, vector storage
- **Handle billing**: Plans, checkout, subscriptions, coupons, invoices — including dynamic plans where the charge amount is passed at checkout time
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

## Payments — CheckoutRequest

The `CheckoutRequest` type now includes an optional `amount` field:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `planId` | string | Yes | |
| `billingCycle` | `'monthly' \| 'yearly'` | Yes | |
| `couponCode` | string | No | |
| `successUrl` | string | No | |
| `cancelUrl` | string | No | |
| `amount` | number | No* | *Required when the plan is dynamic |

For dynamic plans, omitting `amount` returns a 400 error with code `AMOUNT_REQUIRED`.

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
