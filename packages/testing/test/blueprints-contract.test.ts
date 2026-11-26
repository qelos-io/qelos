import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

/**
 * Contract between the mock and the blueprint controllers of the data service (`apps/no-code`): the real model casts
 * and validates, over a list instead of a database.
 */
const server = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'apps', 'no-code', 'server');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(server, path));
  return loaded.default?.default ?? loaded.default ?? loaded;
};
const named = async (path: string): Promise<any> => {
  const loaded: any = await import(join(server, path));
  return loaded.default ?? loaded;
};
const plain = (value: unknown) => JSON.parse(JSON.stringify(value ?? null));

/** ids, times and where entities are stored differ; empty objects are not stored by the database */
const comparable = (value: any): any => {
  if (Array.isArray(value)) return value.map(comparable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['_id', 'created', 'updated', 'storage', '__v'].includes(key))
      .map(([key, v]) => [key, comparable(v)] as const)
      .filter(([, v]) => !(v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)),
  );
};

const property = { title: 'Title', type: 'string' };
const full = {
  identifier: 'order',
  name: 'Order',
  description: 'orders',
  permissionScope: 'workspace',
  entityIdentifierMechanism: 'guid',
  properties: {
    title: { ...property, indexed: true, required: 1, unknown: 'dropped', min: 0, enum: ['a'], schema: { dropped: true } },
    total: { title: 'Total', type: 'number', max: 5, multi: 'yes' },
    data: { title: 'Data', type: 'object', schema: { type: 'object' } },
    untitled: { type: 'string' },
    untyped: { title: 'x' },
  },
  permissions: [{ operation: 'read', scope: 'user', roleBased: ['user'], guest: 'true', unknown: 1 }, {}],
  limitations: [{ scope: 'user', value: '5', roles: ['user'] }],
  relations: [{ key: 'client', target: 'client' }],
  dispatchers: { create: true },
  updateMapping: { total: '.metadata.total' },
  storage: { collection: 'mine' },
  tenant: 'other',
  unknown: 'dropped',
};
const minimal = { identifier: 'note', name: 'Note' };
const indexed = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, i) => [`p${i}`, { ...property, indexed: true }]));

