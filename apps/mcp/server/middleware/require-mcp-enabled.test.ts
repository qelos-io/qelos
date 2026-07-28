import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { isMcpConfigurationEnabled } from '../services/mcp-configuration-guards.js';

const getMcpConfigurationMock = mock.fn<(...args: any[]) => any>();

mock.module('../services/mcp-configuration-service.js', {
  namedExports: {
    getMcpConfiguration: getMcpConfigurationMock,
    isMcpConfigurationEnabled,
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

describe('require-mcp-enabled', async () => {
  const { requireMcpEnabled } = await import('../middleware/require-mcp-enabled.js');

  beforeEach(() => {
    getMcpConfigurationMock.mock.resetCalls();
  });

  it('returns 503 when mcp-configuration.enabled is false', async () => {
    getMcpConfigurationMock.mock.mockImplementation(async () => ({
      enabled: false,
      exposedTools: [],
      permittedCallbackUrls: [],
      adminOnly: false,
    }));

    const req = { headers: { tenant: 'tenant-1' }, user: { tenant: 'tenant-1' } };
    const res = createMockResponse();
    const next = mock.fn();

    await requireMcpEnabled(req as any, res as any, next);

    assert.equal(res.statusCode, 503);
    assert.equal(
      (res.body as any).error.message,
      'MCP service is disabled for this tenant',
    );
    assert.equal(next.mock.callCount(), 0);
  });

  it('attaches mcp configuration and continues when enabled', async () => {
    const configuration = {
      enabled: true,
      exposedTools: [],
      permittedCallbackUrls: [],
      adminOnly: false,
      serverName: 'tenant-mcp',
    };

    getMcpConfigurationMock.mock.mockImplementation(async () => configuration);

    const req = { headers: { tenant: 'tenant-1' }, user: { tenant: 'tenant-1' } };
    const res = createMockResponse();
    const next = mock.fn();

    await requireMcpEnabled(req as any, res as any, next);

    assert.equal(next.mock.callCount(), 1);
    assert.deepEqual((req as any).mcpConfiguration, configuration);
  });
});

describe('mcp-configuration-service helpers', () => {
  it('isMcpConfigurationEnabled returns true only when enabled is true', () => {
    assert.equal(isMcpConfigurationEnabled({ enabled: true } as any), true);
    assert.equal(isMcpConfigurationEnabled({ enabled: false } as any), false);
    assert.equal(isMcpConfigurationEnabled(null), false);
  });
});
