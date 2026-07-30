import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Mirrors the validation logic from integrations-trigger-service.ts
 * for the qelos/mcpTool operation, so we can unit-test rules support
 * without requiring a DB connection.
 */

const MCP_TOOL_PARAMS = {
  required: ['name', 'description'],
  optional: ['parameters'],
};

const COMMON_OPTIONAL_PARAMS = ['roles', 'workspaceRoles', 'workspaceLabels'];

function validateTriggerDetails(details: Record<string, any>): { valid: Record<string, any>; removed: string[]; missingRequired: string[] } {
  const validParams = [
    ...MCP_TOOL_PARAMS.required,
    ...MCP_TOOL_PARAMS.optional,
    ...COMMON_OPTIONAL_PARAMS,
  ];
  const removed: string[] = [];
  const valid = { ...details };

  for (const key of Object.keys(valid)) {
    if (!validParams.includes(key)) {
      delete valid[key];
      removed.push(key);
    }
  }

  const missingRequired = MCP_TOOL_PARAMS.required.filter((key) => {
    const type = typeof details[key];
    return !(type === 'string' || type === 'number' || type === 'boolean');
  });

  return { valid, removed, missingRequired };
}

describe('integration trigger rules validation - qelos mcpTool', () => {
  it('requires name and description', () => {
    const { missingRequired } = validateTriggerDetails({});
    assert.ok(missingRequired.includes('name'));
    assert.ok(missingRequired.includes('description'));
  });

  it('accepts a valid mcpTool definition with parameters', () => {
    const { valid, removed, missingRequired } = validateTriggerDetails({
      name: 'get_weather',
      description: 'Fetches the current weather for a city',
      parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    });
    assert.strictEqual(missingRequired.length, 0);
    assert.strictEqual(removed.length, 0);
    assert.strictEqual(valid.name, 'get_weather');
    assert.deepStrictEqual(valid.parameters.required, ['city']);
  });

  it('strips allowedIntegrationIds/blockedIntegrationIds (only relevant to functionCalling)', () => {
    const { valid, removed } = validateTriggerDetails({
      name: 'my_tool',
      description: 'desc',
      allowedIntegrationIds: ['*'],
      blockedIntegrationIds: [],
    });
    assert.strictEqual(valid.allowedIntegrationIds, undefined);
    assert.strictEqual(valid.blockedIntegrationIds, undefined);
    assert.ok(removed.includes('allowedIntegrationIds'));
    assert.ok(removed.includes('blockedIntegrationIds'));
  });

  it('allows common optional params (roles, workspaceRoles, workspaceLabels)', () => {
    const { valid, removed } = validateTriggerDetails({
      name: 'my_tool',
      description: 'desc',
      roles: ['admin'],
    });
    assert.strictEqual(removed.length, 0);
    assert.deepStrictEqual(valid.roles, ['admin']);
  });

  it('removes unrecognized parameters while keeping valid ones', () => {
    const { valid, removed } = validateTriggerDetails({
      name: 'my_tool',
      description: 'desc',
      unknownParam: 'bad',
    });
    assert.ok(removed.includes('unknownParam'));
    assert.strictEqual(valid.name, 'my_tool');
  });
});
