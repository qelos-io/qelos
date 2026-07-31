import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

function createMockSource(overrides: any = {}) {
  return {
    _id: 'src-1',
    tenant: 'tenant-1',
    user: 'user-1',
    kind: 'http',
    authentication: 'auth-1',
    name: 'HTTP Test',
    labels: [],
    created: new Date(),
    metadata: {
      baseUrl: 'https://api.example.com',
      method: 'GET',
      headers: {},
      query: {},
    },
    ...overrides,
  };
}

function createMockTarget(operation: string, details: any = {}) {
  return {
    _id: 'target-1',
    source: 'src-1',
    operation,
    details,
  };
}

let fetchResponses: Array<{ ok: boolean; status: number; body: any }> = [];
let fetchCallIndex = 0;
let fetchCalls: Array<{ url: string; options: any }> = [];

const fetchMock = mock.fn(async (url: string, options: any) => {
  fetchCalls.push({ url, options });
  const resp = fetchResponses[fetchCallIndex++];
  if (!resp) throw new Error('No more fetch responses configured');
  return {
    ok: resp.ok,
    status: resp.status,
    json: async () => resp.body,
    headers: { entries: () => [] },
  };
});

const emitPlatformEventMock = mock.fn();

let mockSource = createMockSource();

mock.module('node-fetch', { defaultExport: fetchMock });
mock.module('../http-agent', { defaultExport: undefined });
mock.module('../hook-events', { namedExports: { emitPlatformEvent: emitPlatformEventMock } });
mock.module('../../../config', { namedExports: { redisUrl: null } });
mock.module('../logger', { defaultExport: { log: mock.fn(), error: mock.fn(), warn: mock.fn() } });

mock.module('../../models/integration-source', {
  defaultExport: {
    findOne: () => ({
      lean: () => ({
        exec: async () => mockSource,
      }),
    }),
  },
});

mock.module('../../models/integration', {
  namedExports: { IIntegrationEntity: {} },
});

const getEncryptedSourceAuthenticationMock = mock.fn(async () => ({}));

mock.module('../source-authentication-service', {
  namedExports: {
    getEncryptedSourceAuthentication: getEncryptedSourceAuthenticationMock,
  },
});

mock.module('../cache-manager', {
  namedExports: {
    cacheManager: {
      getItem: async () => null,
      setItem: mock.fn(async () => {}),
      wrap: mock.fn(async (_key: string, fn: () => Promise<string>) => fn()),
    },
  },
});

mock.module('../../models/event', {
  defaultExport: class {
    data: any;
    constructor(data: any) {
      this.data = data;
    }
    save() { return Promise.resolve(this); }
  },
});

mock.module('../users', { namedExports: { createUser: mock.fn(), updateUser: mock.fn(), getUser: mock.fn(), getWorkspaces: mock.fn() } });
mock.module('../no-code-service', { namedExports: { createBlueprintEntity: mock.fn(), updateBlueprintEntity: mock.fn(), getBlueprintEntities: mock.fn(), getBlueprintEntity: mock.fn() } });
mock.module('../ai-service', { namedExports: { chatCompletion: mock.fn(), chatCompletionForUserByIntegration: mock.fn(), uploadContentToStorage: mock.fn(), clearStorageFiles: mock.fn(), getVectorStores: mock.fn() } });
mock.module('../email-service', { namedExports: { sendEmail: mock.fn() } });
mock.module('cloudflare', { defaultExport: class {} });
mock.module('@aws-sdk/client-lambda', {
  namedExports: {
    LambdaClient: class {},
    InvokeCommand: class {},
    GetFunctionCommand: class {},
    ListFunctionsCommand: class {},
    CreateFunctionCommand: class {},
    UpdateFunctionConfigurationCommand: class {},
    UpdateFunctionCodeCommand: class {},
  },
});

function setupFetch(...responses: Array<{ ok: boolean; status: number; body: any }>) {
  fetchResponses = responses;
  fetchCallIndex = 0;
  fetchCalls = [];
}

describe('callIntegrationTarget target manipulation', async () => {
  const { callIntegrationTarget } = await import('../integration-target-call');

  beforeEach(() => {
    mockSource = createMockSource();
    emitPlatformEventMock.mock.resetCalls();
    setupFetch();
  });

  it('returns the raw target result when no targetManipulation steps are given', async () => {
    setupFetch({ ok: true, status: 200, body: { characters: [{ name: 'Harry' }, { name: 'Ron' }] } });

    const result = await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('makeRequest', { url: '/characters' }) as any,
    );

    assert.deepStrictEqual(result.body, { characters: [{ name: 'Harry' }, { name: 'Ron' }] });
  });

  it('applies targetManipulation to the target result', async () => {
    setupFetch({ ok: true, status: 200, body: { characters: [{ name: 'Harry' }, { name: 'Ron' }] } });

    const result = await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('makeRequest', { url: '/characters' }) as any,
      [{ map: { count: '.body.characters | length' }, populate: {} }],
    );

    assert.strictEqual(result.count, 2);
    // additive by default (no `clean`): original keys survive alongside the mapped one
    assert.strictEqual(result.status, 200);
  });

  it('replaces the result entirely when a step sets clean: true', async () => {
    setupFetch({ ok: true, status: 200, body: { characters: [{ name: 'Harry' }, { name: 'Ron' }] } });

    const result = await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('makeRequest', { url: '/characters' }) as any,
      [{ map: { count: '.body.characters | length' }, populate: {}, clean: true }],
    );

    assert.deepStrictEqual(result, { count: 2 });
  });

  it('returns an abort marker instead of the raw result when a step aborts', async () => {
    setupFetch({ ok: true, status: 200, body: { characters: [] } });

    const result = await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('makeRequest', { url: '/characters' }) as any,
      [{ map: {}, populate: {}, abort: '.body.characters | length == 0' }],
    );

    assert.deepStrictEqual(result, { abort: true });
  });

  it('does not call the manipulation engine when targetManipulation is an empty array', async () => {
    setupFetch({ ok: true, status: 200, body: { characters: [] } });

    const result = await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('makeRequest', { url: '/characters' }) as any,
      [],
    );

    assert.deepStrictEqual(result.body, { characters: [] });
  });
});
