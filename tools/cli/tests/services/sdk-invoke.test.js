const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadSdkInvokeModule() {
  const invokePath = path.join(__dirname, '..', '..', 'services', 'sdk', 'invoke.mjs');
  return import(pathToFileURL(invokePath).href);
}

async function loadParseValueModule() {
  const parsePath = path.join(__dirname, '..', '..', 'services', 'sdk', 'parse-value.mjs');
  return import(pathToFileURL(parsePath).href);
}

function makeMockSdk() {
  return {
    blueprints: {
      getList: async () => [{ identifier: 'todo' }],
      entitiesOf(blueprintKey) {
        return {
          blueprintKey,
          getList: async (query) => ({ items: [], query }),
          create: async (entity) => ({ identifier: 'new-id', ...entity }),
          update: async (id, changes) => ({ identifier: id, ...changes }),
        };
      },
    },
    users: {
      getList: async (filters) => ({ users: [], filters }),
    },
    entities(blueprintKey) {
      return this.blueprints.entitiesOf(blueprintKey);
    },
  };
}

describe('sdk parse-value', () => {
  it('parses JSON objects and arrays', async () => {
    const { parseArg, looksLikeJson } = await loadParseValueModule();
    assert.strictEqual(looksLikeJson('{"a":1}'), true);
    assert.deepStrictEqual(parseArg('{"a":1}'), { a: 1 });
    assert.deepStrictEqual(parseArg('[1,2]'), [1, 2]);
  });

  it('parses primitives and leaves plain strings intact', async () => {
    const { parseArg } = await loadParseValueModule();
    assert.strictEqual(parseArg('42'), 42);
    assert.strictEqual(parseArg('true'), true);
    assert.strictEqual(parseArg('todo'), 'todo');
  });

  it('flattens dot-separated tokens', async () => {
    const { flattenTokens } = await loadParseValueModule();
    assert.deepStrictEqual(
      flattenTokens(['blueprints.entitiesOf', 'todo', 'getList']),
      ['blueprints', 'entitiesOf', 'todo', 'getList'],
    );
  });

  it('peels trailing JSON args', async () => {
    const { peelTrailingJsonArgs } = await loadParseValueModule();
    const tokens = ['create', '{"title":"Buy milk"}'];
    assert.deepStrictEqual(peelTrailingJsonArgs(tokens), [{ title: 'Buy milk' }]);
    assert.deepStrictEqual(tokens, ['create']);
  });
});

describe('sdk invoke', () => {
  it('invokes a terminal method on a namespace', async () => {
    const { invokeSdk } = await loadSdkInvokeModule();
    const sdk = makeMockSdk();
    const result = await invokeSdk(sdk, ['blueprints', 'getList']);
    assert.deepStrictEqual(result, [{ identifier: 'todo' }]);
  });

  it('walks intermediate methods and invokes the terminal call', async () => {
    const { invokeSdk } = await loadSdkInvokeModule();
    const sdk = makeMockSdk();
    const result = await invokeSdk(sdk, ['blueprints', 'entitiesOf', 'todo', 'getList']);
    assert.deepStrictEqual(result, { items: [], query: undefined });
  });

  it('supports dot notation for property chains', async () => {
    const { invokeSdk } = await loadSdkInvokeModule();
    const sdk = makeMockSdk();
    const result = await invokeSdk(sdk, ['blueprints.entitiesOf', 'todo', 'getList']);
    assert.deepStrictEqual(result, { items: [], query: undefined });
  });

  it('passes trailing JSON to the terminal method', async () => {
    const { invokeSdk } = await loadSdkInvokeModule();
    const sdk = makeMockSdk();
    const result = await invokeSdk(
      sdk,
      ['blueprints', 'entitiesOf', 'todo', 'create', '{"title":"Buy milk"}'],
    );
    assert.deepStrictEqual(result, { identifier: 'new-id', title: 'Buy milk' });
  });

  it('passes multiple terminal args for multi-argument methods', async () => {
    const { invokeSdk } = await loadSdkInvokeModule();
    const sdk = makeMockSdk();
    const result = await invokeSdk(
      sdk,
      ['blueprints', 'entitiesOf', 'todo', 'update', 'abc123', '{"title":"Updated"}'],
    );
    assert.deepStrictEqual(result, { identifier: 'abc123', title: 'Updated' });
  });

  it('supports the root entities() shortcut', async () => {
    const { invokeSdk } = await loadSdkInvokeModule();
    const sdk = makeMockSdk();
    const result = await invokeSdk(sdk, ['entities', 'todo', 'getList']);
    assert.deepStrictEqual(result, { items: [], query: undefined });
  });

  it('merges stdin-style extra args into the terminal call', async () => {
    const { invokeSdk } = await loadSdkInvokeModule();
    const sdk = makeMockSdk();
    const result = await invokeSdk(sdk, ['users', 'getList'], [{ username: 'ada' }]);
    assert.deepStrictEqual(result, { users: [], filters: { username: 'ada' } });
  });

  it('throws when the path is empty', async () => {
    const { invokeSdk, SdkPathError } = await loadSdkInvokeModule();
    await assert.rejects(
      () => invokeSdk(makeMockSdk(), []),
      (error) => error instanceof SdkPathError,
    );
  });

  it('throws when a segment is unknown', async () => {
    const { invokeSdk, SdkPathError } = await loadSdkInvokeModule();
    await assert.rejects(
      () => invokeSdk(makeMockSdk(), ['missing', 'getList']),
      (error) => error instanceof SdkPathError && /Unknown SDK member "missing"/.test(error.message),
    );
  });
});
