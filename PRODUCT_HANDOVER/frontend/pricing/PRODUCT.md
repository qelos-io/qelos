# Pricing & Billing

Subscription plans, coupons, and payment provider configuration.

## What Users Can Do

- **Manage plans**: Create, edit, activate/deactivate, reorder at `/admin/pricing-plans`
- **Manage coupons**: Create discount codes at `/admin/pricing-plans/coupons`
- **Configure payments**: Enable billing, select provider, currency, grace period
- **User billing**: View own subscription in profile Payments tab

## Interface Elements

| Screen | Route | Key elements |
|--------|-------|--------------|
| **Plans list** | `/admin/pricing-plans` | Plan cards, create/edit/delete/reorder |
| **Plan form** | `/admin/pricing-plans/new`, `/:id` | Name, monthly/yearly prices, features, limits |
| **Coupons list** | `/admin/pricing-plans/coupons` | Discount codes table |
| **Coupon form** | Create/edit coupon | Percentage/fixed discount, validity rules |
| **Payments config** | `/admin/pricing-plans/payments-configuration` | Provider toggle, connection, currency |

## Plan Fields

- Name, description, sort order
- Monthly and yearly prices with currency
- Feature list and usage limits
- External provider price IDs (Paddle/PayPal/Sumit)
- Active/inactive state

## Related

- [Payments API](../../api/payments.md)
- [Workspaces payments tab](../workspaces/PRODUCT.md)
- [Integrations](../integrations/PRODUCT.md) — payment provider connections
