import {
  buildComparison,
  getCouponStatus,
  getRedemptionProgress,
  formatValidity,
  getSetupSteps,
  isSetupComplete,
  planShare,
  reorderPlans,
} from '../pricing-overview';

const coupon = (overrides: Record<string, any> = {}) => ({ isActive: true, currentRedemptions: 0, ...overrides }) as any;
const now = new Date('2026-06-01T00:00:00Z');

describe('pricing overview helpers', () => {
  describe('getCouponStatus', () => {
    it('is active by default', () => {
      expect(getCouponStatus(coupon(), now)).toBe('active');
    });

    it('detects inactive, scheduled, expired and exhausted coupons', () => {
      expect(getCouponStatus(coupon({ isActive: false }), now)).toBe('inactive');
      expect(getCouponStatus(coupon({ validFrom: '2026-07-01T00:00:00Z' }), now)).toBe('scheduled');
      expect(getCouponStatus(coupon({ validUntil: '2026-05-01T00:00:00Z' }), now)).toBe('expired');
      expect(getCouponStatus(coupon({ maxRedemptions: 5, currentRedemptions: 5 }), now)).toBe('exhausted');
    });

    it('treats a missing limit as unlimited', () => {
      expect(getCouponStatus(coupon({ currentRedemptions: 999 }), now)).toBe('active');
    });
  });

  it('computes redemption progress', () => {
    expect(getRedemptionProgress({ maxRedemptions: 10, currentRedemptions: 4 })).toBe(40);
    expect(getRedemptionProgress({ maxRedemptions: 10, currentRedemptions: 40 })).toBe(100);
    expect(getRedemptionProgress({ currentRedemptions: 3 } as any)).toBeNull();
  });

  describe('setup steps', () => {
    it('is incomplete without provider, switch or active plan', () => {
      const steps = getSetupSteps(null, []);
      expect(steps.map((step) => step.done)).toEqual([false, false, false]);
      expect(isSetupComplete(steps)).toBe(false);
    });

    it('is complete once everything is in place', () => {
      const steps = getSetupSteps({ isEnabled: true, paymentSourceId: 'src-1' } as any, [{ isActive: false }, { isActive: true }]);
      expect(isSetupComplete(steps)).toBe(true);
    });

    it('accepts the legacy providerSourceId', () => {
      expect(getSetupSteps({ providerSourceId: 'old' } as any, [])[0].done).toBe(true);
    });
  });

  it('describes a coupon validity window', () => {
    const labels = { from: (d: any) => `from ${d}`, until: (d: any) => `until ${d}`, range: (a: any, b: any) => `${a}-${b}`, always: 'always' };
    expect(formatValidity({}, labels)).toBe('always');
    expect(formatValidity({ validFrom: 'a' } as any, labels)).toBe('from a');
    expect(formatValidity({ validUntil: 'b' } as any, labels)).toBe('until b');
    expect(formatValidity({ validFrom: 'a', validUntil: 'b' } as any, labels)).toBe('a-b');
  });

  it('computes plan share', () => {
    expect(planShare(1, 4)).toBe(25);
    expect(planShare(3, 0)).toBe(0);
  });

  it('builds a feature/limit comparison across plans', () => {
    const result = buildComparison([
      { features: ['A', 'B'], limits: { seats: 1 } },
      { features: ['B', 'C'], limits: { seats: 10, sso: true } },
    ] as any);
    expect(result.features).toEqual([
      { feature: 'A', plans: [true, false] },
      { feature: 'B', plans: [true, true] },
      { feature: 'C', plans: [false, true] },
    ]);
    expect(result.limits).toEqual([
      { key: 'seats', values: [1, 10] },
      { key: 'sso', values: [undefined, true] },
    ]);
  });

  describe('reorderPlans', () => {
    const plans = [
      { _id: 'a', sortOrder: 0 },
      { _id: 'b', sortOrder: 0 }, // duplicate order values must not break swapping
      { _id: 'c', sortOrder: 5 },
    ];

    it('swaps with the neighbour and renumbers', () => {
      const updates = reorderPlans(plans, 'c', -1);
      expect(updates).toContainEqual({ _id: 'c', sortOrder: 1 });
      expect(updates).toContainEqual({ _id: 'b', sortOrder: 2 });
    });

    it('does nothing at the edges or for unknown plans', () => {
      expect(reorderPlans(plans, 'a', -1)).toEqual([]);
      expect(reorderPlans(plans, 'c', 1)).toEqual([]);
      expect(reorderPlans(plans, 'zzz', 1)).toEqual([]);
    });
  });
});
