---
title: Payments
---

# Payments & Billing

Qelos includes a full billing system that supports pricing plans, subscriptions, invoices, and coupon codes. The system works in both B2C (user-level billing) and B2B (workspace-level billing) modes, determined by whether the workspace configuration is active.

## Core Concepts

- **Plans** — Define your pricing tiers with monthly and yearly prices, feature lists, and usage limits.
- **Subscriptions** — Track which user or workspace is subscribed to which plan, including lifecycle status.
- **Invoices** — Automatically generated payment records with provider-specific details and download links.
- **Coupons** — Discount codes with percentage or fixed-amount discounts, expiry dates, and usage limits.
- **Checkout** — Unified flow that creates a provider-side payment session and returns a checkout URL.

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

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({ appUrl: 'https://your-app.com', fetch });

// List available plans
const plans = await sdk.payments.getPlans();

// Start a checkout
const { checkoutUrl } = await sdk.payments.checkout({
  planId: 'plan-id',
  billingCycle: 'monthly',
  couponCode: 'SAVE20',
});

// Redirect user to checkoutUrl...

// Check current subscription
const subscription = await sdk.payments.getMySubscription();

// View invoices
const invoices = await sdk.payments.getInvoices();
```
