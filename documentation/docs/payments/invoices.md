---
title: Invoices
---

# Invoices

Invoices are automatically created when payments are processed. They contain the payment amount, status, provider-specific details, and optional download URLs.

## Invoice Structure

| Field | Type | Description |
|-------|------|-------------|
| `subscriptionId` | `string` | Associated subscription |
| `billableEntityType` | `"user"` \| `"workspace"` | Billing target type |
| `billableEntityId` | `string` | User or workspace ID |
| `amount` | `number` | Total payment amount |
| `currency` | `string` | ISO 4217 currency code |
| `status` | `string` | Payment status |
| `externalInvoiceId` | `string` | Provider-side invoice/transaction ID |
| `providerKind` | `string` | Payment provider |
| `invoiceUrl` | `string` | URL to view/download the invoice |
| `paidAt` | `Date` | When the payment was completed |
| `periodStart` | `Date` | Billing period start |
| `periodEnd` | `Date` | Billing period end |
| `items` | `array` | Line items with description, amount, quantity |

## Invoice Statuses

| Status | Description |
|--------|-------------|
| `paid` | Payment completed successfully |
| `pending` | Payment initiated but not yet confirmed |
| `failed` | Payment attempt failed |
| `refunded` | Payment was refunded |

## API Endpoints

### List Invoices

```
GET /api/invoices?billableEntityType=user&billableEntityId=user-123
```

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `billableEntityType` | Filter by `user` or `workspace` |
| `billableEntityId` | Filter by specific entity |
| `status` | Filter by invoice status |

### Get Invoice

```
GET /api/invoices/:id
```

## SDK Usage

### Public SDK

```typescript
// List my invoices
const invoices = await sdk.payments.getInvoices();

// Get specific invoice
const invoice = await sdk.payments.getInvoice('invoice-id');

// Access invoice download URL
if (invoice.invoiceUrl) {
  window.open(invoice.invoiceUrl);
}
```

### Admin SDK

```typescript
// List all invoices for a workspace
const invoices = await adminSdk.managePayments.getInvoices({
  billableEntityType: 'workspace',
  billableEntityId: 'workspace-id',
});

// List failed invoices
const failed = await adminSdk.managePayments.getInvoices({
  status: 'failed',
});
```

## How Invoices Are Created

Invoices are created automatically by webhook handlers when a payment provider confirms a transaction:

1. Provider sends a payment completion webhook
2. The webhook handler locates the associated subscription
3. An invoice is created with the payment details from the webhook payload
4. If the provider includes an invoice URL (e.g. Paddle, Sumit), it's stored for user access
