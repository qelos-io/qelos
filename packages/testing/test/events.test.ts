import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as adminModule from '@qelos/sdk/administrator';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

// tsx loads the SDK as CommonJS: the class sits on `default` (twice, depending on the loader)
const loaded: any = adminModule;
const Admin: new (options: any) => any = loaded.default?.default ?? loaded.default ?? loaded;

const personas = [
  { email: 'admin@x.com', roles: ['admin'] },
  { email: 'user@x.com', roles: ['user'] },
  { email: 'editor@x.com', roles: ['editor'] },
  { email: 'plugin@x.com', roles: ['plugin'] },
];
const event = (eventName: string, extra: object = {}) => ({ source: 'app', kind: 'k', eventName, description: 'd', ...extra });

function setup(events: object[] = []) {
  const mock = createMockQelos({ logger: () => {}, seed: { personas, events: events as any } });
  const admin = new Admin({ appUrl: 'http://qelos.mock', fetch: mock.fetch, extraHeaders: async () => ({ [PERSONA_HEADER]: 'admin@x.com' }) });
  const call = (persona: string | null, method: string, path: string, body?: object) =>
    mock.fetch(path, {
      method,
      headers: persona ? { [PERSONA_HEADER]: persona } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  return { mock, events: admin.events, call };
}

describe('events', () => {
  test('only administrators read them: an empty 401 otherwise', async () => {
    const { call } = setup([event('a', { _id: 'e1' })]);
    for (const persona of [null, 'user@x.com', 'editor@x.com', 'plugin@x.com']) {
      for (const path of ['/api/events', '/api/events/e1']) {
        const res = await call(persona, 'GET', path);
        assert.deepEqual([res.status, await res.text()], [401, ''], `${persona} ${path}`);
      }
    }
    assert.equal((await call('admin@x.com', 'GET', '/api/events/e1')).status, 200);
  });

  test('administrators and plugins dispatch them; the answer has no body', async () => {
    const { call, mock } = setup();
    for (const persona of [null, 'user@x.com', 'editor@x.com']) {
      assert.equal((await call(persona, 'POST', '/api/events', event('no'))).status, 401, String(persona));
    }
    assert.equal(mock.state.events.list().length, 0);
    const res = await call('admin@x.com', 'POST', '/api/events', event('by admin', { secret: 'dropped' }));
    assert.deepEqual([res.status, await res.text()], [200, '']);
    await call('plugin@x.com', 'POST', '/api/events', event('by plugin'));
    await call('plugin@x.com', 'POST', '/api/events', event('prefixed', { source: 'plugin:crm' }));
    const stored = mock.state.events.list();
    assert.deepEqual(stored.map((e) => e.source), ['app', 'plugin:app', 'plugin:crm']);
    assert.equal('secret' in stored[0], false);
    assert.ok(stored[0].created && stored[0].tenant);
  });

  test('an event without source, kind or eventName is dropped, like by the service', async () => {
    const { call, mock } = setup();
    for (const missing of ['source', 'kind', 'eventName']) {
      const res = await call('admin@x.com', 'POST', '/api/events', { ...event('x'), [missing]: undefined });
      assert.equal(res.status, 200);
    }
    assert.equal(mock.state.events.list().length, 0);
  });

  test('the SDK lists a page of the last week, newest first', async () => {
    const day = 24 * 60 * 60 * 1000;
    const ago = (days: number) => new Date(Date.now() - days * day).toISOString();
    const { events } = setup([
      event('old', { created: ago(30) }),
      event('recent', { created: ago(2) }),
      event('newest', { created: ago(1), kind: 'other' }),
    ]);
    const names = async (params?: object) => (await events.getList(params)).events.map((e: any) => e.eventName);
    assert.deepEqual(await names(), ['newest', 'recent']);
    assert.deepEqual(await names({ period: 'all-time' }), ['newest', 'recent', 'old']);
    assert.deepEqual(await names({ kind: 'other' }), ['newest']);
    assert.deepEqual(await names({ to: ago(20) }), ['old']);
    const second = await events.getList({ period: 'all-time', limit: 2, page: 1 });
    assert.deepEqual([second.events.length, second.total, second.page, second.limit, second.totalPages], [1, 3, 1, 2, 2]);
  });

  test('reads one event, null when there is none; dispatches through the SDK', async () => {
    const { events, mock } = setup([event('a', { _id: 'e1' })]);
    assert.equal((await events.getEvent('e1')).eventName, 'a');
    assert.equal(await events.getEvent('f'.repeat(24)), null);
    await events.dispatch(event('sent'));
    assert.equal(mock.state.events.list().at(-1)!.eventName, 'sent');
  });

  test('endpoints of the service the mock lacks say so', async () => {
    const { call } = setup();
    for (const path of ['count', 'overview', 'sum', 'filter-options']) {
      const res = await call('admin@x.com', 'GET', `/api/events/${path}`);
      assert.deepEqual([res.status, ((await res.json()) as any).code], [404, 'QELOS_MOCK_NOT_IMPLEMENTED']);
    }
  });
});

test('secrets are not part of the API apps can call', async () => {
  const mock = createMockQelos({ logger: () => {}, seed: { personas } });
  for (const [method, path] of [['GET', '/api/secrets'], ['POST', '/api/secrets/set'], ['POST', '/api/secrets/get']]) {
    const res = await mock.fetch(path, { method, headers: { [PERSONA_HEADER]: 'admin@x.com' } });
    assert.deepEqual([res.status, ((await res.json()) as any).code], [404, 'QELOS_MOCK_NOT_IMPLEMENTED'], path);
  }
});
