import '../helpers/production-env';
import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { getApp } from '../../src/app';
import { setConfig } from '../../src/config';
import { createCrud } from '../../src/crud';
import { ResponseError } from '../../src/response-error';
import manifest from '../../src/manifest';
import { fakeTenant, type FakeTenant } from '../helpers/fake-tenant';
import { proxyHeaders, secrets, tenantPayload, user } from '../helpers/tokens';

/**
 * createCrud() through the real Fastify app: the five proxy endpoints it registers, the validation and
 * public-field filtering of its schema, error mapping, the manifest entries and the events it dispatches.
 */
type Product = { _id: string; title: string; price: number; secret: string; tags: string[]; address: object };

const store = new Map<string, Product>();
let own: FakeTenant;
let customer: FakeTenant;
let nextId = 1;
const received: Array<{ method: string; body: any }> = [];

const schema = {
  title: { type: String, public: true },
  price: { type: Number, public: true, hideInList: true },
  secret: { type: String },
  tags: { type: Array, public: true },
  address: { type: Object, public: true },
};

// a schema with a nested schema: see the "nested schemas" tests
const nestedSchema = {
  name: { type: String, public: true },
  address: { type: Object, public: true, schema: { city: { type: String, public: true }, zip: { type: String } } },
};

before(async () => {
  own = await fakeTenant();
  customer = await fakeTenant();
  setConfig({ ...secrets, dev: false, qelosUrl: own.url, qelosUsername: 'plugin', qelosPassword: 'pw' });
  // the encrypted credentials the plugin keeps for the tenant, used to dispatch events back to it
  own.encrypted.set(tenantPayload.sub, { appUrl: customer.url, username: 'plugin.t1@127.0.0.1', password: 'pw', currentAuthPayload: { token: 'tok', refreshToken: 'ref' } });

  createCrud<Product, Product>({
    display: { name: 'product' },
    schema: schema as any,
    dispatchPrefix: false,
    verify: async (req) => {
      if ((req.headers['x-deny'] as string) === '1') throw new ResponseError('forbidden here', 403);
    },
    createOne: async (body) => {
      received.push({ method: 'create', body });
      const item = { _id: `p${nextId++}`, ...(body as any) } as Product;
      store.set(item._id, item);
      return item;
    },
    readOne: async (id) => {
      const item = store.get(id);
      if (!item) throw new ResponseError('product not found', 404);
      return item;
    },
    readMany: async () => [...store.values()],
    updateOne: async (id, body) => {
      received.push({ method: 'update', body });
      const next = { ...store.get(id)!, ...(body as any) };
      store.set(id, next);
      return next;
    },
    deleteOne: async (id) => {
      const item = store.get(id)!;
      store.delete(id);
      return item;
    },
  });

  createCrud<any, any>({
    display: { name: 'widget' },
    schema: nestedSchema as any,
    dispatchPrefix: false,
    createOne: async (body) => ({ _id: 'w1', ...body }),
    readOne: async () => ({}),
    readMany: async () => [],
    updateOne: async () => ({}),
    deleteOne: async () => ({}),
  });

  createCrud({
    display: { name: 'order' },
    dispatchPrefix: 'my-plugin',
    screens: { list: {}, create: {}, edit: false, view: false },
    createOne: async (body) => ({ _id: 'o1', ...body }),
    readOne: async () => ({}),
    readMany: async () => [],
    updateOne: async () => ({}),
    deleteOne: async () => ({}),
  } as any);
  await getApp().ready();
});

after(async () => {
  await Promise.all([own.close(), customer.close()]);
});

const call = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object, headers: Record<string, string> = {}) =>
  getApp().inject({ method, url, payload, headers: { ...proxyHeaders(), ...headers } });
const json = (res: { body: string }) => JSON.parse(res.body);

