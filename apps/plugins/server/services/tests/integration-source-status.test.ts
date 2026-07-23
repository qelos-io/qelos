import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { IntegrationSourceKind } from '@qelos/global-types';

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

mock.module('node-fetch', { defaultExport: fetchMock });
mock.module('../http-agent', { defaultExport: undefined });
mock.module('../logger', { defaultExport: { log: mock.fn(), error: mock.fn() } });

function setupFetch(...responses: Array<{ ok: boolean; status: number; body: any }>) {
  fetchResponses = responses;
  fetchCallIndex = 0;
  fetchCalls = [];
}

describe('resolveStatusAuthentication', async () => {
  const { resolveStatusAuthentication } = await import('../integration-source-status.js');

  it('merges stored auth with non-blank body overrides', () => {
    const result = resolveStatusAuthentication(
      { clientSecret: 'stored-secret' },
      { clientSecret: 'draft-secret' },
      IntegrationSourceKind.PayPal,
    );

    assert.strictEqual(result.clientSecret, 'draft-secret');
  });

  it('keeps stored secret when body override is blank', () => {
    const result = resolveStatusAuthentication(
      { apikey: 'stored-key' },
      { apikey: '' },
      IntegrationSourceKind.Sumit,
    );

    assert.strictEqual(result.apiKey, 'stored-key');
  });

  it('normalizes apikey to apiKey for Sumit and Paddle', () => {
    assert.strictEqual(
      resolveStatusAuthentication({ apikey: 'sumit-key' }, undefined, IntegrationSourceKind.Sumit).apiKey,
      'sumit-key',
    );
    assert.strictEqual(
      resolveStatusAuthentication({ apiKey: 'paddle-key' }, undefined, IntegrationSourceKind.Paddle).apiKey,
      'paddle-key',
    );
  });
});

