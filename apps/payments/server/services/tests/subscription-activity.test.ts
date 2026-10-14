import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildActivityTimeline,
  buildCouponHistoryEntry,
  buildCreatedHistoryEntry,
  buildStatusHistoryEntry,
} from '../subscription-activity';

describe('subscription history entries', () => {
  it('records creation with the initial status', () => {
    const entry = buildCreatedHistoryEntry('pending');
    assert.strictEqual(entry.type, 'created');
    assert.strictEqual(entry.to, 'pending');
  });

  it('marks cancellations separately from other transitions', () => {
    assert.strictEqual(buildStatusHistoryEntry('active', 'canceled').type, 'canceled');
    const entry = buildStatusHistoryEntry('active', 'past_due');
    assert.strictEqual(entry.type, 'status_changed');
    assert.strictEqual(entry.from, 'active');
    assert.strictEqual(entry.to, 'past_due');
  });

  it('records coupon application and removal', () => {
    assert.deepStrictEqual(
      { type: buildCouponHistoryEntry('SPRING20').type, code: buildCouponHistoryEntry('SPRING20').couponCode },
      { type: 'coupon_applied', code: 'SPRING20' },
    );
    assert.strictEqual(buildCouponHistoryEntry(null).type, 'coupon_removed');
  });
});

describe('buildActivityTimeline', () => {
  const at = (iso: string) => new Date(iso);

  it('merges history and invoices newest first', () => {
    const timeline = buildActivityTimeline(
      {
        created: at('2026-01-01T00:00:00Z'),
        history: [
          { type: 'created', at: at('2026-01-01T00:00:00Z'), to: 'active' },
          { type: 'status_changed', at: at('2026-03-01T00:00:00Z'), from: 'active', to: 'past_due' },
        ],
      },
      [
        { _id: 'i1', status: 'paid', paidAt: at('2026-02-01T00:00:00Z'), created: at('2026-02-01T00:00:00Z'), amount: 49, currency: 'USD' },
        { _id: 'i2', status: 'failed', created: at('2026-03-01T01:00:00Z'), amount: 49, currency: 'USD' },
      ],
    );
    assert.deepStrictEqual(timeline.map((item) => item.kind), [
      'invoice.failed',
      'subscription.status_changed',
      'invoice.paid',
      'subscription.created',
    ]);
    assert.strictEqual(timeline[0].invoiceId, 'i2');
  });

  it('synthesizes a created line for subscriptions without history', () => {
    const timeline = buildActivityTimeline({ created: at('2025-12-01') }, []);
    assert.deepStrictEqual(timeline.map((item) => item.kind), ['subscription.created']);
  });

  it('does not duplicate the created line and ignores unknown entries', () => {
    const timeline = buildActivityTimeline(
      { created: at('2026-01-01T00:00:00Z'), history: [{ type: 'created', at: at('2026-01-01T00:00:00Z'), to: 'active' }, { type: 'mystery' as any, at: at('2026-01-02') }] },
      [{ _id: 'x', status: 'weird', created: at('2026-01-03') }],
    );
    assert.strictEqual(timeline.length, 1);
  });
});
