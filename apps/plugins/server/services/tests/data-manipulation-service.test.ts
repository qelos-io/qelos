import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const getUserMock = mock.fn(async () => ({ _id: 'user-1', email: 'user@example.com' }));
const getWorkspacesMock = mock.fn(async () => ({ _id: 'ws-1', name: 'Acme' }));
const getBlueprintEntityMock = mock.fn(async () => ({ _id: 'entity-1', name: 'Entity One' }));
const getBlueprintEntitiesMock = mock.fn(async () => [{ _id: 'entity-1' }, { _id: 'entity-2' }]);
const getVectorStoresMock = mock.fn(async () => [{ _id: 'vs-1' }]);
const triggerWebhookServiceMock = mock.fn(async () => ({ ok: true }));

mock.module('../users', {
  namedExports: { getUser: getUserMock, getWorkspaces: getWorkspacesMock },
});
mock.module('../no-code-service', {
  namedExports: { getBlueprintEntity: getBlueprintEntityMock, getBlueprintEntities: getBlueprintEntitiesMock },
});
mock.module('../ai-service', {
  namedExports: { getVectorStores: getVectorStoresMock },
});
mock.module('../webhook-service', {
  namedExports: { triggerWebhookService: triggerWebhookServiceMock },
});

describe('data-manipulation-service', async () => {
  const { executeDataManipulation, DataManipulationError } = await import('../data-manipulation-service');

  beforeEach(() => {
    getUserMock.mock.resetCalls();
    getWorkspacesMock.mock.resetCalls();
    getBlueprintEntityMock.mock.resetCalls();
    getBlueprintEntitiesMock.mock.resetCalls();
    getVectorStoresMock.mock.resetCalls();
    triggerWebhookServiceMock.mock.resetCalls();
  });

  describe('map', () => {
    it('evaluates JQ expressions against the payload', async () => {
      const result = await executeDataManipulation('tenant-1', { name: 'harry', house: 'gryffindor' }, [
        { map: { greeting: '"Hello, " + .name' }, populate: {} },
      ]);
      assert.strictEqual(result.greeting, 'Hello, harry');
    });

    it('chains steps, each seeing the previous step\'s output', async () => {
      const result = await executeDataManipulation('tenant-1', { count: 1 }, [
        { map: { count: '.count + 1' }, populate: {} },
        { map: { count: '.count + 1' }, populate: {} },
      ]);
      assert.strictEqual(result.count, 3);
    });

    it('evaluates nested object/array map values recursively', async () => {
      const result = await executeDataManipulation('tenant-1', { items: [{ name: 'a' }, { name: 'b' }] }, [
        { map: { summary: { names: '[.items[].name]' } }, populate: {} },
      ]);
      assert.deepStrictEqual(result.summary.names, ['a', 'b']);
    });

    it('throws a DataManipulationError identifying the failing field on invalid JQ', async () => {
      await assert.rejects(
        () => executeDataManipulation('tenant-1', {}, [{ map: { bad: '.[invalid' }, populate: {} }]),
        (err: any) => {
          assert.ok(err instanceof DataManipulationError);
          assert.strictEqual(err.stepIndex, 0);
          assert.strictEqual(err.phase, 'map');
          assert.strictEqual(err.field, 'bad');
          return true;
        },
      );
    });
  });

  describe('clean', () => {
    it('discards previously accumulated data before applying this step', async () => {
      const result = await executeDataManipulation('tenant-1', { keep: 'me' }, [
        { map: { added: '"value"' }, populate: {} },
        { map: {}, populate: {}, clean: true },
      ]);
      assert.deepStrictEqual(result, {});
    });
  });

  describe('abort', () => {
    it('stops immediately when abort is boolean true', async () => {
      const result = await executeDataManipulation('tenant-1', { x: 1 }, [
        { map: {}, populate: {}, abort: true },
        { map: { shouldNotRun: '"nope"' }, populate: {} },
      ]);
      assert.deepStrictEqual(result, { abort: true });
    });

    it('does not abort when abort is boolean false', async () => {
      const result = await executeDataManipulation('tenant-1', { x: 1 }, [
        { map: { y: '.x + 1' }, populate: {}, abort: false },
      ]);
      assert.strictEqual(result.y, 2);
    });

    it('evaluates a string abort condition as JQ and stops when truthy', async () => {
      const result = await executeDataManipulation('tenant-1', { count: 0 }, [
        { map: {}, populate: {}, abort: '.count == 0' },
      ]);
      assert.deepStrictEqual(result, { abort: true });
    });

    it('continues when a string abort condition evaluates falsy', async () => {
      const result = await executeDataManipulation('tenant-1', { count: 5 }, [
        { map: { doubled: '.count * 2' }, populate: {}, abort: '.count == 0' },
      ]);
      assert.strictEqual(result.doubled, 10);
    });
  });

  describe('populate', () => {
    it('fetches a user by id', async () => {
      const result = await executeDataManipulation('tenant-1', { user: 'user-1' }, [
        { map: {}, populate: { user: { source: 'user' } } },
      ]);
      assert.strictEqual(result.user.email, 'user@example.com');
      assert.strictEqual(getUserMock.mock.calls.length, 1);
      assert.strictEqual(getUserMock.mock.calls[0].arguments[1], 'user-1');
    });

    it('fetches a workspace by id', async () => {
      const result = await executeDataManipulation('tenant-1', { workspace: 'ws-1' }, [
        { map: {}, populate: { workspace: { source: 'workspace' } } },
      ]);
      assert.strictEqual(result.workspace.name, 'Acme');
    });

    it('fetches a single blueprint entity given { entity, blueprint }', async () => {
      const result = await executeDataManipulation('tenant-1', { entity: { entity: 'entity-1', blueprint: 'characters' } }, [
        { map: {}, populate: { entity: { source: 'blueprintEntity' } } },
      ]);
      assert.strictEqual(result.entity.name, 'Entity One');
      assert.deepStrictEqual(getBlueprintEntityMock.mock.calls[0].arguments.slice(1), ['characters', 'entity-1']);
    });

    it('fetches blueprint entities for a query', async () => {
      const result = await executeDataManipulation('tenant-1', { entities: { blueprint: 'characters', house: 'gryffindor' } }, [
        { map: {}, populate: { entities: { source: 'blueprintEntities' } } },
      ]);
      assert.strictEqual(result.entities.length, 2);
    });

    it('fetches vector stores using scope/subjectId from config or existing value', async () => {
      const result = await executeDataManipulation('tenant-1', {}, [
        { map: {}, populate: { stores: { source: 'vectorStores', scope: 'tenant' } } },
      ]);
      assert.strictEqual(result.stores.length, 1);
      assert.strictEqual(getVectorStoresMock.mock.calls[0].arguments[1].scope, 'tenant');
    });

    it('triggers an apiWebhook integration and attaches its result', async () => {
      const result = await executeDataManipulation('tenant-1', {}, [
        { map: {}, populate: { downstream: { source: 'apiWebhook', integration: 'integration-1' } } },
      ]);
      assert.deepStrictEqual(result.downstream, { ok: true });
      assert.strictEqual(triggerWebhookServiceMock.mock.calls[0].arguments[1], 'integration-1');
    });

    it('skips populate for a key with no existing value (except vectorStores/apiWebhook)', async () => {
      const result = await executeDataManipulation('tenant-1', {}, [
        { map: {}, populate: { user: { source: 'user' } } },
      ]);
      assert.strictEqual(result.user, undefined);
      assert.strictEqual(getUserMock.mock.calls.length, 0);
    });

    it('wraps populate fetch failures in a DataManipulationError', async () => {
      getUserMock.mock.mockImplementationOnce(async () => { throw new Error('boom'); });
      await assert.rejects(
        () => executeDataManipulation('tenant-1', { user: 'user-1' }, [
          { map: {}, populate: { user: { source: 'user' } } },
        ]),
        (err: any) => {
          assert.ok(err instanceof DataManipulationError);
          assert.strictEqual(err.phase, 'populate');
          assert.strictEqual(err.field, 'user');
          return true;
        },
      );
    });
  });
});
