# Pricing & Billing

Subscription plans, coupons, and payment provider configuration.

## What Users Can Do

- **Manage plans**: Create, edit, activate/deactivate, reorder at `/admin/pricing-plans`
- **Create dynamic plans**: Mark a plan as dynamic (variable price) so the charge amount is determined at checkout rather than fixed on the plan
- **Manage coupons**: Create discount codes at `/admin/pricing-plans/coupons`
- **Configure payments**: Enable billing, select provider, currency, grace period
- **User billing**: View own subscription in profile Payments tab

## Interface Elements

| Screen | Route | Key elements |
|--------|-------|--------------|
| **Plans list** | `/admin/pricing-plans` | Plan cards, create/edit/delete/reorder |
| **Plan form** | `/admin/pricing-plans/new`, `/:id` | Name, dynamic toggle, monthly/yearly prices (hidden when dynamic), features, limits |
| **Coupons list** | `/admin/pricing-plans/coupons` | Discount codes table |
| **Coupon form** | Create/edit coupon | Percentage/fixed discount, validity rules |
| **Payments config** | `/admin/pricing-plans/payments-configuration` | Provider toggle, connection, currency |

## Plan Fields

- Name, description, sort order
- **Dynamic Pricing toggle**: When enabled, fixed price fields are hidden; the amount is calculated at payment time (e.g. per-seat, per-item, or otherwise variable)
- Monthly and yearly prices with currency (hidden and not required when Dynamic Pricing is on)
- Feature list and usage limits
- External provider price IDs (Paddle/PayPal/Sumit)
- Active/inactive state

## Dynamic Pricing Behaviour

When the Dynamic Pricing toggle is switched on in the plan form:
- The Monthly Price and Yearly Price fields are hidden and not validated
- A hint reads: "The amount will be calculated at payment time"
- On the plans table, dynamic plans show **Dynamic** in the monthly column and **—** in the yearly column instead of fixed amounts
- At checkout, the developer or app must pass an explicit positive **`amount`** — the API rejects requests without a valid amount
- **Payments provider**: dynamic (variable) amounts are supported with **Sumit**. Paddle and PayPal use fixed external price IDs; configure Sumit under Payments Configuration if you rely on dynamic plans

## Related

- [Payments API](../../api/payments.md)
- [Workspaces payments tab](../workspaces/PRODUCT.md)
- [Integrations](../integrations/PRODUCT.md) — payment provider connections
