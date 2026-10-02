---
title: Coupons
---

# Coupons

Coupons allow you to offer discounts during checkout. They support both percentage and fixed-amount discounts, with optional constraints on validity period, redemption limits, and applicable plans.

## Coupon Structure

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Unique coupon code entered by users |
| `discountType` | `"percentage"` \| `"fixed"` | Type of discount |
| `discountValue` | `number` | Discount amount (0-100 for percentage, absolute for fixed) |
| `currency` | `string` | Currency for fixed-amount discounts |
| `maxRedemptions` | `number` | Maximum number of times this coupon can be used (`null` = unlimited) |
| `currentRedemptions` | `number` | Number of times redeemed so far |
| `validFrom` | `Date` | Coupon becomes valid at this date |
| `validUntil` | `Date` | Coupon expires at this date |
| `benefitDurationUnit` | `"days"` \| `"months"` | Unit for the post-redemption benefit duration (unset = benefit lasts for the life of the subscription) |
| `benefitDurationValue` | `number` | Length of the post-redemption benefit, in `benefitDurationUnit` units |
| `applicablePlanIds` | `string[]` | Plans this coupon works with (empty = all plans) |
| `isActive` | `boolean` | Whether the coupon is currently active |

### Redemption window vs. benefit duration

These two concepts are easy to confuse, but they govern different things:

- **Redemption window** (`validFrom` / `validUntil`) — gates *whether the coupon can currently be redeemed at all*. A coupon with `validUntil` in the past can no longer be applied at checkout, regardless of its discount.
- **Benefit duration** (`benefitDurationUnit` / `benefitDurationValue`) — once a coupon *has been redeemed*, this controls *how long the discount/free period lasts for that subscriber*. For example, a coupon with `benefitDurationUnit: 'months'` and `benefitDurationValue: 3` gives the redeeming subscriber 3 months at the discounted price; after that, billing automatically reverts to the plan's standard price — the subscription itself is not canceled.

If `benefitDurationUnit`/`benefitDurationValue` are left unset, the discount applies for the life of the subscription, matching the pre-existing behavior.

When a coupon with a benefit duration is redeemed (subscription activation), the end date of the benefit is computed from the subscription's `currentPeriodStart` (falling back to the redemption time) and stored on the subscription as `couponBenefitEndsAt`. Pricing logic checks this field — if the current date is past `couponBenefitEndsAt`, the standard plan price is used instead of the discounted one.

## Validation Rules

When a coupon is validated, the following checks are performed in order:

1. **Exists and active** — Coupon must exist and have `isActive: true`
2. **Not before valid date** — `validFrom` must be in the past (if set)
3. **Not expired** — `validUntil` must be in the future (if set)
4. **Redemption limit** — `currentRedemptions` must be less than `maxRedemptions` (if set)
5. **Plan applicability** — If `applicablePlanIds` is non-empty, the target plan must be listed

## Discount Calculation

- **Percentage**: `finalPrice = basePrice * (1 - discountValue / 100)`
- **Fixed**: `finalPrice = max(0, basePrice - discountValue)`

All amounts are rounded to two decimal places.

## API Endpoints

### Validate Coupon (Public)

```
POST /api/coupons/validate
```

**Body:**

```json
{
  "code": "SAVE20",
  "planId": "plan-id"
}
```

**Success Response:**

Returns the coupon object if valid.

**Error Responses:**

| Code | Description |
|------|-------------|
| `COUPON_NOT_FOUND` | Coupon does not exist or is inactive |
| `COUPON_NOT_YET_VALID` | Before `validFrom` date |
| `COUPON_EXPIRED` | Past `validUntil` date |
| `COUPON_MAX_REDEMPTIONS` | Redemption limit reached |
| `COUPON_NOT_APPLICABLE` | Not valid for the specified plan |

### Admin: CRUD

```
GET    /api/coupons
GET    /api/coupons/:couponId
POST   /api/coupons
PUT    /api/coupons/:couponId
DELETE /api/coupons/:couponId
```

## SDK Usage

### Public SDK

```typescript
// Validate a coupon before checkout
try {
  const coupon = await sdk.payments.validateCoupon('SAVE20', 'plan-id');
  console.log(`${coupon.discountValue}% off!`);
} catch (err) {
  console.error('Invalid coupon:', err.message);
}
```

### Admin SDK

```typescript
// Create a 20% discount coupon
const coupon = await adminSdk.managePayments.createCoupon({
  code: 'LAUNCH20',
  discountType: 'percentage',
  discountValue: 20,
  isActive: true,
  applicablePlanIds: [],
});

// Create a limited-use fixed discount
await adminSdk.managePayments.createCoupon({
  code: 'FLAT10',
  discountType: 'fixed',
  discountValue: 10,
  currency: 'USD',
  maxRedemptions: 100,
  validUntil: new Date('2026-12-31'),
  isActive: true,
  applicablePlanIds: ['plan-pro'],
});

// First 3 months free, then standard pricing
await adminSdk.managePayments.createCoupon({
  code: 'FIRST3FREE',
  discountType: 'percentage',
  discountValue: 100,
  benefitDurationUnit: 'months',
  benefitDurationValue: 3,
  isActive: true,
  applicablePlanIds: [],
});

// Deactivate a coupon
await adminSdk.managePayments.deleteCoupon('coupon-id');
```
