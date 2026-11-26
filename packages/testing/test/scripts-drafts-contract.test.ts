import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

/**
 * Contract between the mock and the controllers of scripts and components (`apps/no-code`, with the real compilers)
 * and of drafts (`apps/drafts`). The database models are replaced by an in-memory list.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(root, path));
  return loaded.default?.default ?? loaded.default ?? loaded;
};
const named = async (path: string): Promise<any> => {
  const loaded: any = await import(join(root, path));
  return loaded.default ?? loaded;
};
const plain = (value: unknown) => JSON.parse(JSON.stringify(value ?? null));
const UNKNOWN = 'f'.repeat(24);
const ADMIN = 'a'.repeat(24);
const personas = ['admin', 'plugin', 'editor', 'user'].map((role, i) => ({ _id: i ? `${i}`.repeat(24) : ADMIN, email: `${role}@x.com`, roles: [role] }));
const mockWith = () => createMockQelos({ logger: () => {}, seed: { personas } });

async function call(qelos: ReturnType<typeof mockWith>, method: string, path: string, body?: unknown, role: string | null = 'admin') {
  const res = await qelos.fetch(path, {
    method,
    headers: role ? { [PERSONA_HEADER]: `${role}@x.com` } : {},
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

async function real(controller: Function, req: object) {
  const answer: { status: number; body?: any } = { status: 200 };
  let done: () => void;
  const finished = new Promise<void>((resolve) => (done = resolve));
  const res: any = {
    status: (code: number) => ((answer.status = code), res),
    json: (body: unknown) => ((answer.body = plain(body)), res),
    end: () => done(),
  };
  await controller({ headers: { tenant: '0', tenanthost: 'app.test' }, params: {}, query: {}, body: {}, user: { _id: ADMIN }, ...req }, res);
  // `drafts` answers a failed removal without ending the response
  await Promise.race([finished, new Promise((resolve) => setTimeout(resolve, 10_000).unref())]);
  return answer;
}

/** the parts of a mongoose model the controllers use, over a list; `undefined` in a filter matches a missing value */
function listModel(Model: any, unique: boolean) {
  const docs: any[] = [];
  const same = (doc: any, filter: object) =>
    Object.entries(filter).every(([key, value]) => key === 'tenant' || String(doc[key] ?? null) === String(value ?? null));
  const project = (doc: any, spec?: string) => {
    if (!doc || !spec) return doc && { ...doc };
    const fields = spec.split(' ');
    return fields[0].startsWith('-')
      ? Object.fromEntries(Object.entries(doc).filter(([key]) => !fields.includes(`-${key}`)))
      : Object.fromEntries(Object.entries(doc).filter(([key]) => key === '_id' || fields.includes(key)));
  };
  const query = (read: () => any) => {
    let spec: string | undefined;
    const run = async () => {
      const value = read();
      return Array.isArray(value) ? value.map((doc) => project(doc, spec)) : project(value ?? null, spec);
    };
    const chain: any = { select: (s: string) => ((spec = s), chain), lean: () => chain, exec: run, then: (a: any, b: any) => run().then(a, b) };
    return chain;
  };
  const taken = (identifier: unknown, except?: unknown) => unique && docs.some((d) => d !== except && d.identifier === identifier);
  const duplicate = () => new Error('E11000 duplicate key error');
  mock.method(Model, 'find', (filter: object) => query(() => docs.filter((d) => same(d, filter))));
  mock.method(Model, 'findOne', (filter: object) => query(() => docs.find((d) => same(d, filter))));
  mock.method(Model, 'exists', async (filter: object) => docs.some((d) => same(d, filter)));
  mock.method(Model, 'deleteOne', (filter: object) => ({
    exec: async () => {
      const index = docs.findIndex((d) => same(d, filter));
      if (index >= 0) docs.splice(index, 1);
    },
  }));
  mock.method(Model, 'findOneAndDelete', (filter: object) =>
    query(() => {
      const index = docs.findIndex((d) => same(d, filter));
      return index >= 0 ? docs.splice(index, 1)[0] : null;
    }),
  );
  mock.method(Model, 'findOneAndUpdate', (filter: any, update: any, options: any) =>
    query(() => {
      const { $set = update, $setOnInsert } = update;
      let doc = docs.find((d) => same(d, filter));
      if (!doc) {
        if (!options?.upsert) return null;
        // an upsert adds the defaults of the schema, and stores what it was given as it is (empty objects too)
        doc = { ...plain(new Model({ ...filter, ...$setOnInsert, ...$set })), ...plain($set) };
        docs.push(doc);
      } else {
        if ($set.identifier && taken($set.identifier, doc)) throw duplicate();
        Object.assign(doc, plain($set));
      }
      return { ...doc };
    }),
  );
  mock.method(Model.prototype, 'save', async function (this: any) {
    await this.validate();
    if (taken(this.identifier)) throw duplicate();
    docs.push(plain(this));
    return this;
  });
  return docs;
}

