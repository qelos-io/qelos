import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const TOKEN_RESPONSE = { access_token: 'test-token-abc', token_type: 'Bearer', expires_in: 32400 };

function createMockSource(overrides: any = {}) {
  return {
    _id: 'src-1',
    tenant: 'tenant-1',
    user: 'user-1',
    kind: 'paypal',
    authentication: 'auth-1',
    name: 'PayPal Test',
    labels: [],
    created: new Date(),
    metadata: {
      clientId: 'test-client-id',
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

let cachedToken: string | null = null;
const cacheSetItemMock = mock.fn(async () => {});

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
    getEncryptedSourceAuthentication: mock.fn(async () => ({ clientSecret: 'test-secret' })),
  },
});

mock.module('../cache-manager', {
  namedExports: {
    cacheManager: {
      getItem: async () => cachedToken,
      setItem: (...args: any[]) => cacheSetItemMock(...args),
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

describe('handlePayPalTarget', async () => {
  const { callIntegrationTarget } = await import('../integration-target-call');

  beforeEach(() => {
    cachedToken = null;
    cacheSetItemMock.mock.resetCalls();
    mockSource = createMockSource();
    setupFetch();
  });

  it('should exchange OAuth token and call createOrder endpoint', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
      { ok: true, status: 201, body: { id: 'ORDER-123', status: 'CREATED' } },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      { intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: '10.00' } }] },
      createMockTarget('createOrder') as any,
    );

    assert.deepStrictEqual(result, { id: 'ORDER-123', status: 'CREATED' });

    assert.ok(fetchCalls[0].url.includes('/v1/oauth2/token'));
    assert.ok(fetchCalls[0].url.includes('sandbox'));

    assert.ok(fetchCalls[1].url.includes('/v2/checkout/orders'));
    assert.strictEqual(fetchCalls[1].options.method, 'POST');
    assert.ok(fetchCalls[1].options.headers['Authorization'].startsWith('Bearer '));
  });

  it('should use live base URL when environment is live', async () => {
    mockSource = createMockSource({ metadata: { clientId: 'test-client-id', environment: 'live' } });

    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
      { ok: true, status: 201, body: { id: 'ORDER-LIVE' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('createOrder') as any,
    );

    assert.ok(fetchCalls[0].url.includes('api-m.paypal.com'));
    assert.ok(!fetchCalls[0].url.includes('sandbox'));
  });

  it('should use cached token when available', async () => {
    cachedToken = 'cached-token';

    setupFetch(
      { ok: true, status: 201, body: { id: 'ORDER-CACHED' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('createOrder') as any,
    );

    assert.strictEqual(fetchCalls.length, 1);
    assert.ok(fetchCalls[0].options.headers['Authorization'].includes('cached-token'));
  });

  it('should call captureOrder with orderId from payload', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
      { ok: true, status: 201, body: { id: 'ORDER-123', status: 'COMPLETED' } },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      { orderId: 'ORDER-123' },
      createMockTarget('captureOrder') as any,
    );

    assert.deepStrictEqual(result, { id: 'ORDER-123', status: 'COMPLETED' });
    assert.ok(fetchCalls[1].url.includes('/v2/checkout/orders/ORDER-123/capture'));
  });

  it('should throw when captureOrder is called without orderId', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
    );

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('captureOrder') as any),
      (err: any) => {
        assert.match(err.message, /orderId/);
        return true;
      }
    );
  });

  it('should call refundPayment with captureId from payload', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
      { ok: true, status: 201, body: { id: 'REFUND-1', status: 'COMPLETED' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { captureId: 'CAP-456' },
      createMockTarget('refundPayment') as any,
    );

    assert.ok(fetchCalls[1].url.includes('/v2/payments/captures/CAP-456/refund'));
  });

  it('should throw when refundPayment is called without captureId', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
    );

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('refundPayment') as any),
      (err: any) => {
        assert.match(err.message, /captureId/);
        return true;
      }
    );
  });

  it('should call createProduct endpoint', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
      { ok: true, status: 201, body: { id: 'PROD-1' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { name: 'Test Product', type: 'SERVICE' },
      createMockTarget('createProduct') as any,
    );

    assert.ok(fetchCalls[1].url.includes('/v1/catalogs/products'));
    assert.strictEqual(fetchCalls[1].options.method, 'POST');
  });

  it('should call createSubscription endpoint', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
      { ok: true, status: 201, body: { id: 'SUB-1' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { plan_id: 'PLAN-1' },
      createMockTarget('createSubscription') as any,
    );

    assert.ok(fetchCalls[1].url.includes('/v1/billing/subscriptions'));
  });

  it('should call listTransactions with GET and query params', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
      { ok: true, status: 200, body: { transaction_details: [] } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { start_date: '2025-01-01T00:00:00Z', end_date: '2025-12-31T23:59:59Z', fields: 'all' },
      createMockTarget('listTransactions') as any,
    );

    assert.ok(fetchCalls[1].url.includes('/v1/reporting/transactions'));
    assert.ok(fetchCalls[1].url.includes('start_date='));
    assert.ok(fetchCalls[1].url.includes('end_date='));
    assert.strictEqual(fetchCalls[1].options.method, 'GET');
  });

  it('should throw on unsupported operation', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
    );

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('unknownOp') as any),
      (err: any) => {
        assert.match(err.message, /Unsupported PayPal operation/);
        return true;
      }
    );
  });

  it('should throw when PayPal API returns error', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
      { ok: false, status: 400, body: { name: 'INVALID_REQUEST', message: 'Bad request' } },
    );

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('createOrder') as any),
      (err: any) => {
        assert.match(err.message, /PayPal API request failed/);
        assert.match(err.message, /400/);
        return true;
      }
    );
  });

  it('should throw when OAuth token exchange fails', async () => {
    setupFetch(
      { ok: false, status: 401, body: { error: 'invalid_client' } },
    );

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('createOrder') as any),
      (err: any) => {
        assert.match(err.message, /OAuth token exchange failed/);
        return true;
      }
    );
  });

  it('should cache the OAuth token after exchange', async () => {
    setupFetch(
      { ok: true, status: 200, body: TOKEN_RESPONSE },
      { ok: true, status: 201, body: { id: 'ORDER-1' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('createOrder') as any,
    );

    assert.strictEqual(cacheSetItemMock.mock.calls.length, 1);
    const cacheCall = cacheSetItemMock.mock.calls[0];
    assert.ok(cacheCall.arguments[0].includes('paypal-token-'));
    assert.strictEqual(cacheCall.arguments[1], 'test-token-abc');
    assert.deepStrictEqual(cacheCall.arguments[2], { ttl: 1800 });
  });
});
