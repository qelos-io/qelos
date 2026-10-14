import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildBucketBoundaries, clampBuckets, mapBuckets } from '../events-overview';

describe('events overview helpers', () => {
  it('clamps the bucket count', () => {
    assert.strictEqual(clampBuckets(undefined), 24);
    assert.strictEqual(clampBuckets('2'), 6);
    assert.strictEqual(clampBuckets(1000), 60);
    assert.strictEqual(clampBuckets('12'), 12);
  });

  it('builds ascending boundaries covering the range', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-02T00:00:00Z');
    const boundaries = buildBucketBoundaries(start, end, 24);
    assert.strictEqual(boundaries.length, 25);
    assert.strictEqual(boundaries[0].getTime(), start.getTime());
    assert.strictEqual(boundaries[1].getTime() - boundaries[0].getTime(), 3600_000);
    assert.ok(boundaries[24].getTime() > end.getTime());
    for (let i = 1; i < boundaries.length; i++) {
      assert.ok(boundaries[i].getTime() > boundaries[i - 1].getTime());
    }
  });

  it('keeps boundaries ascending when start equals end', () => {
    const now = new Date();
    const boundaries = buildBucketBoundaries(now, now, 6);
    for (let i = 1; i < boundaries.length; i++) {
      assert.ok(boundaries[i].getTime() > boundaries[i - 1].getTime());
    }
  });

  it('fills empty buckets', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const boundaries = buildBucketBoundaries(start, new Date('2026-01-01T06:00:00Z'), 6);
    const buckets = mapBuckets(boundaries, [{ _id: boundaries[2], count: 5, errors: 2 }]);
    assert.strictEqual(buckets.length, 6);
    assert.deepStrictEqual(buckets.map((b) => b.count), [0, 0, 5, 0, 0, 0]);
    assert.strictEqual(buckets[2].errors, 2);
  });
});