/** ids, times and what only a compiler can know differ; a compiler's own words are not mirrored either */
const comparable = (value: any): any => {
  if (Array.isArray(value)) return value.map(comparable);
  if (!value || typeof value !== 'object') return value;
  const entries = Object.entries(value).filter(([key]) => !['_id', 'created', 'updated', 'compiledContent', 'requiredProps', '__v'].includes(key));
  const result: any = Object.fromEntries(entries.map(([key, v]) => [key, comparable(v)]));
  if (String(result.message).startsWith('failed to compile')) delete result.reason;
  if (result.error && !/invalid identifier|already exists|validation failed/.test(result.error)) result.error = 'does not compile';
  return result;
};

describe('the mock follows scripts and components', () => {
  test('who may call each route', async () => {
    const { verifyUser } = await named('packages/api-kit/src/user-middlewares');
    const { onlyEditPrivileged } = await named('apps/no-code/server/middlewares/privileged-check');
    const qelos = mockWith();
    const routes = [
      ...['scripts', 'components'].flatMap((api) => [
        ['GET', `/api/${api}`],
        ['GET', `/api/${api}/x`],
        ['POST', `/api/${api}`],
        ['POST', `/api/${api}/bulk`],
        ['PUT', `/api/${api}/x`],
        ['DELETE', `/api/${api}/x`],
      ]),
    ];
    for (const role of ['admin', 'plugin', 'editor', 'user']) {
      let status = 200;
      const res: any = { status: (code: number) => ((status = code), res), end: () => {} };
      const req = { user: { roles: [role] } };
      verifyUser(req, res, () => onlyEditPrivileged(req, res, () => {}));
      for (const [method, path] of routes) {
        const answer = await call(qelos, method, path, method === 'GET' ? undefined : {}, role);
        assert.equal(answer.status === 401, status === 401, `${role} ${method} ${path}: ${answer.status}`);
      }
    }
  });

  test('the same requests answer the same', async (t) => {
    // the script compiler runs a build in this process, which marks it as a production one
    const environment = process.env.NODE_ENV;
    t.after(() => void (environment === undefined ? delete process.env.NODE_ENV : (process.env.NODE_ENV = environment)));
    const logger = await load('apps/no-code/server/services/logger');
    for (const level of ['log', 'error']) mock.method(logger, level, () => {});
    const scripts = listModel(await load('apps/no-code/server/models/script'), true);
    const components = listModel(await load('apps/no-code/server/models/component'), true);
    const unified = await named('apps/no-code/server/controllers/scripts-api');
    const legacy = await named('apps/no-code/server/controllers/components');
    const qelos = mockWith();
    /** `:Name` in a path is the id of the item with that identifier, on each side */
    const idOf = (list: any[], identifier: string) => list.find((d) => d.identifier === identifier)?._id ?? UNKNOWN;
    const mine = () => [...qelos.state.scripts.list(), ...qelos.state.components.list()];

    const compare = async (method: string, path: string, controller: Function, request: { body?: unknown; query?: object; param?: string } = {}) => {
      const [pathname, query = ''] = path.split('?');
      const key = pathname.split(':')[1];
      const realId = key ? idOf([...scripts, ...components], key) : request.param;
      const mockId = key ? idOf(mine(), key) : request.param;
      const expected = await real(controller, {
        body: structuredClone(request.body ?? {}),
        query: Object.fromEntries(new URLSearchParams(query)),
        params: { scriptId: realId, componentId: realId },
      });
      const url = `${pathname.replace(/:.*$/, mockId ?? '')}${query ? `?${query}` : ''}`;
      const answer = await call(qelos, method, url, method === 'GET' ? undefined : (request.body ?? {}));
      assert.deepEqual(
        { status: answer.status, body: comparable(answer.body) },
        { status: expected.status, body: comparable(expected.body) },
        `${method} ${path} ${JSON.stringify(request.body)}`,
      );
    };
    const create = (body: object) => compare('POST', '/api/scripts', unified.createOne, { body });
    const component = { componentName: 'Card', identifier: 'Card', content: '<template><div/></template>' };

    await create({ identifier: './utils/a.ts', content: 'export const a = 1', description: 'd' });
    await create({ identifier: 'utils/a', content: 'export const a = 1' });
    await create({ identifier: '../out', content: 'export const a = 1' });
    await create({ identifier: 'b' });
    await create({ identifier: 'b', content: '' });
    await create(component);
    await create(component);
    await create({ ...component, identifier: 'NoName', componentName: undefined, type: 'component' });
    await create({ identifier: 'NoContent', componentName: 'NoContent' });
    await create({ identifier: 'b', content: 'export const b = 1' });

    for (const query of ['', '?type=script', '?type=component', '?type=other']) await compare('GET', `/api/scripts${query}`, unified.listAll);
    for (const id of [':utils/a', ':Card', ':missing']) await compare('GET', `/api/scripts/${id}`, unified.getOne);

    const update = (id: string, body: object) => compare('PUT', `/api/scripts/${id}`, unified.updateOne, { body });
    await update(':utils/a', { description: 'changed' });
    await update(':utils/a', { identifier: '..' });
    await update(':utils/a', { identifier: 'b' });
    await update(':b', { content: 'export const b = 2' });
    await update(':Card', { componentName: 'Renamed', description: 'd' });
    await update(':missing', { description: 'x' });

    const bulk = (body: object) => compare('POST', '/api/scripts/bulk', unified.bulkUpsert, { body });
    await bulk({});
    await bulk({ items: 'x' });
    await bulk({ items: [] });
    await bulk({
      items: [{ identifier: 'c', content: 'export const c = 1' }, { identifier: '..', content: 'x' }, { identifier: 'd' }],
      components: [
        { identifier: 'New', componentName: 'New', content: '<template><p/></template>' },
        { identifier: 'Unnamed', content: '<template><p/></template>' },
        { identifier: 'Empty', componentName: 'Empty', content: '' },
      ],
    });
    await bulk({ scripts: [{ identifier: 'c', content: 'export const c = 2', description: 'again' }] });
    await bulk({ items: [{ identifier: 'Moved', componentName: 'New', content: '<template><p/></template>' }] });
    await compare('GET', '/api/scripts', unified.listAll);

    // the older API
    await compare('GET', '/api/components', legacy.getAllComponents);
    await compare('GET', '/api/components/:Card', legacy.getSingleComponent);
    await compare('GET', `/api/components/${UNKNOWN}`, legacy.getSingleComponent, { param: UNKNOWN });
    await compare('PUT', `/api/components/${UNKNOWN}`, legacy.updateComponent, { param: UNKNOWN, body: { description: 'x' } });
    await compare('PUT', `/api/components/${UNKNOWN}`, legacy.updateComponent, { param: UNKNOWN, body: { content: '<template/>' } });
    await compare('DELETE', `/api/components/${UNKNOWN}`, legacy.removeComponent, { param: UNKNOWN });
    await compare('PUT', '/api/components/:Card', legacy.updateComponent, { body: { identifier: 'Moved' } });
    for (const body of [{}, { components: [] }, { components: [component, { ...component, identifier: 'Two', componentName: 'Two' }] }]) {
      await compare('POST', '/api/components/bulk', legacy.bulkCreateOrUpdateComponents, { body });
    }

    await compare('DELETE', '/api/scripts/:utils/a', unified.removeOne);
    await compare('DELETE', '/api/scripts/:Card', unified.removeOne);
    await compare('DELETE', '/api/scripts/:missing', unified.removeOne);
    await compare('GET', '/api/scripts', unified.listAll);
  });
});

