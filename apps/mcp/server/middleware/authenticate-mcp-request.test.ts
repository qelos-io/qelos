import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const authenticateWithAuthServiceMock = mock.fn<(...args: any[]) => any>();
const getAuthConfigurationMock = mock.fn<(...args: any[]) => any>();

mock.module('../services/auth-service-api.js', {
  namedExports: {
    authenticateWithAuthService: authenticateWithAuthServiceMock,
  },
});

mock.module('../services/auth-configuration-service.js', {
  namedExports: {
    getAuthConfiguration: getAuthConfigurationMock,
    isApiKeyAuthenticationAllowed: (config: { allowUserTokenAuthentication?: boolean }) =>
      config.allowUserTokenAuthentication === true,
  },
});

function createMockResponse() {
  const response: {
    statusCode?: number;
    body?: unknown;
    status: (code: number) => typeof response;
    json: (payload: unknown) => typeof response;
  } = {
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
  };

  return response;
}

describe('authenticate-mcp-request', async () => {
  const { authenticateMcpRequest } = await import('../middleware/authenticate-mcp-request.js');

  beforeEach(() => {
    authenticateWithAuthServiceMock.mock.resetCalls();
    getAuthConfigurationMock.mock.resetCalls();
  });

  it('returns 401 MCP JSON-RPC error when tenant header is missing', async () => {
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createMockResponse();
    const next = mock.fn();

    await authenticateMcpRequest(req as any, res as any, next);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Tenant header is required' },
      id: null,
    });
    assert.equal(next.mock.callCount(), 0);
  });

  it('returns 401 when no auth material is provided', async () => {
    const req = { headers: { tenant: 'tenant-1' } };
    const res = createMockResponse();
    const next = mock.fn();

    await authenticateMcpRequest(req as any, res as any, next);

    assert.equal(res.statusCode, 401);
    assert.equal((res.body as any).error.message, 'Authentication required');
    assert.equal(next.mock.callCount(), 0);
  });

  it('rejects API key auth when tenant auth-configuration disables user tokens', async () => {
    getAuthConfigurationMock.mock.mockImplementation(async () => ({
      allowUserTokenAuthentication: false,
    }));

    const req = { headers: { tenant: 'tenant-1', 'x-api-key': 'ql_test' } };
    const res = createMockResponse();
    const next = mock.fn();

    await authenticateMcpRequest(req as any, res as any, next);

    assert.equal(res.statusCode, 401);
    assert.equal(
      (res.body as any).error.message,
      'API key authentication is not enabled for this tenant',
    );
    assert.equal(authenticateWithAuthServiceMock.mock.callCount(), 0);
  });

  it('accepts Bearer token auth via auth service /api/me', async () => {
    authenticateWithAuthServiceMock.mock.mockImplementation(async () => ({
      sub: 'user-1',
      tenant: 'tenant-1',
      roles: ['admin'],
      workspace: null,
    }));

    const req = { headers: { tenant: 'tenant-1', authorization: 'Bearer token-value' } };
    const res = createMockResponse();
    const next = mock.fn();

    await authenticateMcpRequest(req as any, res as any, next);

    assert.equal(next.mock.callCount(), 1);
    assert.equal((req as any).user.sub, 'user-1');
    assert.equal(authenticateWithAuthServiceMock.mock.callCount(), 1);
    assert.deepEqual(authenticateWithAuthServiceMock.mock.calls[0].arguments, [
      'tenant-1',
      { authorization: 'Bearer token-value', apiKey: undefined },
    ]);
  });
});
