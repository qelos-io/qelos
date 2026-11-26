import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

/**
 * Contract between the mock and the chart controllers of the data service (`apps/no-code`). The database is stubbed:
 * the filter and grouping the controller asks for are applied to the same entities here.
 */
const server = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'apps', 'no-code', 'server');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(server, path));
  return loaded.default?.default ?? loaded.default ?? loaded;
};

const properties = {
  status: { title: 'Status', type: 'string' },
  price: { title: 'Price', type: 'number' },
  done: { title: 'Done', type: 'boolean' },
  due: { title: 'Due', type: 'datetime' },
  at: { title: 'At', type: 'time' },
  extra: { title: 'Extra', type: 'object' },
};
const entity = (n: number, metadata: Record<string, unknown>) => ({ _id: `e${n}`, identifier: `e${n}`, user: 'u1', metadata });
const entities = [
  entity(1, { status: 'open', price: 10, done: false, due: '2026-01-04T08:00:00Z', at: '1970-01-01T08:15:00Z' }),
  entity(2, { status: 'open', price: 5, done: true, due: '2026-01-05T09:00:00Z', at: '1970-01-01T08:45:00Z' }),
  entity(3, { status: 'paid', price: 20, done: true, due: '2026-01-10T10:00:00Z', at: '1970-01-01T23:00:00Z' }),
  entity(4, { price: 1 }),
];

const read = (doc: any, path: string) => path.split('.').reduce((value, key) => value?.[key], doc);
const equals = (stored: unknown, wanted: unknown) =>
  wanted instanceof Date ? new Date(stored as string).getTime() === wanted.getTime() : stored === wanted;
const matching = (filter: Record<string, unknown>) =>
  entities.filter((e) => Object.entries(filter).every(([key, value]) => ['tenant', 'blueprint'].includes(key) || equals(read(e, key), value)));

/** what MongoDB would answer for the controller's `$match` / `$group` / `$sort` */
function aggregate([{ $match }, { $group }]: any[]) {
  const key = (e: any) => {
    const by = $group._id;
    if (by === null) return null;
    if (typeof by === 'string') return read(e, by.slice(1)) ?? null;
    const [[operator, path]] = Object.entries(by) as [string, string][];
    const value = read(e, path.slice(1));
    if (value === undefined) return null;
    return operator === '$dayOfWeek' ? new Date(value).getUTCDay() + 1 : new Date(value).getUTCHours();
  };
  const found = new Map<unknown, any[]>();
  for (const e of matching($match)) found.set(key(e), [...(found.get(key(e)) ?? []), e]);
  // the property a sum adds up
  const summed = $group.sum?.$sum.$switch.default.$toDouble.slice(1);
  return [...found]
    .map(([_id, list]) => ({
      _id,
      ...($group.count ? { count: list.length } : {}),
      ...(summed ? { sum: list.reduce((all, e) => all + (read(e, summed) ?? 0), 0) } : {}),
    }))
    .sort((a: any, b: any) => (a._id === b._id ? 0 : a._id === null || (b._id !== null && a._id < b._id) ? -1 : 1));
}

describe('the mock follows the chart controllers', () => {
  test('counts, pies, other charts and sums, with their filters and refusals', async () => {
    const Entity = await load('models/blueprint-entity');
    const controllers = await load('controllers/charts');
    mock.method(Entity, 'countDocuments', (filter: any) => ({ exec: async () => matching(filter).length }));
    mock.method(Entity, 'aggregate', (pipeline: any[]) => ({ exec: async () => aggregate(pipeline) }));
    const blueprint = { identifier: 'order', properties };
    const qelos = createMockQelos({
      logger: () => {},
      seed: {
        personas: [{ _id: 'u1', email: 'admin@x.com', roles: ['admin'] }],
        blueprints: [{ ...blueprint }],
        entities: { order: entities },
      },
    });
    const cases: Array<[string, string]> = [
      ...[
        '',
        'metadata.status=open',
        'status=open',
        'status=none',
        'metadata.price=5',
        'price=5',
        'price=5.9',
        'price=x',
        'done=true',
        'done=false',
        'metadata.done=1',
        'due=2026-01-05T09:00:00Z',
        'status=open&price=10',
        'identifier=e3',
        'unknown=1',
      ].map((query) => ['count', query] as [string, string]),
      ...['status', 'price', 'done', 'due', 'at', 'extra', 'nope', ''].flatMap(
        (x) => [['pie', `x=${x}`], ['bar', `x=${x}`]] as [string, string][],
      ),
      ['pie', 'x=status&metadata.status=open'],
      ['sum', 'sum=price'],
      ['sum', 'sum=price&metadata.status=open'],
      ['sum', 'sum=price&status=open&groupBy=status'],
      ['pie', 'x=status&done=true'],
      ['sum', 'sum=price&metadata.status=none'],
      ['sum', 'sum=price&groupBy=status'],
      ['sum', 'sum=price&groupBy=due'],
      ['sum', 'sum=price&groupBy=at'],
      ['sum', 'sum=price&groupBy=extra'],
      ['sum', 'sum=price&groupBy=nope'],
      ['sum', 'sum=status'],
      ['sum', ''],
    ];
    for (const [chart, query] of cases) {
      const handler = { count: controllers.getCountCard, pie: controllers.getPieChart, sum: controllers.getSumCard }[chart] ?? controllers.getStandardChart;
      const answer: { status: number; body?: unknown } = { status: 200 };
      const res: any = {
        status: (code: number) => ((answer.status = code), res),
        json: (body: unknown) => ((answer.body = JSON.parse(JSON.stringify(body))), res),
        end: () => {},
      };
      await handler(
        {
          headers: { tenant: '0' },
          blueprint,
          permittedScopes: true,
          user: { _id: 'u1', roles: ['admin'] },
          params: { chartType: chart },
          query: Object.fromEntries(new URLSearchParams(query)),
          _parsedUrl: { query },
        },
        res,
      );
      const res2 = await qelos.fetch(`/api/blueprints/order/charts/${chart}?${query}`, { headers: { [PERSONA_HEADER]: 'admin@x.com' } });
      assert.deepEqual({ status: res2.status, body: await res2.json() }, answer, `${chart}?${query}`);
    }
  });
});
