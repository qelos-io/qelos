import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMockQelos, MockState, type CreateMockQelosOptions } from '../src/index.js';

// The real SDK sources drive the mock. Loaded through a variable specifier so the SDK's own
// (differently configured) sources are not type-checked with this package; they are CommonJS-style,
// hence the default-export unwrapping under native ESM.
const sdkPath = '../../sdk/src/index.js';
const sdkModule: any = await import(sdkPath);
const QelosSDK: new (options: any) => any = sdkModule.default?.default ?? sdkModule.default ?? sdkModule;

const blueprints = [
  {
    identifier: 'product',
    name: 'Product',
    permissionScope: 'user',
    permissions: [
      { operation: 'read', guest: true, scope: 'tenant' },
      { operation: 'create', roleBased: ['editor'], scope: 'user' },
      { operation: 'update', roleBased: ['editor'], scope: 'user' },
      { operation: 'delete', roleBased: ['editor'], scope: 'user' },
    ],
    properties: {
      title: { type: 'string', required: true },
      price: { type: 'number' },
      kind: { type: 'string', enum: ['a', 'b'] },
      active: { type: 'boolean' },
      brand: { type: 'string' },
    },
    relations: [{ key: 'brand', target: 'brand' }],
  },
  { identifier: 'brand', name: 'Brand', properties: { name: { type: 'string', required: true } } },
];

function setup(options: CreateMockQelosOptions = {}) {
  const mock = createMockQelos({ logger: () => {}, seed: { blueprints: blueprints as any }, ...options });
  const sdk = new QelosSDK({ appUrl: 'http://qelos.mock', fetch: mock.fetch as any, apiToken: 'mock' });
  return { mock, sdk, products: sdk.entities('product') };
}

test('sdk entities: create, find with filters, sort and pagination', async () => {
  const { products } = setup();
  for (let i = 1; i <= 7; i++) {
    await products.create({ title: `item ${i}`, price: i * 10, kind: i % 2 ? 'a' : 'b', active: i > 3 } as any);
  }
  assert.equal((await products.find()).length, 7);
  assert.deepEqual((await products.where({ kind: 'a' }).find()).map((p: any) => p.title), ['item 1', 'item 3', 'item 5', 'item 7']);
  assert.equal((await products.where({ active: true }).find()).length, 4);

  const sorted = await products.query().sort('-price').limit(3).find();
  assert.deepEqual(sorted.map((p: any) => p.price), [70, 60, 50]);
  assert.deepEqual((await products.query().limit(3).page(2).find()).map((p: any) => p.price), [40, 50, 60]);
  assert.deepEqual((await products.query().limit(3).skip(5).find()).map((p: any) => p.price), [60, 70]);
  // $skip wins over $page
  assert.deepEqual((await products.query().limit(2).skip(1).page(3).find()).map((p: any) => p.price), [20, 30]);
  assert.equal(await products.count({ kind: 'b' }), 3);
  assert.equal(await products.count({ 'metadata.kind': 'b' }), 3);
  assert.equal((await products.query().where({ kind: 'b' }).findOne())?.title, 'item 2');
});

test('sdk entities: getById, update, delete and response shape', async () => {
  const { products, mock } = setup();
  const created = await products.create({ title: 'one', price: 5 } as any);
  assert.ok(created.identifier);
  assert.equal(created.id, created.identifier);
  assert.equal(created.title, 'one');
  assert.equal((created as any)._id, undefined);
  assert.ok(created.created && created.updated);

  const got = await products.findOne(created.identifier);
  assert.equal(got.price, 5);
  const wrapped = await products.getEntity(created.identifier, { query: { $flat: false } } as any);
  assert.equal(wrapped.metadata.title, 'one');
  assert.equal((wrapped as any).title, undefined);

  const updated = await products.update(created.identifier, { price: 9 } as any);
  assert.equal(updated.price, 9);
  assert.equal(updated.title, 'one'); // untouched properties are kept

  await products.remove(created.identifier);
  await assert.rejects(() => products.findOne(created.identifier), /entity not found/);
  assert.equal((await products.find()).length, 0);
  assert.equal(mock.state.entities.list('product').length, 0);
});

test('entity validation: required, type, enum and unknown blueprint', async () => {
  const { products, sdk } = setup();
  await assert.rejects(() => products.create({ price: 1 } as any), /Property title is required/);
  await assert.rejects(() => products.create({ title: 'x', price: 'abc' } as any), /must be a number/);
  await assert.rejects(() => products.create({ title: 'x', kind: 'z' } as any), /must be one of a, b/);
  await assert.rejects(() => sdk.entities('nope').find(), /blueprint not found/);
  await assert.rejects(() => products.create({ title: 'x', brand: 'missing' } as any), /relation target brand not found/);
});

test('relations: $populate', async () => {
  const { sdk, products } = setup();
  const brand = await sdk.entities('brand').create({ name: 'Acme' } as any);
  const p = await products.create({ title: 'x', brand: brand.identifier } as any);
  const [populated] = await products.getList({ $populate: true });
  assert.equal(populated.brand.name, 'Acme');
  assert.equal(populated.identifier, p.identifier);
});

