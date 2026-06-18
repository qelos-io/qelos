---
title: Payments
---

# Payments & Billing

Qelos includes a full billing system that supports pricing plans, subscriptions, invoices, and coupon codes. The system works in both B2C (user-level billing) and B2B (workspace-level billing) modes, determined by whether the workspace configuration is active.

## Core Concepts

- **Plans** — Define your pricing tiers with monthly and yearly prices, feature lists, and usage limits. Plans can be **static** (fixed price) or **dynamic** (amount set per-subscription by an admin).
- **Subscriptions** — Track which user or workspace is subscribed to which plan, including lifecycle status and dynamic amount.
- **Invoices** — Automatically generated payment records with provider-specific details and download links.
- **Coupons** — Discount codes with percentage or fixed-amount discounts, expiry dates, and usage limits.
- **Checkout** — Two-phase flow: create a pending subscription first, then initiate a provider payment session.

## Two-Phase Flow

Subscribing and paying are separate processes. The subscription is created first (`pending` status), and the checkout step initiates the provider payment session:

```
User  →  POST /api/subscriptions                       creates pending subscription
Admin →  PUT  /api/subscriptions/:id/dynamic-amount    sets amount (dynamic plans only)
User  →  POST /api/checkout { subscriptionId }         initiates payment
```

For static plans, both steps can be collapsed into a single `POST /api/checkout` call.

Users cannot set their own checkout amount — only admins can set the `dynamicAmount` on a subscription.

## B2B vs B2C

When `workspace-configuration.isActive` is `true`, the app operates in B2B mode and plans are attached to **workspaces**. Otherwise, plans are attached to **users** directly.

The `billableEntityType` field (`user` | `workspace`) on subscriptions and invoices handles this transparently.

## Supported Providers

Payments are processed through existing integration sources. Currently supported:

- [**Paddle**](./paddle.md) — Subscription management with sandbox support
- [**Sumit**](./sumit.md) — Israeli payment processing with recurring payments
- **PayPal** — Subscription billing via PayPal REST API

## Documentation

| Topic | Description |
|-------|-------------|
| [Plans](./plans.md) | Creating and managing pricing plans |
| [Subscriptions](./subscriptions.md) | Subscription lifecycle and management |
| [Invoices](./invoices.md) | Invoice retrieval and structure |
| [Coupons](./coupons.md) | Creating and validating discount codes |
| [Checkout](./checkout.md) | Initiating payment flows |
| [Configuration](./configuration.md) | Admin setup and provider configuration |

## SDK Quick Start

See the [Payments SDK guide](/sdk/payments) for a complete reference.

```typescript
import { QelosSDK } from '@qelos/sdk';
import { QelosAdministratorSDK } from '@qelos/sdk/administrator';

const sdk = new QelosSDK({ baseUrl: 'https://your-app.com' });
const adminSdk = new QelosAdministratorSDK({ baseUrl: 'https://your-app.com' });

// List available plans
const plans = await sdk.payments.getPlans({ isActive: true });

// Static plan — subscribe and pay in one step
const { checkoutUrl } = await sdk.payments.checkout({
  planId: 'plan-id',
  billingCycle: 'monthly',
  successUrl: 'https://myapp.com/success',
});
window.location.href = checkoutUrl;

// Dynamic plan — two-phase flow
const sub = await sdk.payments.subscribeToPlan('dynamic-plan-id', 'monthly');
// Admin sets the amount:
await adminSdk.managePayments.setSubscriptionDynamicAmount(sub._id, 149.00);
// User initiates checkout:
const { checkoutUrl: url } = await sdk.payments.checkout({ subscriptionId: sub._id });
window.location.href = url;
```
