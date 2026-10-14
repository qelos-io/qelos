import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const aggregateMock = mock.fn(async (..._args: any[]): Promise<any[]> => []);
const subFindMock = mock.fn((..._args: any[]): any => ({
  select: () => ({ sort: () => ({ limit: () => ({ lean: () => ({ exec: async () => [] }) }) }) }),
}));
const planFindMock = mock.fn((..._args: any[]): any => ({
  select: () => ({ lean: () => ({ exec: async () => [] }) }),
}));

function SubscriptionConstructor() {}
Object.assign(SubscriptionConstructor, { aggregate: aggregateMock, find: subFindMock });
function PlanConstructor() {}
Object.assign(PlanConstructor, { find: planFindMock });

mock.module('../../models/subscription', { defaultExport: SubscriptionConstructor });
mock.module('../../models/plan', { defaultExport: PlanConstructor });
mock.module('../coupons-service', { namedExports: { validateCoupon: mock.fn(), redeemCoupon: mock.fn(), calculateCouponBenefitEndDate: mock.fn() } });

describe('getSubscriptionsSummary', async () => {
  const { getSubscriptionsSummary } = await import('../subscriptions-service');

  beforeEach(() => {
    aggregateMock.mock.resetCalls();
    subFindMock.mock.resetCalls();
  });

  it('scopes every query to the tenant and optional entity type', async () => {
    await getSubscriptionsSummary('tenant-1', { billableEntityType: 'workspace' });
    assert.deepStrictEqual((aggregateMock.mock.calls[0].arguments[0] as any[])[0], {
      $match: { tenant: 'tenant-1', billableEntityType: 'workspace' },
    });
    assert.deepStrictEqual(subFindMock.mock.calls[0].arguments[0], {
      tenant: 'tenant-1',
      billableEntityType: 'workspace',
      status: { $in: ['past_due', 'pending'] },
    });
  });

  it('combines aggregates, plans and attention items', async () => {
    aggregateMock.mock.mockImplementationOnce(async () => [
      { _id: { status: 'active', planId: 'p1', billingCycle: 'monthly' }, count: 2 },
      { _id: { status: 'past_due', planId: 'p1', billingCycle: 'yearly' }, count: 1 },
    ]);
    planFindMock.mock.mockImplementationOnce(() => ({
      select: () => ({ lean: () => ({ exec: async () => [{ _id: 'p1', name: 'Pro', monthlyPrice: 50, yearlyPrice: 480, currency: 'USD' }] }) }),
    }));
    subFindMock.mock.mockImplementationOnce(() => ({
      select: () => ({
        sort: () => ({
          limit: () => ({
            lean: () => ({
              exec: async () => [
                { _id: 's9', status: 'past_due', planId: 'p1', billableEntityType: 'user', billableEntityId: 'u1', created: '2026-01-01T00:00:00Z', history: [] },
              ],
            }),
          }),
        }),
      }),
    }));

    const summary: any = await getSubscriptionsSummary('tenant-1');
    assert.strictEqual(summary.live, 3);
    assert.deepStrictEqual(summary.mrr, [{ currency: 'USD', amount: 140 }]); // 2 x 50 + 1 x 480/12
    assert.deepStrictEqual(summary.byPlan, [{ planId: 'p1', name: 'Pro', count: 3 }]);
    assert.strictEqual(summary.attention[0].subscriptionId, 's9');
  });
});
