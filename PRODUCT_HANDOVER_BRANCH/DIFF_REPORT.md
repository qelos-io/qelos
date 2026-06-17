# Branch Diff Report

**Branch**: `86caacv0k/pricing-plans-should-have-dynamic-feature`
**Base**: `main`
**Date**: 2026-06-17

## Summary

This branch adds a **Dynamic Pricing** capability to subscription plans. A plan can now be flagged as "dynamic", meaning its price is not fixed at plan-creation time but is instead supplied by the calling application at the moment of checkout. This enables per-seat, per-item, usage-based, or otherwise variable billing without requiring a separate plan per price point.

---

## Product Changes

### 1. New Plan Property: Dynamic

Plans have a new boolean field `dynamic` (default: `false`).

- When `false` (existing behaviour): the plan carries fixed `monthlyPrice` and `yearlyPrice`; checkout uses those stored values.
- When `true` (new): fixed prices are irrelevant; the caller must supply an `amount` at checkout time.

**Who sees this**: Admins creating or editing plans; developers reading plan objects via the API or SDK.

---

### 2. Admin Plan Form — Dynamic Pricing Toggle

The Plan Form in the admin panel (`/admin/pricing-plans/new` and `/:id`) gains a **Dynamic Pricing** toggle at the top of the Pricing section.

- Toggling it **on** hides the Monthly Price and Yearly Price fields and removes their validation requirements.
- A hint underneath the toggle reads: "The amount will be calculated at payment time".
- Toggling it **off** restores the price fields and re-applies required-field validation.
- The toggle state is saved to and loaded from the plan record.

**Files changed**: `apps/admin/src/modules/pricing-plans/views/PlanForm.vue`

---

### 3. Checkout — Amount Required for Dynamic Plans

The checkout endpoint (`POST /api/checkout`) now accepts an `amount` field in its request body.

- For **fixed plans**: `amount` is ignored; price comes from the plan as before.
- For **dynamic plans**: `amount` is required. If omitted, the API returns HTTP 400 with error code `AMOUNT_REQUIRED`.

**Files changed**: `apps/payments/server/controllers/checkout.ts`, `apps/payments/server/services/checkout-service.ts`

---

### 4. TypeScript SDK — CheckoutRequest Updated

`CheckoutRequest` in `@qelos/sdk` has a new optional field `amount?: number`.

Developers passing `amount` for a dynamic plan:

```typescript
await sdk.payments.checkout({
  planId: 'plan_abc',
  billingCycle: 'monthly',
  amount: 4900, // cents or smallest currency unit
});
```

**Files changed**: `packages/sdk/src/payments.ts`

---

### 5. Python SDK — checkout() Updated

The Python SDK's `checkout()` method accepts a new keyword argument `amount: Optional[float] = None`. When provided it is merged into the request payload.

```python
await sdk.payments.checkout(
    {"planId": "plan_abc", "billingCycle": "monthly"},
    amount=49.00,
)
```

**Files changed**: `packages/python-sdk/qelos_sdk/payments.py`

---

## Files Updated in PRODUCT_HANDOVER_BRANCH/

| File | Change |
|------|--------|
| `api/payments.md` | Added `dynamic` field to plan creation endpoint; added `amount` field and `AMOUNT_REQUIRED` error to checkout endpoint |
| `frontend/pricing/PRODUCT.md` | Added Dynamic Pricing toggle to plan form description; documented new behaviour when toggle is on |
| `sdk/PRODUCT.md` | Added `amount` field to `CheckoutRequest` table; noted requirement for dynamic plans |

---

## No Changes Required

The following existing PRODUCT_HANDOVER documents are unaffected:

- `api/auth.md`, `api/ai.md`, `api/no-code-blueprints.md`, `api/plugins.md`, etc.
- `frontend/` screens other than pricing
- `integrators/`, `cli/`, `web-sdk/`
