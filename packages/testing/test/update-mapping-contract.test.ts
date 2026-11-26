import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

/**
 * Contract between the mock and `updateMapping` in the data service (`apps/no-code`): the real controllers, entity
 * model and `jq` run over a list instead of a database.
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
const ADMIN = { _id: 'a'.repeat(24), roles: ['admin'] };

const properties = {
  title: { title: 'Title', type: 'string' },
  price: { title: 'Price', type: 'number' },
  quantity: { title: 'Quantity', type: 'number', max: 100 },
  total: { title: 'Total', type: 'number' },
  label: { title: 'Label', type: 'string' },
  saves: { title: 'Saves', type: 'number' },
  big: { title: 'Big', type: 'boolean' },
  owner: { title: 'Owner', type: 'string' },
  client: { title: 'Client', type: 'string' },
};

/** each is the `updateMapping` of one blueprint */
const MAPPINGS: Record<string, string>[] = [
  {},
  { total: '.metadata.price * .metadata.quantity' },
  // every filter sees the entity before any of them is applied
  { total: '.metadata.price + 1', label: '.metadata.title + ":" + (.metadata.total | tostring)' },
  { saves: '(.metadata.saves // 0) + 1', big: '.metadata.price > 5' },
  { owner: '.user', label: '.blueprint + "/" + .tenant' },
  { quantity: '.metadata.quantity * 100' },
  { total: '"many"' },
  { label: '.metadata.price' },
  { unknown: '1' },
  { total: '.metadata.price |' },
  { total: '.metadata.title * .metadata.price' },
  { client: '"acme"' },
];

describe('the mock follows updateMapping', () => {
  test('what is calculated, and what is refused, on create and update', async () => {
    const storage = await named('services/entity-storage.service');
    const controllers = await named('controllers/entities');
    const logger = await load('services/logger');
    for (const level of ['log', 'error']) mock.method(logger, level, () => {});
    const model = storage.getEntityModel(undefined);
    let docs: any[] = [];
    mock.method(model, 'findOne', (filter: any) => {
      const found = docs.find((d) => d.identifier === filter.identifier);
      return { exec: async () => (found ? model.hydrate(structuredClone(found)) : null) };
    });
    mock.method(model.prototype, 'save', async function (this: any) {
      docs = [...docs.filter((d) => d.identifier !== this.identifier), plain(this.toObject())];
      return this;
    });

    const outcomes = new Set<number>();
    for (const [index, updateMapping] of MAPPINGS.entries()) {
      docs = [];
      const blueprint = {
        tenant: '0',
        identifier: 'order',
        name: 'Order',
        entityIdentifierMechanism: 'objectid',
        permissionScope: 'tenant',
        permissions: [],
        relations: [],
        properties,
        updateMapping,
      };
      const qelos = createMockQelos({
        logger: () => {},
        seed: { personas: [{ ...ADMIN, email: 'admin@x.com' }], blueprints: [structuredClone(blueprint)] },
      });
      const ids = { real: '', mine: '' };
      const compare = async (method: 'POST' | 'PUT', body: object) => {
        const answer: { status: number; body?: any } = { status: 200 };
        const res: any = {
          status: (code: number) => ((answer.status = code), res),
          json: (value: unknown) => ((answer.body = plain(value)), res),
          end: () => {},
          setHeader: () => {},
        };
        await (method === 'POST' ? controllers.createBlueprintEntity : controllers.updateBlueprintEntity)(
          { headers: { tenant: '0' }, blueprint, user: structuredClone(ADMIN), params: { entityIdentifier: ids.real }, body: structuredClone(body), query: {} },
          res,
        );
        const mine = await qelos.fetch(`/api/blueprints/order/entities${method === 'POST' ? '' : `/${ids.mine}`}`, {
          method,
          headers: { [PERSONA_HEADER]: 'admin@x.com' },
          body: JSON.stringify(body),
        });
        const result: any = await mine.json();
        const label = `${index} ${JSON.stringify(updateMapping)} ${method} ${JSON.stringify(body)}`;
        assert.equal(mine.status, answer.status, `${label}: ${JSON.stringify(result)} / ${JSON.stringify(answer.body)}`);
        outcomes.add(answer.status);
        if (answer.status !== 200) {
          assert.equal(result.message, answer.body.message, label);
          return false;
        }
        assert.deepEqual(result.metadata, answer.body.metadata, label);
        if (method === 'POST') Object.assign(ids, { real: answer.body.identifier, mine: result.identifier });
        return true;
      };
      if (!(await compare('POST', { title: 't', price: 3, quantity: 2 }))) continue;
      await compare('PUT', { price: 7 });
      await compare('PUT', { quantity: 1, total: 99 });
    }
    // calculated, refused by a property, an unknown property, and a failing filter
    assert.deepEqual([...outcomes].sort(), [200, 400, 406, 500]);
  });
});
