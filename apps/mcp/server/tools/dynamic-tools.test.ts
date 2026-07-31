import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { IIntegration } from '@qelos/global-types';

const getMcpToolIntegrationsMock = mock.fn<(...args: any[]) => any>();
const triggerIntegrationSourceMock = mock.fn<(...args: any[]) => any>();
const executeDataManipulationMock = mock.fn<(...args: any[]) => any>(async (_tenant: string, payload: any) => payload);

mock.module('../services/plugins-service-api.js', {
  namedExports: {
    getMcpToolIntegrations: getMcpToolIntegrationsMock,
    triggerIntegrationSource: triggerIntegrationSourceMock,
    executeDataManipulation: executeDataManipulationMock,
  },
});

function integration(overrides: Partial<IIntegration> = {}): IIntegration {
  return {
    _id: '507f1f77bcf86cd799439011',
    tenant: 'tenant-1',
    user: 'user-1',
    kind: ['qelos', 'http'],
    active: true,
    trigger: {
      source: 'source-1',
      operation: 'mcpTool',
      details: { name: 'Get Weather', description: 'Fetches weather', parameters: { type: 'object', properties: {} } },
    },
    target: {
      source: 'target-source-1',
      operation: 'makeRequest',
      details: { url: '/weather' },
    },
    dataManipulation: [],
    targetManipulation: [],
    created: new Date(),
    ...overrides,
  };
}

describe('dynamic-tools', async () => {
const { mapIntegrationToToolDefinition, getDynamicToolDefinitions } = await import('./dynamic-tools.js');

describe('mapIntegrationToToolDefinition', () => {
  it('returns null when trigger details are missing a name', () => {
    const tool = mapIntegrationToToolDefinition(
      integration({ trigger: { source: 's', operation: 'mcpTool', details: {} } }),
      new Set(),
    );
    assert.equal(tool, null);
  });

  it('falls back to the name when description is empty (description is optional for MCP)', () => {
    const tool = mapIntegrationToToolDefinition(
      integration({
        trigger: {
          source: 's',
          operation: 'mcpTool',
          details: { name: 'Get Weather', description: '', parameters: { type: 'object', properties: {} } },
        },
      }),
      new Set(),
    );
    assert.equal(tool?.description, 'Get Weather');
  });

  it('returns null when target is missing', () => {
    const tool = mapIntegrationToToolDefinition(
      integration({ target: { source: '', operation: '', details: {} } }),
      new Set(),
    );
    assert.equal(tool, null);
  });

  it('builds a stable id from the integration id and a sanitized name', () => {
    const tool = mapIntegrationToToolDefinition(integration(), new Set());
    assert.equal(tool?.id, 'integration:507f1f77bcf86cd799439011');
    assert.equal(tool?.name, 'Get_Weather');
    assert.equal(tool?.category, 'integrations');
    assert.equal(tool?.title, 'Get Weather');
  });

  it('disambiguates name collisions using the integration id suffix', () => {
    const usedNames = new Set(['Get_Weather']);
    const tool = mapIntegrationToToolDefinition(integration(), usedNames);
    assert.equal(tool?.name, 'Get_Weather_439011');
  });

  it('handler delegates to triggerIntegrationSource with the target config and caller tenant', async () => {
    triggerIntegrationSourceMock.mock.resetCalls();
    triggerIntegrationSourceMock.mock.mockImplementation(async () => ({ ok: true }));

    const tool = mapIntegrationToToolDefinition(integration(), new Set())!;
    const result = await tool.handler({
      sdk: {} as any,
      adminSdk: null,
      user: { sub: 'u1', tenant: 'tenant-1', roles: [], workspace: null },
      input: { city: 'Tel Aviv' },
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(triggerIntegrationSourceMock.mock.calls.length, 1);
    const [tenant, sourceId, options] = triggerIntegrationSourceMock.mock.calls[0].arguments;
    assert.equal(tenant, 'tenant-1');
    assert.equal(sourceId, 'target-source-1');
    assert.deepEqual(options, {
      payload: { city: 'Tel Aviv' },
      operation: 'makeRequest',
      details: { url: '/weather' },
      targetManipulation: [],
    });
  });

  it('applies dataManipulation to the input before calling the target', async () => {
    triggerIntegrationSourceMock.mock.resetCalls();
    triggerIntegrationSourceMock.mock.mockImplementation(async () => ({ ok: true }));
    executeDataManipulationMock.mock.resetCalls();
    executeDataManipulationMock.mock.mockImplementation(async () => ({ arguments: { city: 'transformed' } }));

    const tool = mapIntegrationToToolDefinition(
      integration({ dataManipulation: [{ map: { city: '.city | ascii_upcase' }, populate: {} }] }),
      new Set(),
    )!;
    const user = { sub: 'u1', tenant: 'tenant-1', roles: [], workspace: null };
    await tool.handler({ sdk: {} as any, adminSdk: null, user, input: { city: 'Tel Aviv' } });

    assert.equal(executeDataManipulationMock.mock.calls.length, 1);
    const [tenant, payload, workflow] = executeDataManipulationMock.mock.calls[0].arguments;
    assert.equal(tenant, 'tenant-1');
    assert.deepEqual(payload, { arguments: { city: 'Tel Aviv' }, user, workspace: user.workspace });
    assert.deepEqual(workflow, [{ map: { city: '.city | ascii_upcase' }, populate: {} }]);

    const [, , options] = triggerIntegrationSourceMock.mock.calls[0].arguments;
    assert.deepEqual(options.payload, { city: 'transformed' });
  });

  it('forwards targetManipulation steps to triggerIntegrationSource', async () => {
    triggerIntegrationSourceMock.mock.resetCalls();
    triggerIntegrationSourceMock.mock.mockImplementation(async () => ({ ok: true }));

    const steps = [{ map: { count: '.items | length' }, populate: {} }];
    const tool = mapIntegrationToToolDefinition(integration({ targetManipulation: steps }), new Set())!;
    await tool.handler({
      sdk: {} as any,
      adminSdk: null,
      user: { sub: 'u1', tenant: 'tenant-1', roles: [], workspace: null },
      input: {},
    });

    const [, , options] = triggerIntegrationSourceMock.mock.calls[0].arguments;
    assert.deepEqual(options.targetManipulation, steps);
  });
});

describe('getDynamicToolDefinitions', () => {
  it('maps active integrations and drops invalid ones', async () => {
    getMcpToolIntegrationsMock.mock.resetCalls();
    getMcpToolIntegrationsMock.mock.mockImplementation(async () => [
      integration(),
      integration({ _id: 'other-id', trigger: { source: 's', operation: 'mcpTool', details: {} } }),
    ]);

    const tools = await getDynamicToolDefinitions('tenant-1');
    assert.equal(tools.length, 1);
    assert.equal(tools[0].id, 'integration:507f1f77bcf86cd799439011');
  });

  it('returns an empty list when the plugins service call fails', async () => {
    getMcpToolIntegrationsMock.mock.resetCalls();
    getMcpToolIntegrationsMock.mock.mockImplementation(async () => {
      throw new Error('network error');
    });

    const tools = await getDynamicToolDefinitions('tenant-1');
    assert.deepEqual(tools, []);
  });
});
});
