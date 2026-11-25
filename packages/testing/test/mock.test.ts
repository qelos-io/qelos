import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createMockQelos,
  resolveMockConfig,
  validateMockConfig,
  MockState,
  Router,
  MockConfigError,
  MockProductionError,
  isValidId,
} from '../src/index.js';

const quiet = { logger: () => {} };

test('router matches method, params and wildcard', async () => {
  const mock = createMockQelos({
    ...quiet,
    routes: [
      (r) => {
        r.register('GET', '/api/users/:id', ({ params }) => ({ id: params.id }));
        r.register('POST', '/api/echo', async ({ json }) => ({ got: await json() }));
        r.register('GET', '/api/files/*', ({ params }) => ({ path: params['*'] }));
      },
    ],
  });
  const call = (p: string, init?: RequestInit) => mock.handle(new Request('http://x' + p, init));
  assert.deepEqual(await (await call('/api/users/a%20b')).json(), { id: 'a b' });
  assert.deepEqual(await (await call('/api/users/1/')).json(), { id: '1' });
  assert.deepEqual(await (await call('/api/files/a/b.txt')).json(), { path: 'a/b.txt' });
  const post = await call('/api/echo', { method: 'POST', body: JSON.stringify({ a: 1 }) });
  assert.deepEqual(await post.json(), { got: { a: 1 } });
  assert.equal((await call('/api/users/1', { method: 'DELETE' })).status, 404);
  assert.equal(new Router().match('GET', '/x'), null);
});

test('unknown routes return 404 json', async () => {
  const mock = createMockQelos(quiet);
  const res = await mock.fetch('/api/nope');
  assert.equal(res.status, 404);
  const body: any = await res.json();
  assert.equal(body.code, 'QELOS_MOCK_NOT_IMPLEMENTED');
  assert.ok(body.message);
});

test('resolveMockConfig from env', () => {
  assert.equal(resolveMockConfig({}).enabled, false);
  assert.equal(resolveMockConfig({ QELOS_MOCK: '1' }).enabled, true);
  assert.equal(resolveMockConfig({ QELOS_MOCK: 'true' }).persist, false);
  assert.equal(resolveMockConfig({ QELOS_MOCK: '0' }).enabled, false);
  const c = resolveMockConfig({ QELOS_MOCK: './mock-data' });
  assert.equal(c.enabled, true);
  assert.equal(c.dataDir, './mock-data');
  assert.equal(c.persist, true);
  assert.equal(resolveMockConfig({ QELOS_MOCK: '1' }, { enabled: false }).enabled, false);
  assert.equal(resolveMockConfig({ QELOS_MOCK: '1' }, { defaultPersona: 'a@b.c' }).defaultPersona, 'a@b.c');
});

test('config validation', () => {
  assert.throws(() => validateMockConfig({ enabled: 'yes' }), MockConfigError);
  assert.throws(() => validateMockConfig({ persist: true }), MockConfigError);
  assert.throws(() => validateMockConfig({ seed: { users: [{ name: 'x' }] } }), MockConfigError);
  assert.equal(validateMockConfig({ dataDir: '/tmp/x' }).persist, true);
});

test('state persistence round-trip, reset and snapshot', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'qelos-mock-'));
  const seed = {
    users: [{ email: 'a@b.c' }],
    blueprints: [{ identifier: 'todo' }],
    entities: { todo: [{ title: 'seeded' }] },
  };
  const s1 = new MockState({ dataDir, persist: true, seed });
  assert.ok(isValidId(s1.users.list()[0]._id));
  const created = s1.entities.insert('todo', { title: 'new' });
  s1.workspaces.insert({ name: 'ws' });
  await s1.flush();
  assert.ok(existsSync(join(dataDir, 'state', 'entities.json')));
  assert.ok(!readdirSync(join(dataDir, 'state')).some((f) => f.endsWith('.tmp')));

  const s2 = new MockState({ dataDir, persist: true, seed: {} });
  assert.equal(s2.entities.list('todo').length, 2);
  assert.equal(s2.entities.get('todo', created._id)?.title, 'new');
  assert.equal(s2.workspaces.list()[0].name, 'ws');
  assert.equal(s2.snapshot().users.length, 1);

  s2.reset(); // reseed with empty seed
  assert.equal(s2.entities.list('todo').length, 0);
  await s2.flush();
  const s3 = new MockState({ dataDir, persist: true, seed });
  assert.equal(s3.users.size, 0);

  const s4 = new MockState({ seed });
  s4.entities.insert('todo', { title: 'tmp' });
  s4.reset();
  assert.equal(s4.entities.list('todo').length, 1);
});

test('debounced writes flush automatically', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'qelos-mock-'));
  const s = new MockState({ dataDir, persist: true, persistDebounceMs: 5 });
  s.users.insert({ email: 'x@y.z' });
  await new Promise((r) => setTimeout(r, 150));
  const s2 = new MockState({ dataDir, persist: true });
  assert.equal(s2.users.list()[0].email, 'x@y.z');
});

test('production guard', () => {
  assert.throws(() => createMockQelos({ ...quiet, env: { NODE_ENV: 'production' } }), MockProductionError);
  const logs: string[] = [];
  createMockQelos({ allowInProduction: true, env: { NODE_ENV: 'production' }, logger: (m) => logs.push(m) });
  assert.match(logs[0], /QELOS DEV MOCK IS ACTIVE/);
  createMockQelos({ ...quiet, env: { NODE_ENV: 'development' } });
});

test('personas.json in dataDir seeds personas', async () => {
  const { writeFileSync, rmSync } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'qelos-mock-personas-'));
  try {
    writeFileSync(join(dir, 'personas.json'), JSON.stringify([{ email: 'a@example.com', name: 'A', roles: ['admin'] }]));
    const mock = createMockQelos({ dataDir: dir, defaultPersona: 'a@example.com', logger: () => {} });
    const res = await mock.handle(new Request('http://localhost/api/me'));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).email, 'a@example.com');
    await mock.state.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
