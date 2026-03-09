import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

function createMockSource(overrides: any = {}) {
  return {
    _id: 'src-1',
    tenant: 'tenant-1',
    user: 'user-1',
    kind: 'paddle',
    authentication: 'auth-1',
    name: 'Paddle Test',
    labels: [],
    created: new Date(),
    metadata: {
      environment: 'sandbox' as const,
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
    headers: { entries: () => [], get: () => null },
  };
});

let mockSource = createMockSource();

mock.module('node-fetch', { defaultExport: fetchMock });
mock.module('../http-agent', { defaultExport: undefined });
mock.module('../hook-events', { namedExports: { emitPlatformEvent: mock.fn() } });
mock.module('../../../config', { namedExports: { redisUrl: null } });
mock.module('../logger', { defaultExport: { log: mock.fn(), error: mock.fn() } });

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

mock.module('../source-authentication-service', {
  namedExports: {
    getEncryptedSourceAuthentication: mock.fn(async () => ({ apiKey: 'test-paddle-key' })),
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
    constructor(public data: any) {}
    save() { return Promise.resolve(this); }
  },
});

mock.module('../users', { namedExports: { createUser: mock.fn(), updateUser: mock.fn() } });
mock.module('../no-code-service', { namedExports: { createBlueprintEntity: mock.fn(), updateBlueprintEntity: mock.fn() } });
mock.module('../ai-service', { namedExports: { chatCompletion: mock.fn(), chatCompletionForUserByIntegration: mock.fn(), uploadContentToStorage: mock.fn(), clearStorageFiles: mock.fn() } });
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

describe('handlePaddleTarget', async () => {
  const { callIntegrationTarget } = await import('../integration-target-call');

  beforeEach(() => {
    mockSource = createMockSource();
    setupFetch();
  });

  it('should call createProduct endpoint', async () => {
    setupFetch(
      { ok: true, status: 200, body: { data: { id: 'pro_123', name: 'Test Product' } } },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      { name: 'Test Product', tax_category: 'standard' },
      createMockTarget('createProduct') as any,
    );

    assert.deepStrictEqual(result, { data: { id: 'pro_123', name: 'Test Product' } });
    assert.ok(fetchCalls[0].url.includes('sandbox-api.paddle.com'));
    assert.ok(fetchCalls[0].url.includes('/products'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
    assert.ok(fetchCalls[0].options.headers['Authorization'].startsWith('Bearer '));
  });

  it('should use live base URL when environment is live', async () => {
    mockSource = createMockSource({ metadata: { environment: 'live' } });

    setupFetch(
      { ok: true, status: 200, body: { data: { id: 'pro_123' } } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { name: 'Product' },
      createMockTarget('createProduct') as any,
    );

    assert.ok(fetchCalls[0].url.includes('api.paddle.com'));
    assert.ok(!fetchCalls[0].url.includes('sandbox'));
  });

  it('should call listProducts with GET', async () => {
    setupFetch(
      { ok: true, status: 200, body: { data: [], meta: { pagination: {} } } },
    );

    await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('listProducts') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/products'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('should call createPrice endpoint', async () => {
    setupFetch(
      { ok: true, status: 200, body: { data: { id: 'pri_123' } } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { product_id: 'pro_123', unit_price: { amount: '1000', currency_code: 'USD' } },
      createMockTarget('createPrice') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/prices'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
  });

  it('should call getSubscription with subscriptionId from payload', async () => {
    setupFetch(
      { ok: true, status: 200, body: { data: { id: 'sub_123', status: 'active' } } },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      { subscriptionId: 'sub_123' },
      createMockTarget('getSubscription') as any,
    );

    assert.deepStrictEqual(result, { data: { id: 'sub_123', status: 'active' } });
    assert.ok(fetchCalls[0].url.includes('/subscriptions/sub_123'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('should throw when getSubscription is called without subscriptionId', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('getSubscription') as any),
      (err: any) => {
        assert.match(err.message, /subscriptionId/);
        return true;
      }
    );
  });

  it('should call cancelSubscription endpoint', async () => {
    setupFetch(
      { ok: true, status: 200, body: { data: { id: 'sub_123', status: 'canceled' } } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { subscriptionId: 'sub_123', effective_from: 'next_billing_period' },
      createMockTarget('cancelSubscription') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/subscriptions/sub_123/cancel'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
  });

  it('should throw when cancelSubscription is called without subscriptionId', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('cancelSubscription') as any),
      (err: any) => {
        assert.match(err.message, /subscriptionId/);
        return true;
      }
    );
  });

  it('should call getTransaction with transactionId from payload', async () => {
    setupFetch(
      { ok: true, status: 200, body: { data: { id: 'txn_123' } } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { transactionId: 'txn_123' },
      createMockTarget('getTransaction') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/transactions/txn_123'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('should throw when getTransaction is called without transactionId', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('getTransaction') as any),
      (err: any) => {
        assert.match(err.message, /transactionId/);
        return true;
      }
    );
  });

  it('should call createCustomer endpoint', async () => {
    setupFetch(
      { ok: true, status: 200, body: { data: { id: 'ctm_123', email: 'test@example.com' } } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { email: 'test@example.com', name: 'Test User' },
      createMockTarget('createCustomer') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/customers'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
  });

  it('should call listTransactions with GET and query params', async () => {
    setupFetch(
      { ok: true, status: 200, body: { data: [], meta: { pagination: {} } } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { status: 'completed', per_page: '50' },
      createMockTarget('listTransactions') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/transactions'));
    assert.ok(fetchCalls[0].url.includes('status='));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('should throw on unsupported operation', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('unknownOp') as any),
      (err: any) => {
        assert.match(err.message, /Unsupported Paddle operation/);
        return true;
      }
    );
  });

  it('should throw when Paddle API returns error', async () => {
    setupFetch(
      { ok: false, status: 400, body: { error: { type: 'request_error', detail: 'Bad request' } } },
    );

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('createProduct') as any),
      (err: any) => {
        assert.match(err.message, /Paddle API request failed/);
        assert.match(err.message, /400/);
        return true;
      }
    );
  });
});
