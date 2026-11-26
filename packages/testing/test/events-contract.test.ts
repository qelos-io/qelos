import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

/**
 * Contract between the mock and the service that serves platform events (`apps/plugins`): its middlewares and
 * controllers, with the database model stubbed, next to the mock's routes.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(root, path));
  return loaded.default?.default ?? loaded.default ?? loaded;
};
const server = 'apps/plugins/server';

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
/** newest first, as the database sorts them */
const events = [0.5, 3, 10, 40, 400].map((age, i) => ({ _id: `e${i}`, source: 's', kind: 'k', eventName: `${age}d`, created: ago(age) }));

const admin = { [PERSONA_HEADER]: 'admin@x.com' };
const mockWith = (seeded: object[] = events) =>
  createMockQelos({
    logger: () => {},
    seed: {
      personas: ['admin', 'user', 'editor', 'plugin'].map((role) => ({ email: `${role}@x.com`, roles: [role] })),
      events: seeded as any,
    },
  });

/** run the real list controller over `events`, answering the database query with `matching` */
async function realList(query: Record<string, string>, matching: (dbQuery: any) => object[]) {
  const PlatformEvent = await load(`${server}/models/event`);
  const { getAllEvents } = await load(`${server}/controllers/events`);
  const find = mock.method(PlatformEvent, 'find', (dbQuery: any) => {
    let rows = matching(dbQuery);
    const chain = {
      sort: () => chain,
      select: () => chain,
      lean: () => chain,
      skip: (n: number) => ((rows = rows.slice(n)), chain),
      limit: (n: number) => ((rows = rows.slice(0, n)), chain),
      exec: async () => rows,
    };
    return chain;
  });
  let body: unknown;
  const res: any = { json: (value: unknown) => ((body = JSON.parse(JSON.stringify(value))), res), end: () => {} };
  await getAllEvents({ headers: { tenant: 't' }, query }, res);
  find.mock.restore();
  return body as any;
}

const within = (dbQuery: any) =>
  events.filter(({ created }) => {
    const at = new Date(created);
    return (!dbQuery.created?.$gte || at >= dbQuery.created.$gte) && (!dbQuery.created?.$lte || at <= dbQuery.created.$lte);
  });

describe('the mock follows the events service', () => {
  test('who may read and dispatch events', async () => {
    const { onlyEditPrivileged, onlyEditPrivilegedOrPlugin } = await load(`${server}/middlewares/privileged-check`);
    const { verifyUser } = await load('packages/api-kit/src/user-middlewares');
    const real = (middlewares: Function[], user: object | null) => {
      let status = 200;
      const res: any = { status: (code: number) => ((status = code), res), end: () => {} };
      const req = { user };
      const run = ([next, ...rest]: Function[]): void => next?.(req, res, () => run(rest));
      run(middlewares);
      return status;
    };
    const qelos = mockWith();
    for (const role of [null, 'user', 'editor', 'plugin', 'admin']) {
      const user = role ? { roles: [role] } : null;
      const headers: Record<string, string> = role ? { [PERSONA_HEADER]: `${role}@x.com` } : {};
      const read = await qelos.fetch('/api/events', { headers });
      assert.equal(read.status, real([verifyUser, onlyEditPrivileged], user), `${role} reads`);
      const sent = await qelos.fetch('/api/events', { method: 'POST', headers, body: '{}' });
      assert.equal(sent.status, real([verifyUser, onlyEditPrivilegedOrPlugin], user), `${role} dispatches`);
    }
  });

  test('which events a period or a date range covers', async () => {
    const queries: Record<string, string>[] = [
      {},
      ...['last-day', 'last-week', 'last-month', 'last-year', 'all-time', 'unknown'].map((period) => ({ period })),
      { from: ago(20) },
      { to: ago(5) },
      { from: ago(50), to: ago(2), period: 'last-day' },
    ];
    for (const query of queries) {
      const real = await realList(query, within);
      const res = await mockWith().fetch(`/api/events?${new URLSearchParams(query)}`, { headers: admin });
      const body: any = await res.json();
      assert.deepEqual(body.events.map((e: any) => e._id), real.events.map((e: any) => e._id), JSON.stringify(query));
    }
  });

  test('pages and totals', async () => {
    const queries: Record<string, string>[] = [{}, { limit: '2' }, { limit: '2', page: '1' }, { limit: '500' }, { limit: '-3' }, { limit: 'x' }, { page: '9' }];
    for (const query of queries) {
      const real = await realList({ ...query, period: 'all-time' }, () => events);
      const res = await mockWith().fetch(`/api/events?${new URLSearchParams({ ...query, period: 'all-time' })}`, { headers: admin });
      assert.deepEqual(await res.json(), real, JSON.stringify(query));
    }
    const empty = await realList({}, () => []);
    assert.deepEqual(await (await mockWith([]).fetch('/api/events', { headers: admin })).json(), empty);
  });

  test('what is stored from a dispatched event', async () => {
    const PlatformEvent = await load(`${server}/models/event`);
    const { createEvent } = await load(`${server}/controllers/events`);
    // the service logs each event it refuses; that is expected here
    mock.method(await load(`${server}/services/logger`), 'log', () => {});
    const full = { source: 'app', kind: 'k', eventName: 'e', description: 'd', user: 'u', workspace: 'w', metadata: { a: 1 }, extra: true };
    const bodies = [full, { ...full, source: undefined }, { ...full, kind: undefined }, { ...full, eventName: '' }, { ...full, source: 'plugin:x' }];
    for (const role of ['admin', 'plugin']) {
      for (const body of bodies) {
        let stored: Record<string, unknown> | undefined;
        // the model validates as the database would; nothing is written
        const save = mock.method(PlatformEvent.prototype, 'save', async function (this: any) {
          const invalid = this.validateSync();
          if (invalid) throw invalid;
          stored = JSON.parse(JSON.stringify(this.toObject()));
        });
        await createEvent({ headers: { tenant: '0' }, user: { roles: [role] }, body: { ...body } }, { status: () => ({ end: () => {} }) });
        save.mock.restore();
        const qelos = mockWith([]);
        await qelos.fetch('/api/events', { method: 'POST', headers: { [PERSONA_HEADER]: `${role}@x.com` }, body: JSON.stringify(body) });
        const [mine] = qelos.state.events.list();
        const comparable = (event?: Record<string, unknown>) => {
          if (!event) return undefined;
          const { _id, created, tenant, ...rest } = event;
          return rest;
        };
        assert.deepEqual(comparable(mine), comparable(stored), `${role} ${JSON.stringify(body)}`);
      }
    }
  });
});
