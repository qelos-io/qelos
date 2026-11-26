import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { getChartFilter } from '../entity-filters.service';

const blueprint: any = {
  identifier: 'order',
  properties: {
    status: { type: 'string' },
    price: { type: 'number' },
    done: { type: 'boolean' },
    due: { type: 'datetime' },
    x: { type: 'string' },
    sum: { type: 'number' },
  },
};

describe('getChartFilter', () => {
  it('should filter a property named in the query on the entity metadata', () => {
    assert.deepStrictEqual(getChartFilter({ status: 'open' }, blueprint), { 'metadata.status': 'open' });
  });

  it('should keep filters already written against the metadata', () => {
    assert.deepStrictEqual(getChartFilter({ 'metadata.status': 'open' }, blueprint), { 'metadata.status': 'open' });
  });

  it('should compare number, boolean and date properties by their type', () => {
    assert.deepStrictEqual(getChartFilter({ price: '5', done: 'true', 'metadata.due': '2026-01-04' }, blueprint), {
      'metadata.price': 5,
      'metadata.done': true,
      'metadata.due': new Date('2026-01-04'),
    });
  });

  it('should keep fields that are not blueprint properties', () => {
    assert.deepStrictEqual(getChartFilter({ identifier: 'a', user: 'u1' }, blueprint), { identifier: 'a', user: 'u1' });
  });

  it("should leave out the chart's own parameters and bypassAdmin, even when a property shares their name", () => {
    assert.deepStrictEqual(getChartFilter({ x: 'status', bypassAdmin: 'true' }, blueprint, ['x']), {});
    assert.deepStrictEqual(getChartFilter({ sum: 'price', groupBy: 'status', x: 'a' }, blueprint, ['sum', 'groupBy']), {
      'metadata.x': 'a',
    });
  });

  it('should not change the query it was given', () => {
    const query = { status: 'open' };
    getChartFilter(query, blueprint);
    assert.deepStrictEqual(query, { status: 'open' });
  });
});