test('permissions and scope follow the persona', async () => {
  const seed = {
    blueprints: blueprints as any,
    users: [
      { _id: 'a'.repeat(24), email: 'ed@x.io', roles: ['editor'] },
      { _id: 'b'.repeat(24), email: 'ed2@x.io', roles: ['editor'] },
      { _id: 'c'.repeat(24), email: 'viewer@x.io', roles: ['viewer'] },
      { _id: 'd'.repeat(24), email: 'root@x.io', roles: ['admin'] },
    ],
  };
  const mock = createMockQelos({ logger: () => {}, seed });
  const as = (email: string) =>
    new QelosSDK({
      appUrl: 'http://qelos.mock',
      fetch: mock.fetch as any,
      extraHeaders: async () => ({ 'x-qelos-mock-persona': email }),
    }).entities('product');

  const mine = await as('ed@x.io').create({ title: 'mine' } as any);
  assert.equal(mine.user, 'a'.repeat(24));
  await assert.rejects(() => as('viewer@x.io').create({ title: 'no' } as any), /not permitted/);
  assert.equal((await as('viewer@x.io').find()).length, 1); // read is open
  // update/delete restricted to the entity owner (user scope) unless admin
  await assert.rejects(() => as('ed2@x.io').update(mine.identifier, { title: 'x' } as any), /entity not found/);
  assert.equal((await as('root@x.io').update(mine.identifier, { title: 'by admin' } as any)).title, 'by admin');
  await assert.rejects(() => as('ghost@x.io').find(), /persona not found/);
  await as('ed@x.io').remove(mine.identifier);
});

test('blueprints, configurations, blocks and components', async () => {
  const { sdk, mock } = setup({
    seed: {
      blueprints: blueprints as any,
      configurations: [
        { key: 'app-configuration', public: true, metadata: { name: 'Mock App' } },
        { key: 'secret-config', public: false, metadata: { a: 1 } },
      ],
      blocks: [{ _id: 'b'.repeat(24), name: 'hero', content: '<h1/>' }],
      users: [{ _id: 'a'.repeat(24), email: 'ed@x.io', roles: ['editor'] }],
    },
  });
  assert.equal((await sdk.blueprints.getBlueprint('product')).name, 'Product');
  assert.equal((await sdk.blueprints.getList()).length, 2);
  assert.equal((await sdk.appConfigurations.getAppConfiguration()).metadata.name, 'Mock App');
  const updated = await sdk.appConfigurations.update({ theme: 'dark' } as any);
  assert.deepEqual(updated.metadata, { name: 'Mock App', theme: 'dark' });
  assert.equal((await sdk.blocks.getBlock('b'.repeat(24))).name, 'hero');
  const block = await sdk.blocks.create({ name: 'footer', content: 'f' } as any);
  assert.equal((await sdk.blocks.update(block._id as any, { content: 'g' } as any)).content, 'g');
  await sdk.blocks.remove(block._id as any);
  assert.equal((await sdk.blocks.getList()).length, 1);

  // non-admin personas do not read private configurations
  const cfg = (headers: Record<string, string> = {}) => mock.fetch('/api/configurations/secret-config', { headers });
  assert.equal((await cfg({ 'x-qelos-mock-persona': 'ed@x.io' })).status, 404);
  assert.equal((await cfg()).status, 200);

  const created = await mock.fetch('/api/components', { method: 'POST', body: JSON.stringify({ identifier: 'x' }) });
  const comp: any = await created.json();
  assert.equal((await (await mock.fetch(`/api/components/${comp._id}`)).json() as any).identifier, 'x');
  assert.equal((await mock.fetch(`/api/components/${comp._id}`, { method: 'DELETE' })).status, 200);
});

test('stubs: ai chat, lambdas, payments', async () => {
  const { sdk, mock } = setup({
    seed: {
      aiResponses: [{ agentId: 'agent1', match: 'hello', content: 'Hi there!' }],
      lambdas: [{ integrationId: 'int1', response: { ok: true } }],
    },
  });
  const hello = await sdk.ai.agents.chat('agent1', 'Hello world');
  assert.equal(hello.choices[0].message.content, 'Hi there!');
  assert.equal((await sdk.ai.agents.chat('agent1', 'other')).choices[0].message.content, 'Mock response: other');

  assert.deepEqual(await sdk.lambdas.get('int1'), { ok: true });
  assert.deepEqual(await sdk.lambdas.get('unknown'), {});
  assert.deepEqual(await sdk.payments.getPlans(), []);
});