describe('the mock follows the blueprint controllers', () => {
  test('creating, changing, patching and removing blueprints', async () => {
    const Blueprint = await load('models/blueprint');
    const controllers = await named('controllers/blueprints');
    const storage = await named('services/entity-storage.service');
    const logger = await load('services/logger');
    for (const level of ['log', 'error']) mock.method(logger, level, () => {});

    const docs: any[] = [];
    const entities = new Set<string>();
    const find = (filter: any) => docs.find((d) => d.identifier === filter.identifier);
    const query = (read: () => unknown) => {
      const chain: any = { lean: () => chain, exec: async () => read() };
      return chain;
    };
    mock.method(Blueprint, 'findOne', (filter: any) => ({
      exec: async () => (find(filter) ? Blueprint.hydrate(structuredClone(find(filter))) : null),
      lean: () => query(() => find(filter) ?? null),
    }));
    mock.method(Blueprint, 'deleteOne', (filter: any) => query(() => docs.splice(docs.indexOf(find(filter)), find(filter) ? 1 : 0)));
    mock.method(Blueprint, 'updateOne', () => query(() => null));
    mock.method(Blueprint.prototype, 'save', async function (this: any) {
      await this.validate();
      const stored = plain(this);
      const index = docs.findIndex((d) => d.identifier === stored.identifier);
      if (this.isNew && index >= 0) throw new Error('E11000 duplicate key error');
      if (index >= 0) docs[index] = stored;
      else docs.push(stored);
      return this;
    });
    // counting entities, and the indexes built in the background
    for (const model of storage.getAllEntityModels()) {
      mock.method(model, 'countDocuments', (filter: any) => query(() => (entities.has(filter.blueprint) ? 1 : 0)));
      for (const method of ['indexes', 'createIndex', 'dropIndex']) mock.method(model.collection, method, async () => []);
    }

    const qelos = createMockQelos({ logger: () => {}, seed: { personas: [{ email: 'admin@x.com', roles: ['admin'] }] } });
    const statuses: number[] = [];
    const compare = async (method: string, controller: Function, identifier: string, body: object = {}) => {
      const answer: { status: number; body?: any } = { status: 200 };
      let done: () => void;
      const finished = new Promise<void>((resolve) => (done = resolve));
      const res: any = {
        status: (code: number) => ((answer.status = code), res),
        json: (value: unknown) => ((answer.body = plain(value)), res),
        end: () => done(),
      };
      await controller({ headers: { tenant: '0' }, params: { blueprintIdentifier: identifier }, body: structuredClone(body) }, res);
      await finished;
      statuses.push(answer.status);
      const path = method === 'POST' ? '/api/blueprints' : `/api/blueprints/${identifier}`;
      const mine = await qelos.fetch(path, {
        method,
        headers: { [PERSONA_HEADER]: 'admin@x.com' },
        ...(method === 'DELETE' ? {} : { body: JSON.stringify(body) }),
      });
      assert.deepEqual(
        { status: mine.status, body: comparable(await mine.json()) },
        { status: answer.status, body: comparable(answer.body) },
        `${method} ${identifier} ${JSON.stringify(body)}`,
      );
    };
    const create = (body: object) => compare('POST', controllers.createBlueprint, '', body);
    const update = (identifier: string, body: object) => compare('PUT', controllers.updateBlueprint, identifier, body);
    const patch = (identifier: string, body: object) => compare('PATCH', controllers.patchBlueprint, identifier, body);
    const remove = (identifier: string) => compare('DELETE', controllers.removeBlueprint, identifier);

    await create(full);
    await create(full);
    await create(minimal);
    for (const refused of [
      { identifier: 'a' },
      { identifier: 'b', name: '' },
      { identifier: 'c', name: 'c', entityIdentifierMechanism: 'serial' },
      { identifier: 'd', name: 'd', permissionScope: 'everyone' },
      { identifier: 'e', name: 'e', permissions: [{ operation: 'publish' }] },
      { identifier: 'f', name: 'f', permissions: [{ scope: 'everyone' }] },
      { identifier: 'g', name: 'g', permissions: [{ guest: 'maybe' }] },
      { identifier: 'h', name: 'h', limitations: [{ scope: 'user' }] },
      { identifier: 'i', name: 'i', limitations: [{ value: 1 }] },
      { identifier: 'j', name: 'j', limitations: [{ scope: 'user', value: 'many' }] },
      { identifier: 'k', name: 'k', dispatchers: { create: 'sometimes' } },
      { identifier: 'l', name: 'l', properties: indexed(6) },
      { identifier: 'm', name: 'm', properties: { data: { title: 'D', type: 'object', indexed: true } } },
      { identifier: 'n', name: 'n', properties: { 'a.b': { ...property, indexed: true } } },
    ]) {
      await create(refused);
    }
    await create({ identifier: 'five', name: 'Five', properties: indexed(5) });

    await update('missing', { name: 'x' });
    await update('order', { name: 'Orders', identifier: 'renamed', tenant: 'other', unknown: 1 });
    await update('order', { properties: { code: property, untitled: { type: 'string' } } });
    await update('order', { permissions: [{ operation: 'create', scope: 'tenant' }], limitations: [] });
    for (const refused of [{ name: '' }, { name: { nested: true } }, { permissionScope: 'everyone' }, { properties: indexed(6) }, { relations: ['x'] }]) {
      await update('order', refused);
    }
    await patch('missing', {});
    await patch('order', {});
    await patch('order', {
      properties: { more: property },
      relations: [{ key: 'client', target: 'customer' }, { key: 'owner', target: 'person' }],
      updateMapping: { more: '.x' },
      permissions: [],
    });
    await patch('note', { updateMapping: {}, properties: indexed(2) });
    await patch('note', { properties: indexed(6) });

    entities.add('note');
    qelos.state.entities.insert('note', { metadata: {} });
    await remove('note');
    await remove('order');
    await remove('order');
    // both sides agreeing says little if the service only refused
    assert.equal(statuses.filter((status) => status === 200).length, 11, statuses.join(' '));
  });
});
