import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

function createMockSource(overrides: any = {}) {
  return {
    _id: 'src-1',
    tenant: 'tenant-1',
    user: 'user-1',
    kind: 'sumit',
    authentication: 'auth-1',
    name: 'Sumit Test',
    labels: [],
    created: new Date(),
    metadata: {
      companyId: 12345678,
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
let savedEvents: any[] = [];

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

const emitPlatformEventMock = mock.fn();

let mockSource = createMockSource();

mock.module('node-fetch', { defaultExport: fetchMock });
mock.module('../http-agent', { defaultExport: undefined });
mock.module('../hook-events', { namedExports: { emitPlatformEvent: emitPlatformEventMock } });
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
    getEncryptedSourceAuthentication: mock.fn(async () => ({ apiKey: 'test-sumit-key' })),
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
      savedEvents.push(data);
    }
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

describe('handleSumitTarget', async () => {
  const { callIntegrationTarget } = await import('../integration-target-call');

  beforeEach(() => {
    mockSource = createMockSource();
    savedEvents = [];
    emitPlatformEventMock.mock.resetCalls();
    setupFetch();
  });

  it('should call createRecurringPayment endpoint with credentials in body', async () => {
    setupFetch(
      {
        ok: true,
        status: 200,
        body: {
          Status: 'Success',
          Data: {
            RecurringCustomerItemIDs: [123],
            CustomerID: 456,
          },
        },
      },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      {
        Amount: 29,
        Currency: 'ILS',
        Description: 'Pro Plan',
        RecurringInterval: 1,
        RecurringIntervalType: 'month',
        ExternalIdentifier: 'user:abc',
        Name: 'Test User',
        SingleUseToken: 'token-123',
      },
      createMockTarget('createRecurringPayment') as any,
    );

    assert.strictEqual(result.RecurringCustomerItemIDs[0], 123);
    assert.ok(fetchCalls[0].url.includes('api.sumit.co.il/billing/recurring/charge/'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');

    const requestBody = JSON.parse(fetchCalls[0].options.body);
    assert.strictEqual(requestBody.Items[0].UnitPrice, 29);
    assert.strictEqual(requestBody.Credentials.CompanyID, 12345678);
    assert.strictEqual(typeof requestBody.Credentials.CompanyID, 'number');
    assert.strictEqual(requestBody.Credentials.APIKey, 'test-sumit-key');
    assert.strictEqual(requestBody.SingleUseToken, 'token-123');
    assert.strictEqual(savedEvents.length, 0);
  });

  it('should call beginCheckoutRedirect endpoint', async () => {
    setupFetch(
      {
        ok: true,
        status: 200,
        body: {
          Status: 'Success',
          Data: {
            RedirectURL: 'https://sumit.co.il/pay/xxx',
          },
        },
      },
    );

    const result = await callIntegrationTarget(
      'tenant-1',
      {
        Customer: {
          ExternalIdentifier: 'user:1',
          SearchMode: 2,
          Name: 'User One',
        },
        Items: [{
          Item: { Name: 'Pro Plan', Description: 'Pro Plan' },
          Quantity: 1,
          UnitPrice: 29,
          Currency: 'ILS',
        }],
        RedirectURL: 'https://example.com/success',
        CancelRedirectURL: 'https://example.com/cancel',
        ExternalIdentifier: '{"tenant":"tenant-1"}',
      },
      createMockTarget('beginCheckoutRedirect') as any,
    );

    assert.strictEqual(result.RedirectURL, 'https://sumit.co.il/pay/xxx');
    assert.ok(fetchCalls[0].url.includes('api.sumit.co.il/billing/payments/beginredirect/'));
  });

  it('should call deleteRecurringPayment endpoint', async () => {
    setupFetch(
      { ok: true, status: 200, body: { Status: 'Success', Data: {} } },
    );

    await callIntegrationTarget(
      'tenant-1',
      { RecurringPaymentId: 123, ExternalIdentifier: 'user:abc' },
      createMockTarget('deleteRecurringPayment') as any,
    );

    assert.ok(fetchCalls[0].url.includes('api.sumit.co.il/billing/recurring/cancel/'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');

    const requestBody = JSON.parse(fetchCalls[0].options.body);
    assert.strictEqual(requestBody.RecurringCustomerItemID, 123);
    assert.strictEqual(savedEvents.length, 0);
  });

  it('should emit provider-call-failed when createRecurringPayment returns 4xx', async () => {
    setupFetch(
      { ok: false, status: 400, body: { Status: 'Error', UserErrorMessage: 'Invalid amount', Credentials: { APIKey: 'secret' } } },
    );

    await assert.rejects(
      () => callIntegrationTarget(
        'tenant-1',
        {
          Amount: 0,
          Currency: 'ILS',
          ExternalIdentifier: 'user:abc',
          Name: 'Test User',
          SingleUseToken: 'token-123',
        },
        createMockTarget('createRecurringPayment') as any,
      ),
      (err: any) => {
        assert.match(err.message, /Sumit API request failed/);
        assert.match(err.message, /400/);
        return true;
      },
    );

    assert.strictEqual(savedEvents.length, 1);
    assert.strictEqual(savedEvents[0].source, 'payments:sumit');
    assert.strictEqual(savedEvents[0].kind, 'provider');
    assert.strictEqual(savedEvents[0].eventName, 'provider-call-failed');
    assert.strictEqual(savedEvents[0].metadata.operation, 'createRecurringPayment');
    assert.strictEqual(savedEvents[0].metadata.providerKind, 'sumit');
    assert.strictEqual(savedEvents[0].metadata.status, 400);
    assert.strictEqual(savedEvents[0].metadata.providerResponse.UserErrorMessage, 'Invalid amount');
    assert.strictEqual(savedEvents[0].metadata.providerResponse.Credentials, undefined);
    assert.ok(emitPlatformEventMock.mock.calls.length >= 1);
  });

  it('should emit payment-method-save-failed when setPaymentDetails returns 5xx', async () => {
    setupFetch(
      { ok: false, status: 502, body: { Status: 'Error', TechnicalErrorDetails: 'Gateway timeout' } },
    );

    await assert.rejects(
      () => callIntegrationTarget(
        'tenant-1',
        { CustomerID: 1, SingleUseToken: 'token-123' },
        createMockTarget('setPaymentDetails') as any,
      ),
      (err: any) => {
        assert.match(err.message, /502/);
        return true;
      },
    );

    assert.strictEqual(savedEvents.length, 1);
    assert.strictEqual(savedEvents[0].eventName, 'payment-method-save-failed');
    assert.strictEqual(savedEvents[0].metadata.operation, 'setPaymentDetails');
    assert.strictEqual(savedEvents[0].metadata.providerResponse.TechnicalErrorDetails, 'Gateway timeout');
    assert.match(savedEvents[0].metadata.error.message, /502/);
  });

  it('should not emit platform event when deleteRecurringPayment fails', async () => {
    setupFetch(
      { ok: false, status: 404, body: { Status: 'Error', UserErrorMessage: 'Not found' } },
    );

    await assert.rejects(
      () => callIntegrationTarget(
        'tenant-1',
        { RecurringPaymentId: 999, ExternalIdentifier: 'user:abc' },
        createMockTarget('deleteRecurringPayment') as any,
      ),
      /Sumit API request failed/,
    );

    assert.strictEqual(savedEvents.length, 0);
    assert.strictEqual(emitPlatformEventMock.mock.calls.length, 0);
  });

  it('should throw on unsupported operation', async () => {
    setupFetch();

    await assert.rejects(
      () => callIntegrationTarget('tenant-1', {}, createMockTarget('unknownOp') as any),
      (err: any) => {
        assert.match(err.message, /Unsupported Sumit operation/);
        return true;
      },
    );
  });
});