describe('the mock follows the drafts service', () => {
  test('saving, reading and removing drafts', async () => {
    // loading the service must not connect to a database
    const mongoose = createRequire(join(root, 'apps/drafts/package.json'))('mongoose');
    mock.method(mongoose, 'connect', async () => {});
    const controllers = await named('apps/drafts/server/controllers/drafts');
    const Draft = createRequire(join(root, 'apps/drafts/package.json'))('./server/dao/mongo/models/draft');
    listModel(Draft.default ?? Draft, false);
    const qelos = mockWith();
    const compare = async (method: string, path: string, controller: Function, body?: object) => {
      const query = Object.fromEntries(new URLSearchParams(path.split('?')[1]));
      const expected = await real(controller, { query, body: structuredClone(body ?? {}) });
      const answer = await call(qelos, method, path, body);
      const shape = (a: any) => ({ status: a.status, body: comparable(a.body && !Array.isArray(a.body) ? { ...a.body, tenant: undefined, user: undefined } : a.body?.length) });
      assert.deepEqual(shape(answer), shape(expected), `${method} ${path} ${JSON.stringify(body)}`);
    };
    const get = (query = '') => compare('GET', `/api/drafts${query}`, controllers.getDraft);
    const set = (body: object) => compare('PUT', '/api/drafts', controllers.setDraft, body);
    const remove = (query: string) => compare('DELETE', `/api/drafts${query}`, controllers.deleteDraft);

    await get();
    await get('?contextType=post&contextId=1');
    await set({ contextType: 'post', contextId: '1', contextData: { a: 1 } });
    await set({ contextType: 'post', contextData: { b: 1 }, contextDisplayName: 'New', contextRouteParams: { id: 'x' } });
    await set({ contextType: 'post', contextId: '1', contextData: { a: 2 } });
    for (const query of ['', '?contextType=post', '?contextType=post&contextId=1', '?contextType=post&contextId=2', '?contextId=1']) await get(query);
    await compare('GET', '/api/drafts/all', controllers.getDraftsList);
    await remove('?contextType=post&contextId=1');
    await get('?contextType=post&contextId=1');
    await remove('?contextType=post');
    await remove('?contextType=missing');
    await compare('GET', '/api/drafts/all', controllers.getDraftsList);

    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal((await call(qelos, method, '/api/drafts', method === 'GET' ? undefined : {}, null)).status, 401, method);
    }
  });
});
