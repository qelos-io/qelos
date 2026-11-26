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

  test('a missing jq program counts as not installed, and is never started', async () => {
    const warnings: string[] = [];
    // what a package manager leaves when it blocks the install script of node-jq
    const installed = async () => ({ run: () => assert.fail('jq must not be started: node-jq would end the process') });
    const load = createJqLoader((message) => warnings.push(message), installed, () => '/nowhere/node-jq/bin/jq');
    assert.equal(await load(), undefined);
    assert.match(warnings[0], /jq program is missing \(\/nowhere\/node-jq\/bin\/jq\).*pnpm approve-builds/);
  });

  test('with the real package: a jq path that does not exist warns instead of ending the process', async () => {
    const before = process.env.JQ_PATH;
    process.env.JQ_PATH = '/nowhere/jq';
    try {
      const warnings: string[] = [];
      assert.equal(await createJqLoader((message) => warnings.push(message))(), undefined);
      assert.match(warnings[0], /jq program is missing/);
    } finally {
      if (before === undefined) delete process.env.JQ_PATH;
      else process.env.JQ_PATH = before;
    }
  });

  test('a jq program that fails counts as not installed', async () => {
    const warnings: string[] = [];
    const broken = async () => ({ run: async () => Promise.reject(new Error('spawn jq ENOENT')) });
    assert.equal(await createJqLoader((message) => warnings.push(message), broken)(), undefined);
    assert.match(warnings[0], /ENOENT/);
  });
});