test('management api, extension hooks and fallback', async () => {
  const seen: string[] = [];
  const { mock } = setup({ onMissing: (req) => (new URL(req.url).pathname === '/api/hooked' ? Response.json({ hooked: true }) : void seen.push(req.url)) });
  const call = (path: string, init?: RequestInit) => mock.fetch(path, init);

  assert.equal((await call('/api/nope')).status, 404);
  assert.equal(seen.length, 1);
  const missing: any = await (await call('/api/nope?x=1')).json();
  assert.deepEqual([missing.code, missing.method, missing.path], ['QELOS_MOCK_NOT_IMPLEMENTED', 'GET', '/api/nope']);
  assert.deepEqual(await (await call('/api/hooked')).json(), { hooked: true });

  mock.on('GET', '/api/foo', () => ({ foo: 1 }));
  mock.on('GET', '/api/blueprints', () => ({ overridden: true }));
  assert.deepEqual(await (await call('/api/foo')).json(), { foo: 1 });
  assert.deepEqual(await (await call('/api/blueprints')).json(), { overridden: true });

  const prefix = '/__qelos_mock__';
  await call(`${prefix}/seed`, { method: 'POST', body: JSON.stringify({ entities: { brand: [{ _id: 'e'.repeat(24), name: 'Seeded' }] } }) });
  const state: any = await (await call(`${prefix}/state`)).json();
  assert.equal(state.entities.brand.length, 1);
  assert.equal(((await (await call('/api/blueprints/brand/entities')).json()) as any[])[0].name, 'Seeded');

  const put = await call(`${prefix}/collections/entities.brand`, { method: 'PUT', body: JSON.stringify([{ name: 'A' }, { name: 'B' }]) });
  assert.deepEqual(await put.json(), { ok: true, count: 2 });
  assert.equal(((await (await call('/api/blueprints/brand/entities')).json()) as any[]).length, 2);
  await call(`${prefix}/collections/blocks`, { method: 'PUT', body: JSON.stringify([{ name: 'only' }]) });
  assert.equal(mock.state.blocks.size, 1);
  assert.equal((await call(`${prefix}/collections/bogus`, { method: 'PUT', body: '[]' })).status, 404);
  assert.equal((await call(`${prefix}/collections/blocks`, { method: 'PUT', body: '{}' })).status, 400);
  assert.equal((await call(`${prefix}/seed`, { method: 'POST', body: JSON.stringify({ users: [{ name: 'x' }] }) })).status, 400);

  const routes: any[] = await (await call(`${prefix}/routes`)).json();
  assert.ok(routes.some((r) => r.method === 'GET' && r.path === '/api/blueprints/:blueprint/entities'));

  await call(`${prefix}/reset`, { method: 'POST' });
  assert.equal(((await (await call('/api/blueprints/brand/entities')).json()) as any[]).length, 0);
  assert.equal(mock.state.blueprints.size, 2); // back to the configured seed
});

test('management api is not mounted when the mock is disabled', async () => {
  const { mock } = setup({ enabled: false });
  assert.equal((await mock.fetch('/__qelos_mock__/state')).status, 404);
});

test('state persists entity changes made through the API to JSON', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'qelos-mock-routes-'));
  const first = setup({ dataDir, seed: { blueprints: blueprints as any } });
  const created = await first.products.create({ title: 'persisted', price: 3 } as any);
  const other = await first.products.create({ title: 'removed' } as any);
  await first.products.remove(other.identifier);
  await first.mock.state.flush();

  const onDisk = JSON.parse(readFileSync(join(dataDir, 'state', 'entities.json'), 'utf8'));
  assert.equal(onDisk.product.length, 1);
  assert.equal(onDisk.product[0].metadata.title, 'persisted');

  const second = setup({ dataDir });
  assert.equal((await second.products.findOne(created.identifier)).title, 'persisted');
  assert.equal((await second.products.find()).length, 1);
  assert.ok(new MockState({ dataDir, persist: true }).blueprints.size === 2);
});

test('query operators with bracket syntax', async () => {
  const { products, mock } = setup();
  for (let i = 1; i <= 6; i++) await products.create({ title: `item ${i}`, price: i * 10 } as any);
  const get = async (qs: string) => (await (await mock.fetch(`/api/blueprints/product/entities?${qs}`)).json()) as any[];
  assert.equal((await get('price[$gt]=30&price[$lte]=60')).length, 3);
  assert.equal((await get('price[$in][]=10&price[$in][]=20')).length, 2);
  assert.equal((await get('price[$ne]=10')).length, 5);
  assert.equal((await get('$q=ITEM 4')).length, 1);
  assert.equal((await get('title[$regex]=^item [12]$')).length, 2);
  assert.deepEqual((await get('$sort=-price&$limit=2')).map((p) => p.price), [60, 50]);
});

test('the persona cookie identifies the caller on entity routes too (integrators forward cookies, not headers)', async () => {
  const { mock } = setup({
    seed: {
      blueprints: blueprints as any,
      personas: [
        { email: 'editor@x.com', roles: ['editor'] },
        { email: 'reader@x.com', roles: ['user'] },
      ],
    },
  });
  const create = (persona: string) =>
    mock.fetch('/api/blueprints/product/entities', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `qelos_mock_persona=${encodeURIComponent(persona)}` },
      body: JSON.stringify({ title: 'x' }),
    });
  assert.equal((await create('editor@x.com')).status, 200);
  assert.equal((await create('reader@x.com')).status, 403);
});
