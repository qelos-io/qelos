---
title: Payments Configuration
---

# Payments Configuration

Before users can subscribe to plans, an admin must configure the payment provider and create pricing plans.

## Setup Steps

### 1. Configure a Payment Provider

Set up one of the supported payment providers as an integration source:

- [Paddle](./paddle.md)
- [Sumit](./sumit.md)
- PayPal

Each provider has its own integration source configuration with API keys, environment settings, and webhook secrets.

### 2. Set Payments Configuration

Create or update the `payments-configuration` configuration key with the provider details:

```json
{
  "providerSourceId": "integration-source-id",
  "providerKind": "paddle",
  "successUrl": "https://your-app.com/billing/success",
  "cancelUrl": "https://your-app.com/billing"
}
```

| Field | Description |
|-------|-------------|
| `providerSourceId` | The `_id` of the integration source to use |
| `providerKind` | Provider type: `paddle`, `paypal`, or `sumit` |
| `successUrl` | Default redirect URL after successful payment |
| `cancelUrl` | Default redirect URL when user cancels checkout |

This can be set through the Admin UI or via the SDK:

```typescript
await adminSdk.manageConfigurations.update('payments-configuration', {
  providerSourceId: 'source-id',
  providerKind: 'paddle',
  successUrl: 'https://your-app.com/success',
  cancelUrl: 'https://your-app.com/cancel',
});
```

### 3. Create Plans

Use the Admin UI's Pricing Plans module or the SDK to create plans:

```typescript
await adminSdk.managePayments.createPlan({
  name: 'Pro',
  features: ['Feature A', 'Feature B'],
  monthlyPrice: 29,
  yearlyPrice: 290,
  currency: 'USD',
  isActive: true,
  sortOrder: 1,
  externalIds: {
    paddle: {
      monthlyPriceId: 'pri_xxx',
      yearlyPriceId: 'pri_yyy',
    },
  },
});
```

### 4. Set Up Webhooks

Configure the payment provider to send webhooks to:

```
https://your-app.com/api/payments/webhooks/{providerKind}
```

For example:
- Paddle: `https://your-app.com/api/payments/webhooks/paddle`
- PayPal: `https://your-app.com/api/payments/webhooks/paypal`
- Sumit: `https://your-app.com/api/payments/webhooks/sumit`

## Sandbox vs Live

Paddle and PayPal integration sources support sandbox environments through their `environment` metadata field. When set to `sandbox`:

- API calls are routed to the provider's sandbox/test environment
- Test credit cards and accounts can be used
- No real charges are made

The payments service reads the environment setting from the integration source automatically — no additional configuration is needed.

## B2B vs B2C Mode

The billing entity type is determined by the workspace configuration:

- **B2C (default)**: `workspace-configuration.isActive` is `false` → plans attach to users
- **B2B**: `workspace-configuration.isActive` is `true` → plans attach to workspaces

The payments UI automatically appears in the correct location:
- B2C: User profile settings → Payments tab
- B2B: Workspace settings → Payments tab
