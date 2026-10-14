import {
  daysUntil,
  describePlanLimits,
  formatMoney,
  getActiveCouponCode,
  getDiscountAmount,
  getPlanPrice,
  getSubscriptionState,
  getYearlySaving,
  isLiveSubscription,
  pickCurrentSubscription,
} from '../billing-presentation';

const sub = (overrides: Record<string, any> = {}) =>
  ({ _id: 's', status: 'active', created: '2026-01-01T00:00:00Z', ...overrides }) as any;

describe('billing presentation', () => {
  describe('pickCurrentSubscription', () => {
    it('returns null without subscriptions', () => {
      expect(pickCurrentSubscription([])).toBeNull();
    });

    it('prefers live subscriptions over ended ones', () => {
      const picked = pickCurrentSubscription([
        sub({ _id: 'old', status: 'canceled', created: '2026-03-01T00:00:00Z' }),
        sub({ _id: 'late', status: 'past_due' }),
        sub({ _id: 'live', status: 'active' }),
      ]);
      expect(picked?._id).toBe('live');
    });

    it('takes the most recent when ranks tie, and still surfaces a problem over a canceled one', () => {
      expect(pickCurrentSubscription([sub({ _id: 'a', created: '2026-01-01T00:00:00Z' }), sub({ _id: 'b', created: '2026-02-01T00:00:00Z' })])?._id).toBe('b');
      expect(pickCurrentSubscription([sub({ _id: 'c', status: 'canceled' }), sub({ _id: 'p', status: 'pending' })])?._id).toBe('p');
    });
  });

  describe('getSubscriptionState', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    it('maps statuses', () => {
      expect(getSubscriptionState(null, now)).toBe('none');
      expect(getSubscriptionState(sub({ status: 'past_due' }), now)).toBe('past_due');
    });

    it('tells a canceled subscription that still has paid time apart', () => {
      expect(getSubscriptionState(sub({ status: 'canceled', currentPeriodEnd: '2026-07-01T00:00:00Z' }), now)).toBe('canceled_running');
      expect(getSubscriptionState(sub({ status: 'canceled', currentPeriodEnd: '2026-05-01T00:00:00Z' }), now)).toBe('canceled');
    });

    it('knows which subscriptions are live', () => {
      expect(isLiveSubscription(sub({ status: 'trialing' }))).toBe(true);
      expect(isLiveSubscription(sub({ status: 'canceled' }))).toBe(false);
      expect(isLiveSubscription(null)).toBe(false);
    });
  });

  describe('pricing', () => {
    it('formats money in the given locale', () => {
      expect(formatMoney(49, 'USD', 'en-US')).toBe('$49.00');
      expect(formatMoney(undefined, undefined, 'en-US')).toBe('$0.00');
    });

    it('chooses the price per cycle', () => {
      expect(getPlanPrice({ monthlyPrice: 10, yearlyPrice: 96 }, 'yearly')).toBe(96);
      expect(getPlanPrice({ monthlyPrice: 10, yearlyPrice: 96 }, 'monthly')).toBe(10);
    });

    it('computes the yearly saving', () => {
      expect(getYearlySaving({ monthlyPrice: 10, yearlyPrice: 96 })).toEqual({ percent: 20, amount: 24 });
      expect(getYearlySaving({ monthlyPrice: 10, yearlyPrice: 130 })).toEqual({ percent: 0, amount: 0 });
      expect(getYearlySaving({ monthlyPrice: 0, yearlyPrice: 0 })).toEqual({ percent: 0, amount: 0 });
    });

    it('applies coupons without going below zero', () => {
      expect(getDiscountAmount(100, { discountType: 'percentage', discountValue: 20 } as any)).toBe(20);
      expect(getDiscountAmount(10, { discountType: 'fixed', discountValue: 25 } as any)).toBe(10);
      expect(getDiscountAmount(100, null)).toBe(0);
    });
  });

  it('finds the active coupon from newest-first activity', () => {
    expect(getActiveCouponCode([{ kind: 'coupon.applied', couponCode: 'SPRING', at: '' }, { kind: 'subscription.created', at: '' }])).toBe('SPRING');
    expect(getActiveCouponCode([{ kind: 'coupon.removed', at: '' }, { kind: 'coupon.applied', couponCode: 'OLD', at: '' }])).toBeNull();
    expect(getActiveCouponCode([])).toBeNull();
  });

  it('describes plan limits readably and hides disabled ones', () => {
    expect(describePlanLimits({ maxSeats: 10, sso: true, api_calls: 500, beta: false })).toEqual([
      { key: 'maxSeats', label: 'Max seats', value: '10' },
      { key: 'sso', label: 'Sso', value: true },
      { key: 'api_calls', label: 'Api calls', value: '500' },
    ]);
    expect(describePlanLimits(undefined)).toEqual([]);
  });

  it('counts days until a date', () => {
    expect(daysUntil('2026-06-11T00:00:00Z', new Date('2026-06-01T00:00:00Z'))).toBe(10);
    expect(daysUntil(undefined)).toBeNull();
  });
});
