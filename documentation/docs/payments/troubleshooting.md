---
title: Troubleshooting
---

# Payments Troubleshooting

Payment platform events store a compact `metadata` payload with a `docsUrl` link to this page. Use the error **code** from **Admin → Events** to jump to the matching section below.

For event taxonomy, filtering, and provider-specific playbooks, see [Platform Events](./events.md). To verify a connection's credentials directly (without going through checkout), see [Connection Status Checks](../integrations/status-check.md).

## Error codes

### PAYMENTS_NOT_CONFIGURED {#payments-not-configured}

Payments are disabled or no provider integration is selected.

1. Open **Admin → Pricing Plans → Configuration**.
2. Enable payments and select a payment provider integration source.
3. Save and retry checkout.

### ACTIVE_SUBSCRIPTION_EXISTS {#active-subscription-exists}

The billable entity already has an active or trialing subscription.

1. Cancel the existing subscription with `sdk.payments.cancelSubscription(existingSubscriptionId)`, or
2. Pass `reset: true` on checkout to cancel automatically and start a new subscription.

### DYNAMIC_AMOUNT_NOT_SET {#dynamic-amount-not-set}

A dynamic-priced plan requires an admin-set amount before checkout.

1. Open the pending subscription in **Admin → Pricing Plans → Subscriptions**.
2. Set `dynamicAmount` on the subscription.
3. Retry checkout with `subscriptionId`.

### DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION {#dynamic-plan-requires-subscription}

Dynamic plans cannot be checked out with `planId` alone.

1. Create a pending subscription first (`sdk.payments.subscribeToPlan` or admin flow).
2. Set `dynamicAmount` (admin).
3. Call checkout with `subscriptionId`. Dynamic plans require Sumit.

### DYNAMIC_PLAN_UNSUPPORTED_PROVIDER {#dynamic-plan-unsupported-provider}

The configured payment provider does not support dynamic plans.

1. Switch the tenant payment provider to **Sumit** in **Admin → Pricing Plans → Configuration**, or
2. Use a static-priced plan with Paddle, PayPal, or DodoPayments.

### MISSING_REDIRECT_URLS {#missing-redirect-urls}

Checkout redirect URLs are missing.

1. Add `successUrl` and `cancelUrl` in **Admin → Pricing Plans → Configuration**, or
2. Pass them in the checkout request body.

### INVALID_CHECKOUT_AMOUNT {#invalid-checkout-amount}

The checkout amount is zero or invalid.

- **Dynamic plans:** an admin must set `dynamicAmount` on the pending subscription before checkout.
- **Static plans:** ensure the plan has a non-zero monthly or yearly price.

### INVALID_SUMIT_COMPANY_ID {#invalid-sumit-company-id}

### MISSING_SUMIT_CREDENTIALS {#missing-sumit-credentials}

Sumit Company ID or API key is missing or invalid.

1. Open **Admin → Integrations → Sumit**.
2. Enter the numeric **Company ID** from [Sumit developer keys](https://app.sumit.co.il/developers/keys/).
3. Save a freshly generated **API key**.
4. Confirm hosted checkout / redirect is enabled in the Sumit merchant account and the key has billing permissions.

See also [Sumit integration](./sumit.md) and [Platform Events — Sumit](./events.md#sumit-troubleshooting).

### UNSUPPORTED_SUMIT_CURRENCY {#unsupported-sumit-currency}

The plan currency is not supported by Sumit.

1. Change the plan currency to **ILS**, **USD**, or **EUR**.
2. Retry checkout.

### INTEGRATION_SOURCE_NOT_FOUND {#integration-source-not-found}

The configured `paymentSourceId` no longer exists.

1. Open **Admin → Pricing Plans → Configuration**.
2. Re-select the payment provider integration source and save.

### MISSING_EXTERNAL_PRICE_ID {#missing-external-price-id}

The plan is missing provider catalog price IDs.

| Provider | Required plan fields |
|----------|---------------------|
| Paddle | `externalIds.paddle.monthlyPriceId` / `yearlyPriceId` |
| PayPal | `externalIds.paypal.productId` |
| DodoPayments | `externalIds.dodopayments.monthlyPriceId` / `yearlyPriceId` |

Update the plan in **Admin → Pricing Plans → Plans** and retry checkout.

### PLAN_NOT_ACTIVE {#plan-not-active}

The plan is inactive or unavailable.

1. Open **Admin → Pricing Plans → Plans**.
2. Activate the plan (`isActive: true`) and retry checkout.

### SUBSCRIPTION_NOT_PENDING {#subscription-not-pending}

Checkout was called for a subscription that is not in `pending` status.

1. Use a subscription in `pending` status, or
2. Create a new pending subscription before checkout.

### INVALID_SIGNATURE {#invalid-signature}

A payment webhook signature could not be verified.

1. Confirm the webhook secret in **Admin → Integrations → {provider}** matches the provider dashboard.
2. For Paddle, verify the `paddle-signature` header is forwarded unchanged through any proxy.
3. Retry delivery from the provider webhook console after updating credentials.

### WEBHOOK_SECRET_NOT_CONFIGURED {#webhook-secret-not-configured}

No webhook secret is stored for this tenant and provider.

1. Copy the webhook signing secret from the provider dashboard.
2. Save it on the integration source in **Admin → Integrations**.

### TENANT_NOT_FOUND {#tenant-not-found}

A webhook could not be mapped to a Qelos tenant.

1. Ensure checkout created the subscription with provider `custom_data` / metadata that includes the tenant ID.
2. For PayPal and Paddle, verify `custom_data.tenant` is present on the provider subscription.
3. Re-process or replay the webhook after fixing subscription linkage.

## Provider playbooks

For step-by-step diagnosis by event name (`checkout-failed`, `provider-call-failed`, `payment-failed`, etc.), use the provider sections in [Platform Events](./events.md):

- [Sumit](./events.md#sumit-troubleshooting)
- [Paddle](./events.md#paddle-troubleshooting)
- [PayPal](./events.md#paypal-troubleshooting)
- [DodoPayments](./events.md#dodopayments-troubleshooting)
