import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSdk } from '../src/sdk/index.js';
import { blueprint } from '../src/fixtures/index.js';

const properties = {
  title: { title: 'Title', type: 'string' },
  status: { title: 'Status', type: 'string' },
  price: { title: 'Price', type: 'number' },
  due: { title: 'Due', type: 'date' },
  extra: { title: 'Extra', type: 'object' },
};
// 2026-01-04 is a Sunday
const order = (status: string | undefined, price: number, due: string) => ({ metadata: { status, price, due } });

function setup(options: object = {}) {
  const { sdk, as, mock } = createMockSdk({
    ...options,
    persona: 'admin@x.com',
    seed: {
      personas: [
        { email: 'admin@x.com', roles: ['admin'] },
        { email: 'user@x.com', roles: ['user'] },
      ],
      blueprints: [blueprint('order', { properties })],
      entities: { order: [order('open', 10, '2026-01-04'), order('open', 5, '2026-01-05'), order('paid', 20, '2026-01-05'), order(undefined, 1, '2026-01-06')] },
    },
  });
  return { sdk: sdk as any, as: as as any, mock };
}

describe('charts', () => {
  test('pie: a count per value, empty ones as Unknown', async () => {
    const { sdk } = setup();
    const chart = await sdk.blueprints.getPieChart('order', { x: 'status' });
    assert.deepEqual(chart.series[0].data, [{ value: 1, name: 'Unknown' }, { value: 2, name: 'open' }, { value: 1, name: 'paid' }]);
    assert.equal(chart.series[0].name, 'Status');
  });

  test('other chart types, with dates by day of the week', async () => {
    const { sdk } = setup();
    const chart = await sdk.blueprints.getChart('order', 'bar', { x: 'due' });
    assert.deepEqual([chart.xAxis.data, chart.series[0].data, chart.series[0].type], [[1, 2, 3], [1, 2, 1], 'bar']);
  });

  test('sum, in total and per group, and filtered', async () => {
    const { sdk } = setup();
    assert.deepEqual(await sdk.blueprints.getSum('order', 'price'), { sum: 36 });
    assert.deepEqual(await sdk.blueprints.getSum('order', 'price', 'status'), {
      groups: [{ group: null, sum: 1 }, { group: 'open', sum: 15 }, { group: 'paid', sum: 20 }],
      sum: 36,
    });
    assert.deepEqual(await sdk.blueprints.getSum('order', 'price', undefined, { 'metadata.status': 'open' }), { sum: 15 });
    assert.deepEqual(await sdk.blueprints.getCount('order', { 'metadata.status': 'open' }), { count: 2 });
    assert.deepEqual(await sdk.blueprints.getCount('order', { status: 'open' }), { count: 2 });
    assert.deepEqual(await sdk.blueprints.getCount('order', { price: 20 }), { count: 1 });
    assert.equal(await sdk.entities('order').count({ status: 'paid' }), 1);
  });

  test('refused like by the service', async () => {
    const { sdk, as, mock } = setup({ strictPermissions: true });
    await assert.rejects(sdk.blueprints.getPieChart('order', {}), /xAxis is required/);
    await assert.rejects(sdk.blueprints.getPieChart('order', { x: 'extra' }), /cannot aggregate objects/);
    await assert.rejects(sdk.blueprints.getSum('order', 'status'), /must be of type number/);
    await assert.rejects(sdk.blueprints.getSum('order', 'price', 'nope'), /groupBy property not found/);
    await assert.rejects(as('user@x.com').blueprints.getSum('order', 'price'), /not permitted/);
    assert.equal((await mock.fetch('/api/blueprints/order/charts/count')).status, 401);
  });
});