describe('checkIntegrationSourceStatus', async () => {
  const { checkIntegrationSourceStatus } = await import('../integration-source-status.js');

  beforeEach(() => {
    setupFetch();
  });

  it('returns unsupported for non-payment integration kinds', async () => {
    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.OpenAI,
      metadata: {},
      authentication: { token: 'sk-test' },
    });

    assert.strictEqual(result.status, 'unsupported');
    assert.match(result.message, /not supported/i);
    assert.strictEqual(result.kind, IntegrationSourceKind.OpenAI);
    assert.ok(result.checkedAt);
    assert.strictEqual(fetchCalls.length, 0);
  });

  it('throws when Sumit credentials are missing', async () => {
    await assert.rejects(
      () => checkIntegrationSourceStatus({
        tenant: 'tenant-1',
        kind: IntegrationSourceKind.Sumit,
        metadata: { companyId: '12345678' },
        authentication: {},
      }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.code, 'MISSING_SUMIT_CREDENTIALS');
        return true;
      },
    );
  });

  it('returns failed for invalid Sumit company ID', async () => {
    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.Sumit,
      metadata: { companyId: 'not-a-number' },
      authentication: { apiKey: 'test-key' },
    });

    assert.strictEqual(result.status, 'failed');
    assert.match(result.message, /Invalid Sumit Company ID/i);
    assert.strictEqual(fetchCalls.length, 0);
  });

  it('returns connected when Sumit status check succeeds', async () => {
    setupFetch({
      ok: true,
      status: 200,
      body: {
        Status: 'Success',
        Data: {
          Payments: [{ ID: 1 }],
        },
      },
    });

    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.Sumit,
      metadata: { companyId: '476778618' },
      authentication: { apiKey: 'test-key' },
    });

    assert.strictEqual(result.status, 'connected');
    assert.strictEqual(result.message, 'Sumit connection verified');
    assert.strictEqual(result.details?.companyId, 476778618);
    assert.strictEqual(result.details?.paymentCount, 1);
    assert.ok(fetchCalls[0].url.includes('/billing/payments/list/'));
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
    assert.deepStrictEqual(
      JSON.parse(fetchCalls[0].options.body).Credentials,
      { CompanyID: 476778618, APIKey: 'test-key' },
    );
  });

  it('returns failed when Sumit rejects credentials', async () => {
    setupFetch({
      ok: true,
      status: 200,
      body: {
        Status: 'Error',
        UserErrorMessage: 'Invalid API key',
        Credentials: { CompanyID: 123, APIKey: 'secret' },
      },
    });

    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.Sumit,
      metadata: { companyId: '12345678' },
      authentication: { apiKey: 'bad-key' },
    });

    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(result.message, 'Invalid API key');
    assert.strictEqual(result.details?.Credentials, undefined);
  });

  it('returns connected when PayPal OAuth succeeds', async () => {
    setupFetch({
      ok: true,
      status: 200,
      body: { access_token: 'paypal-token', expires_in: 32400 },
    });

    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.PayPal,
      metadata: { clientId: 'client-id', environment: 'sandbox' },
      authentication: { clientSecret: 'client-secret' },
    });

    assert.strictEqual(result.status, 'connected');
    assert.strictEqual(result.message, 'PayPal connection verified');
    assert.strictEqual(result.details?.environment, 'sandbox');
    assert.strictEqual(result.details?.expiresIn, 32400);
    assert.ok(fetchCalls[0].url.includes('/v1/oauth2/token'));
    assert.ok(fetchCalls[0].url.includes('sandbox'));
  });

  it('returns failed when PayPal OAuth is rejected', async () => {
    setupFetch({
      ok: false,
      status: 401,
      body: { error: 'invalid_client', client_secret: 'must-not-leak' },
    });

    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.PayPal,
      metadata: { clientId: 'client-id', environment: 'live' },
      authentication: { clientSecret: 'bad-secret' },
    });

    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(result.message, 'invalid_client');
    assert.strictEqual(result.details?.client_secret, undefined);
  });

  it('throws when PayPal credentials are missing', async () => {
    await assert.rejects(
      () => checkIntegrationSourceStatus({
        tenant: 'tenant-1',
        kind: IntegrationSourceKind.PayPal,
        metadata: { clientId: 'client-id' },
        authentication: {},
      }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.code, 'MISSING_PAYPAL_CREDENTIALS');
        return true;
      },
    );
  });

  it('returns connected when Paddle list products succeeds', async () => {
    setupFetch({
      ok: true,
      status: 200,
      body: { data: [{ id: 'pro_123' }], meta: { pagination: {} } },
    });

    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.Paddle,
      metadata: { environment: 'sandbox' },
      authentication: { apiKey: 'pdl_test_key' },
    });

    assert.strictEqual(result.status, 'connected');
    assert.strictEqual(result.message, 'Paddle connection verified');
    assert.strictEqual(result.details?.environment, 'sandbox');
    assert.strictEqual(result.details?.productCount, 1);
    assert.ok(fetchCalls[0].url.includes('sandbox-api.paddle.com/products'));
    assert.ok(fetchCalls[0].url.includes('page%5Bsize%5D=1'));
    assert.strictEqual(fetchCalls[0].options.method, 'GET');
  });

  it('returns failed when Paddle rejects the API key', async () => {
    setupFetch({
      ok: false,
      status: 403,
      body: {
        error: {
          type: 'authorization_error',
          detail: 'Invalid API key',
          authorization: 'Bearer secret',
        },
      },
    });

    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.Paddle,
      metadata: { environment: 'live' },
      authentication: { apiKey: 'bad-key' },
    });

    assert.strictEqual(result.status, 'failed');
    assert.match(result.message, /403/);
    assert.strictEqual((result.details?.error as Record<string, unknown> | undefined)?.authorization, undefined);
  });

  it('throws when Paddle API key is missing', async () => {
    await assert.rejects(
      () => checkIntegrationSourceStatus({
        tenant: 'tenant-1',
        kind: IntegrationSourceKind.Paddle,
        metadata: { environment: 'sandbox' },
        authentication: {},
      }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.code, 'MISSING_PADDLE_CREDENTIALS');
        return true;
      },
    );
  });

  it('returns connected when DodoPayments list products succeeds', async () => {
    setupFetch({
      ok: true,
      status: 200,
      body: { data: [{ product_id: 'prod_123' }] },
    });

    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.DodoPayments,
      metadata: { environment: 'test' },
      authentication: { apiKey: 'dodo_test_key' },
    });

    assert.strictEqual(result.status, 'connected');
    assert.strictEqual(result.message, 'DodoPayments connection verified');
    assert.strictEqual(result.details?.environment, 'test');
    assert.strictEqual(result.details?.productCount, 1);
    assert.ok(fetchCalls[0].url.includes('test.dodopayments.com/products'));
    assert.ok(fetchCalls[0].url.includes('page=1'));
    assert.ok(fetchCalls[0].url.includes('limit=1'));
  });

  it('returns failed when DodoPayments rejects the API key', async () => {
    setupFetch({
      ok: false,
      status: 401,
      body: { message: 'Unauthorized', apiKey: 'must-not-leak' },
    });

    const result = await checkIntegrationSourceStatus({
      tenant: 'tenant-1',
      kind: IntegrationSourceKind.DodoPayments,
      metadata: { environment: 'live' },
      authentication: { apiKey: 'bad-key' },
    });

    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(result.message, 'Unauthorized');
    assert.strictEqual(result.details?.apiKey, undefined);
  });

  it('throws when DodoPayments API key is missing', async () => {
    await assert.rejects(
      () => checkIntegrationSourceStatus({
        tenant: 'tenant-1',
        kind: IntegrationSourceKind.DodoPayments,
        metadata: { environment: 'test' },
        authentication: {},
      }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.code, 'MISSING_DODO_PAYMENTS_CREDENTIALS');
        return true;
      },
    );
  });
});
