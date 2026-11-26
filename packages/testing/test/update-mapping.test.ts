import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockQelos } from '../src/index.js';
import { createJqLoader } from '../src/blueprints/mapping.js';

const order = {
  identifier: 'order',
  properties: {
    price: { title: 'Price', type: 'number' },
    quantity: { title: 'Quantity', type: 'number' },
    total: { title: 'Total', type: 'number' },
  },
  updateMapping: { total: '.metadata.price * .metadata.quantity' },
};

const create = async (mock: ReturnType<typeof createMockQelos>, body: object) => {
  const response = await mock.fetch('/api/blueprints/order/entities', { method: 'POST', body: JSON.stringify(body) });
  return { status: response.status, body: (await response.json()) as any };
};

describe('updateMapping', () => {
  test('calculates properties when an entity is created and updated', async () => {
    const mock = createMockQelos({ logger: () => {}, seed: { blueprints: [order] } });
    const { body } = await create(mock, { price: 3, quantity: 4, total: 1 });
    assert.equal(body.total, 12);
    const updated = await mock.fetch(`/api/blueprints/order/entities/${body.identifier}`, { method: 'PUT', body: JSON.stringify({ quantity: 5 }) });
    assert.equal(((await updated.json()) as any).total, 15);
    assert.equal(mock.state.entities.list('order')[0].metadata.total, 15);
  });

  test('without node-jq: warns once and leaves the values as they were sent', async () => {
    const warnings: string[] = [];
    const missing = () => Promise.reject(new Error("Cannot find package 'node-jq'\nmore detail"));
    const load = createJqLoader((message) => warnings.push(message), missing);
    assert.deepEqual([await load(), await load()], [undefined, undefined]);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /npm install --save-dev node-jq.*Cannot find package/);
    assert.doesNotMatch(warnings[0], /more detail/);
  });

  test('a package whose jq program is missing counts as not installed', async () => {
    const warnings: string[] = [];
    const broken = async () => ({ run: async () => Promise.reject(new Error('spawn jq ENOENT')) });
    assert.equal(await createJqLoader((message) => warnings.push(message), broken)(), undefined);
    assert.match(warnings[0], /ENOENT/);
  });
});
