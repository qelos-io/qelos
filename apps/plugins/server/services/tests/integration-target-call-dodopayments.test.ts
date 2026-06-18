import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

function createMockSource(overrides: any = {}) {
  return {
    _id: 'src-1',
    tenant: 'tenant-1',
    user: 'user-1',
    kind: 'dodopayments',
    authentication: 'auth-1',
    name: 'DodoPayments Test',
    labels: [],
    created: new Date(),
    metadata: {
      environment: 'test' as const,
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
    getEncryptedSourceAuthentication: mock.fn(async () => ({ apiKey: 'test-dodo-key' })),
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

describe('handleDodoPaymentsTarget', async () => {
  const { callIntegrationTarget } = await import('../integration-target-call');

  beforeEach(() => {
    mockSource = createMockSource();
    setupFetch();
  });

  it('createPayment should POST to /payments', async () => {
    setupFetch(
      { ok: true, status: 200, body: { payment_id: 'pay_123', status: 'pending' } },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      { product_cart: [{ product_id: 'prod_1', quantity: 1 }], payment_link: true },
      createMockTarget('createPayment') as any,
    );

    assert.deepStrictEqual(result, { payment_id: 'pay_123', status: 'pending' });
    assert.ok(fetchCalls[0].url.includes('test.dodopayments.com'));
    assert.ok(fetchCalls[0].url.includes('/payments'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
    assert.ok(fetchCalls[0].options.headers['Authorization'].startsWith('Bearer '));
  });

  it('getPayment should GET /payments/:id', async () => {
    setupFetch(
      { ok: true, status: 200, body: { payment_id: 'pay_123', status: 'succeeded' } },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      { payment_id: 'pay_123' },
      createMockTarget('getPayment') as any,
    );

    assert.deepStrictEqual(result, { payment_id: 'pay_123', status: 'succeeded' });
    assert.ok(fetchCalls[0].url.includes('/payments/pay_123'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
    assert.ok(fetchCalls[0].options.headers['Authorization'].startsWith('Bearer '));
  });

  it('getPayment should throw when payment_id is missing', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('getPayment') as any),
      (err: any) => {
        assert.match(err.message, /payment_id/);
        return true;
      }
    );
  });

  it('listPayments should GET /payments with query params', async () => {
    setupFetch(
      { ok: true, status: 200, body: { items: [], next_key: null } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { page_size: '10', status: 'succeeded' },
      createMockTarget('listPayments') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/payments'));
    assert.ok(fetchCalls[0].url.includes('page_size='));
    assert.ok(fetchCalls[0].url.includes('status='));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('createSubscription should POST to /subscriptions', async () => {
    setupFetch(
      { ok: true, status: 200, body: { subscription_id: 'sub_123', status: 'active' } },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      { customer: { customer_id: 'cust_1' }, product_id: 'prod_1', quantity: 1 },
      createMockTarget('createSubscription') as any,
    );

    assert.deepStrictEqual(result, { subscription_id: 'sub_123', status: 'active' });
    assert.ok(fetchCalls[0].url.includes('/subscriptions'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
    assert.ok(fetchCalls[0].options.headers['Authorization'].startsWith('Bearer '));
  });

  it('getSubscription should GET /subscriptions/:id', async () => {
    setupFetch(
      { ok: true, status: 200, body: { subscription_id: 'sub_123', status: 'active' } },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      { subscription_id: 'sub_123' },
      createMockTarget('getSubscription') as any,
    );

    assert.deepStrictEqual(result, { subscription_id: 'sub_123', status: 'active' });
    assert.ok(fetchCalls[0].url.includes('/subscriptions/sub_123'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('getSubscription should throw when subscription_id is missing', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('getSubscription') as any),
      (err: any) => {
        assert.match(err.message, /subscription_id/);
        return true;
      }
    );
  });

  it('updateSubscription should PATCH /subscriptions/:id', async () => {
    setupFetch(
      { ok: true, status: 200, body: { subscription_id: 'sub_123', quantity: 2 } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { subscription_id: 'sub_123', quantity: 2 },
      createMockTarget('updateSubscription') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/subscriptions/sub_123'));
    assert.strictEqual(fetchCalls[0].options.method, 'PATCH');
    assert.ok(fetchCalls[0].options.headers['Authorization'].startsWith('Bearer '));
  });

  it('updateSubscription should throw when subscription_id is missing', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('updateSubscription') as any),
      (err: any) => {
        assert.match(err.message, /subscription_id/);
        return true;
      }
    );
  });

  it('cancelSubscription should POST to /subscriptions/:id/cancel', async () => {
    setupFetch(
      { ok: true, status: 200, body: { subscription_id: 'sub_123', status: 'cancelled' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { subscription_id: 'sub_123' },
      createMockTarget('cancelSubscription') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/subscriptions/sub_123/cancel'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
  });

  it('cancelSubscription should throw when subscription_id is missing', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('cancelSubscription') as any),
      (err: any) => {
        assert.match(err.message, /subscription_id/);
        return true;
      }
    );
  });

  it('listSubscriptions should GET /subscriptions with query params', async () => {
    setupFetch(
      { ok: true, status: 200, body: { items: [], next_key: null } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { page_size: '20', status: 'active' },
      createMockTarget('listSubscriptions') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/subscriptions'));
    assert.ok(fetchCalls[0].url.includes('page_size='));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('createProduct should POST to /products', async () => {
    setupFetch(
      { ok: true, status: 200, body: { product_id: 'prod_123', name: 'Test Product' } },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      { name: 'Test Product', price: { currency: 'USD', discount: 0, price: 1000, purchasing_power_parity: false, type: 'one_time_price' } },
      createMockTarget('createProduct') as any,
    );

    assert.deepStrictEqual(result, { product_id: 'prod_123', name: 'Test Product' });
    assert.ok(fetchCalls[0].url.includes('/products'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
    assert.ok(fetchCalls[0].options.headers['Authorization'].startsWith('Bearer '));
  });

  it('getProduct should GET /products/:id', async () => {
    setupFetch(
      { ok: true, status: 200, body: { product_id: 'prod_123', name: 'Test Product' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { product_id: 'prod_123' },
      createMockTarget('getProduct') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/products/prod_123'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('getProduct should throw when product_id is missing', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('getProduct') as any),
      (err: any) => {
        assert.match(err.message, /product_id/);
        return true;
      }
    );
  });

  it('listProducts should GET /products', async () => {
    setupFetch(
      { ok: true, status: 200, body: { items: [] } },
    );

    await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('listProducts') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/products'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('createCustomer should POST to /customers', async () => {
    setupFetch(
      { ok: true, status: 200, body: { customer_id: 'cust_123', email: 'test@example.com' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { email: 'test@example.com', name: 'Test User' },
      createMockTarget('createCustomer') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/customers'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
    assert.ok(fetchCalls[0].options.headers['Authorization'].startsWith('Bearer '));
  });

  it('getCustomer should GET /customers/:id', async () => {
    setupFetch(
      { ok: true, status: 200, body: { customer_id: 'cust_123', email: 'test@example.com' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { customer_id: 'cust_123' },
      createMockTarget('getCustomer') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/customers/cust_123'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('getCustomer should throw when customer_id is missing', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('getCustomer') as any),
      (err: any) => {
        assert.match(err.message, /customer_id/);
        return true;
      }
    );
  });

  it('listCustomers should GET /customers', async () => {
    setupFetch(
      { ok: true, status: 200, body: { items: [] } },
    );

    await callIntegrationTarget(
      'tenant-1',
      {},
      createMockTarget('listCustomers') as any,
    );

    assert.ok(fetchCalls[0].url.includes('/customers'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('should use live base URL when environment is live', async () => {
    mockSource = createMockSource({ metadata: { environment: 'live' } });

    setupFetch(
      { ok: true, status: 200, body: { product_id: 'prod_123' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { name: 'Product' },
      createMockTarget('createProduct') as any,
    );

    assert.ok(fetchCalls[0].url.includes('live.dodopayments.com'));
    assert.ok(!fetchCalls[0].url.includes('test.dodopayments.com'));
  });

  it('should use test base URL when environment is test', async () => {
    setupFetch(
      { ok: true, status: 200, body: { product_id: 'prod_123' } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { name: 'Product' },
      createMockTarget('createProduct') as any,
    );

    assert.ok(fetchCalls[0].url.includes('test.dodopayments.com'));
    assert.ok(!fetchCalls[0].url.includes('live.dodopayments.com'));
  });

  it('should throw on unsupported operation', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('unknownOp') as any),
      (err: any) => {
        assert.match(err.message, /Unsupported DodoPayments operation/);
        return true;
      }
    );
  });

  it('should throw when DodoPayments API returns error', async () => {
    setupFetch(
      { ok: false, status: 400, body: { error: 'Bad request', message: 'Invalid payload' } },
    );

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', { name: 'Bad' }, createMockTarget('createProduct') as any),
      (err: any) => {
        assert.match(err.message, /DodoPayments API request failed/);
        assert.match(err.message, /400/);
        return true;
      }
    );
  });

  it('should propagate 404 error from DodoPayments API', async () => {
    setupFetch(
      { ok: false, status: 404, body: { error: 'not_found', message: 'Payment not found' } },
    );

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', { payment_id: 'pay_missing' }, createMockTarget('getPayment') as any),
      (err: any) => {
        assert.match(err.message, /DodoPayments API request failed/);
        assert.match(err.message, /404/);
        return true;
      }
    );
  });
});