describe('create', () => {
  test('passes only the schema fields with the right types to createOne, and answers the public fields', async () => {
    const res = await call('POST', '/api/play/products', {
      title: 'Desk',
      price: 'not a number',
      secret: 'internal',
      unknown: 'dropped',
      tags: ['a', 'b'],
      address: { city: 'Paris' },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(received.at(-1)!.body, { title: 'Desk', secret: 'internal', tags: ['a', 'b'], address: { city: 'Paris' } });
    // price had the wrong type and secret is not public
    assert.deepEqual(json(res), { _id: 'p1', title: 'Desk', tags: ['a', 'b'], address: { city: 'Paris' } });
  });

  test('without a bearer token the request is rejected', async () => {
    const res = await getApp().inject({ method: 'POST', url: '/api/play/products', payload: { title: 'x' } });
    assert.notEqual(res.statusCode, 200);
    assert.match(res.body, /authorization token was not provided/);
  });
});

// createCrud() builds the manifest's JSON schema with getJsonSchema(), which also writes back into the schema it
// was given. For a schema with a nested `schema` this adds a stray `type` key, and every request then fails with
// "Cannot read properties of undefined (reading 'type')".
describe('nested schemas', () => {
  test('create validates and filters a nested object schema', { todo: 'getJsonSchema mutates the nested schema, so requests answer 500' }, async () => {
    const res = await call('POST', '/api/play/widgets', { name: 'w', address: { city: 'Paris', zip: '75001' } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(json(res), { _id: 'w1', name: 'w', address: { city: 'Paris' } });
  });

  test('the schema passed to createCrud is not changed', { todo: 'getJsonSchema writes the JSON schema back into the nested schema' }, () => {
    assert.deepEqual(Object.keys(nestedSchema.address.schema), ['city', 'zip']);
  });
});

describe('read', () => {
  before(async () => {
    await call('POST', '/api/play/products', { title: 'Chair', price: 25, secret: 's', tags: ['x'], address: { city: 'Rome' } });
  });

  test('one item shows every public field, including those hidden in lists', async () => {
    const res = await call('GET', '/api/play/products/p2');
    assert.equal(res.statusCode, 200);
    assert.deepEqual(json(res), { _id: 'p2', title: 'Chair', price: 25, tags: ['x'], address: { city: 'Rome' } });
  });

  test('a list hides the fields marked hideInList and the non-public ones', async () => {
    const res = await call('GET', '/api/play/products');
    assert.equal(res.statusCode, 200);
    const list = json(res);
    assert.equal(list.length, 2);
    for (const item of list) {
      assert.equal('price' in item, false);
      assert.equal('secret' in item, false);
    }
    assert.deepEqual(list.map((i: any) => i.title), ['Desk', 'Chair']);
  });

  test('a ResponseError thrown by the handler becomes its status and message', async () => {
    const res = await call('GET', '/api/play/products/missing');
    assert.equal(res.statusCode, 404);
    assert.deepEqual(json(res), { message: 'product not found' });
  });
});

describe('update and delete', () => {
  test('update validates the body like create and answers the public data', async () => {
    const res = await call('PUT', '/api/play/products/p1', { title: 'Big desk', price: 'x', unknown: 1 });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(received.at(-1)!.body, { title: 'Big desk' });
    assert.equal(json(res).title, 'Big desk');
  });

  test('delete removes the item and answers its public data', async () => {
    const res = await call('DELETE', '/api/play/products/p2');
    assert.equal(res.statusCode, 200);
    assert.equal(json(res).title, 'Chair');
    assert.equal(store.has('p2'), false);
  });
});

describe('verify hook', () => {
  test('a ResponseError from verify stops every operation with its status', async () => {
    for (const [method, url] of [['GET', '/api/play/products'], ['GET', '/api/play/products/p1'], ['POST', '/api/play/products'], ['PUT', '/api/play/products/p1'], ['DELETE', '/api/play/products/p1']] as const) {
      const res = await call(method, url, method === 'GET' || method === 'DELETE' ? undefined : { title: 'x' }, { 'x-deny': '1' });
      assert.equal(res.statusCode, 403, `${method} ${url}`);
      assert.deepEqual(json(res), { message: 'forbidden here' });
    }
    assert.ok(store.has('p1'), 'nothing was deleted');
  });
});

describe('events dispatched back to the tenant', () => {
  test('creating an item sends a create event with the prefix, the crud name and the user', async () => {
    const res = await call('POST', '/api/play/orders', { total: 5 });
    assert.equal(res.statusCode, 200);
    for (let i = 0; i < 50 && !customer.events.length; i++) await new Promise((r) => setTimeout(r, 20));
    assert.equal(customer.events.length, 1);
    assert.equal(customer.events[0].source, 'my-plugin:orders');
    assert.equal(customer.events[0].kind, 'create');
    assert.equal(customer.events[0].eventName, 'create-order');
    assert.equal(customer.events[0].user, user._id);
  });

  test('a crud created with dispatchPrefix false sends no events', async () => {
    const before = customer.events.length;
    await call('POST', '/api/play/products', { title: 'No event' });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(customer.events.length, before);
  });
});

describe('the manifest describes the crud', () => {
  test('lists the crud with its display names and a JSON version of the schema', () => {
    const crud: any = manifest.cruds.find((c) => c.name === 'products');
    assert.ok(crud);
    assert.deepEqual(crud.display, { name: 'product', plural: 'products', capitalized: 'Product', capitalizedPlural: 'Products' });
    assert.equal(crud.identifierKey, '_id');
    assert.equal(crud.schema.title.type, 'String');
    assert.equal(crud.schema.price.type, 'Number');
  });

  test('adds a nav bar group and a micro frontend per screen, each with its own route', () => {
    assert.ok(manifest.navBarGroups.some((g: any) => g.key === 'products' && g.name === 'Products'));
    const routes = manifest.microFrontends
      .filter((m: any) => m.route?.group === 'products')
      .map((m: any) => [m.name, m.route.path, m.route.navBarPosition, m.use]);
    assert.deepEqual(routes, [
      ['List', 'products', 'top', 'rows-list'],
      ['Create', 'add-product', 'top', 'basic-form'],
      ['Edit', 'edit-product/:id', false, 'basic-form'],
      ['View', 'view-product/:id', false, 'basic-form'],
    ]);
  });

  test('after creating, the create screen navigates to the edit screen with the new identifier', () => {
    const create: any = manifest.microFrontends.find((m: any) => m.route?.name === 'add-product');
    assert.deepEqual(create.navigateAfterSubmit, { name: 'edit-product', params: { id: '{IDENTIFIER}' } });
    assert.equal(create.clearAfterSubmit, false);
  });

  test('screens set to false are left out, and a create screen without an edit screen clears the form', () => {
    const names = manifest.microFrontends.filter((m: any) => m.route?.group === 'orders').map((m: any) => m.name);
    assert.deepEqual(names, ['List', 'Create']);
    const create: any = manifest.microFrontends.find((m: any) => m.route?.name === 'add-order');
    assert.equal(create.clearAfterSubmit, true);
  });
});
