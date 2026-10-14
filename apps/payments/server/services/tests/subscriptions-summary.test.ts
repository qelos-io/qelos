import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildSubscriptionsSummary, pickAttentionItems, statusSince } from '../subscriptions-summary';

const plans = [
  { _id: 'p1', name: 'Starter', monthlyPrice: 10, yearlyPrice: 96, currency: 'USD' },
  { _id: 'p2', name: 'Pro', monthlyPrice: 50, yearlyPrice: 480, currency: 'USD' },
  { _id: 'p3', name: 'Custom', monthlyPrice: 0, yearlyPrice: 0, currency: 'USD', dynamic: true },
  { _id: 'p4', name: 'Euro', monthlyPrice: 20, yearlyPrice: 200, currency: 'EUR' },
];
const group = (status: string, planId: string, billingCycle: string, count: number) =>
  ({ _id: { status, planId, billingCycle }, count }) as any;

describe('buildSubscriptionsSummary', () => {
  it('counts every status, including empty ones', () => {
    const summary = buildSubscriptionsSummary([group('active', 'p1', 'monthly', 3)], plans);
    assert.deepStrictEqual(summary.byStatus, { pending: 0, active: 3, canceled: 0, past_due: 0, trialing: 0, expired: 0 });
    assert.strictEqual(summary.live, 3);
  });

  it('estimates MRR per currency, counting yearly plans as 1/12', () => {
    const summary = buildSubscriptionsSummary(
      [
        group('active', 'p1', 'monthly', 2), // 20
        group('active', 'p2', 'yearly', 1), // 40
        group('trialing', 'p1', 'monthly', 1), // 10
        group('active', 'p4', 'monthly', 1), // 20 EUR
        group('canceled', 'p2', 'monthly', 5), // not live
      ],
      plans,
    );
    assert.deepStrictEqual(summary.mrr, [
      { currency: 'USD', amount: 70 },
      { currency: 'EUR', amount: 20 },
    ]);
  });

  it('keeps dynamic plans out of MRR and counts them separately', () => {
    const summary = buildSubscriptionsSummary([group('active', 'p3', 'monthly', 4), group('active', 'p1', 'monthly', 1)], plans);
    assert.strictEqual(summary.dynamicCount, 4);
    assert.deepStrictEqual(summary.mrr, [{ currency: 'USD', amount: 10 }]);
  });

  it('ranks plans by live subscribers and resolves names', () => {
    const summary = buildSubscriptionsSummary(
      [group('active', 'p1', 'monthly', 1), group('past_due', 'p2', 'monthly', 2), group('expired', 'p1', 'monthly', 9)],
      plans,
    );
    assert.deepStrictEqual(summary.byPlan, [
      { planId: 'p2', name: 'Pro', count: 2 },
      { planId: 'p1', name: 'Starter', count: 1 },
    ]);
  });

  it('ignores unknown statuses and tolerates deleted plans', () => {
    const summary = buildSubscriptionsSummary([group('weird', 'p1', 'monthly', 3), group('active', 'gone', 'monthly', 2)], plans);
    assert.strictEqual(summary.live, 2);
    assert.deepStrictEqual(summary.byPlan, [{ planId: 'gone', name: '', count: 2 }]);
    assert.deepStrictEqual(summary.mrr, []);
  });
});

describe('attention items', () => {
  const now = new Date('2026-06-10T12:00:00Z');
  const sub = (overrides: any) => ({ _id: 's', planId: 'p1', billableEntityType: 'user', billableEntityId: 'u', created: '2026-06-01T00:00:00Z', history: [], ...overrides });

  it('finds when a subscription entered its status', () => {
    assert.strictEqual(
      statusSince(sub({ status: 'past_due', history: [{ type: 'status_changed', to: 'past_due', at: '2026-06-05T00:00:00Z' }] })),
      '2026-06-05T00:00:00Z',
    );
    assert.strictEqual(statusSince(sub({ status: 'pending' })), '2026-06-01T00:00:00Z');
  });

  it('keeps past-due and stale pending subscriptions, longest waiting first', () => {
    const items = pickAttentionItems(
      [
        sub({ _id: 'a', status: 'past_due', history: [{ to: 'past_due', at: '2026-06-08T00:00:00Z' }] }),
        sub({ _id: 'b', status: 'past_due', history: [{ to: 'past_due', at: '2026-06-02T00:00:00Z' }] }),
        sub({ _id: 'c', status: 'pending', created: '2026-06-10T10:00:00Z' }), // still checking out
        sub({ _id: 'd', status: 'pending', created: '2026-06-04T00:00:00Z' }),
        sub({ _id: 'e', status: 'active' }),
      ],
      now,
    );
    assert.deepStrictEqual(items.map((item) => item.subscriptionId), ['b', 'd', 'a']);
  });

  it('caps the list at ten', () => {
    const many = Array.from({ length: 15 }, (_, i) => sub({ _id: `s${i}`, status: 'past_due', created: `2026-05-${String(i + 1).padStart(2, '0')}T00:00:00Z` }));
    assert.strictEqual(pickAttentionItems(many, now).length, 10);
  });
});
