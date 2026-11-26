import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockQelos } from '../src/index.js';
import { createSchemaLoader } from '../src/blueprints/schemas.js';

const server = {
  identifier: 'server',
  properties: {
    config: {
      title: 'Config',
      type: 'object',
      schema: { type: 'object', properties: { port: { type: 'number' } }, required: ['port'] },
    },
  },
};

describe('object properties with a custom schema', () => {
  test('are checked against it on create and update', async () => {
    const mock = createMockQelos({ logger: () => {}, seed: { blueprints: [server] } });
    const send = async (method: string, path: string, config: unknown) => {
      const response = await mock.fetch(`/api/blueprints/server/entities${path}`, { method, body: JSON.stringify({ config }) });
      return { status: response.status, body: (await response.json()) as any };
    };
    const created = await send('POST', '', { port: 80 });
    assert.equal(created.status, 200);
    const refused = { status: 406, body: { message: 'Property config must be a valid according to schema: object' } };
    assert.deepEqual(await send('POST', '', { port: 'x' }), refused);
    assert.deepEqual(await send('PUT', `/${created.body.identifier}`, {}), refused);
  });

  test('without ajv, or with an older one: warns once and checks the type only', async () => {
    for (const [load, reason] of [
      [() => Promise.reject(new Error("Cannot find package 'ajv'")), /Cannot find package/],
      // version 6 exports the function alone
      [async () => ({ default: function Ajv() {} }), /older version/],
    ] as const) {
      const warnings: string[] = [];
      const loader = createSchemaLoader((message) => warnings.push(message), load);
      assert.deepEqual([await loader(), await loader()], [undefined, undefined]);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /npm install --save-dev ajv@8/);
      assert.match(warnings[0], reason);
    }
  });
});
