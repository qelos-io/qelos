import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Mirrors the validation logic from integrations-trigger-service.ts
 * for the chatCompletion operation's optional params, so we can
 * unit-test rules support without requiring a DB connection.
 */

const CHAT_COMPLETION_PARAMS = {
  required: [] as string[],
  optional: [
    'recordThread', 'name', 'description',
    'vectorStore', 'vectorStoreScope', 'vectorStoreExpirationDays',
    'vectorStoreHardcodedIds', 'webSearch', 'codeInterpreter', 'rules',
  ],
};

const COMMON_OPTIONAL_PARAMS = ['roles', 'workspaceRoles', 'workspaceLabels'];

function validateTriggerDetails(details: Record<string, any>): { valid: Record<string, any>; removed: string[] } {
  const validParams = [
    ...CHAT_COMPLETION_PARAMS.required,
    ...CHAT_COMPLETION_PARAMS.optional,
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

  return { valid, removed };
}

describe('integration trigger rules validation', () => {
  it('rules is a valid optional parameter for chatCompletion', () => {
    assert.ok(CHAT_COMPLETION_PARAMS.optional.includes('rules'));
  });

  it('allows rules: true in trigger details', () => {
    const { valid, removed } = validateTriggerDetails({
      name: 'My Agent',
      rules: true,
    });
    assert.strictEqual(valid.rules, true);
    assert.strictEqual(removed.length, 0);
  });

  it('allows rules: false in trigger details', () => {
    const { valid } = validateTriggerDetails({
      name: 'My Agent',
      rules: false,
    });
    assert.strictEqual(valid.rules, false);
  });

  it('allows rules alongside other capabilities', () => {
    const details = {
      name: 'Full Agent',
      description: 'Agent with all capabilities',
      recordThread: true,
      vectorStore: true,
      vectorStoreScope: 'thread',
      webSearch: true,
      codeInterpreter: true,
      rules: true,
    };

    const { valid, removed } = validateTriggerDetails(details);
    assert.strictEqual(removed.length, 0);
    assert.strictEqual(valid.rules, true);
    assert.strictEqual(valid.webSearch, true);
    assert.strictEqual(valid.vectorStore, true);
  });

  it('removes unknown parameters while keeping rules', () => {
    const { valid, removed } = validateTriggerDetails({
      name: 'My Agent',
      rules: true,
      unknownParam: 'bad',
      anotherInvalid: 123,
    });
    assert.strictEqual(valid.rules, true);
    assert.strictEqual(valid.name, 'My Agent');
    assert.ok(removed.includes('unknownParam'));
    assert.ok(removed.includes('anotherInvalid'));
    assert.strictEqual(valid.unknownParam, undefined);
  });

  it('allows common optional params (roles, workspaceRoles, workspaceLabels) with rules', () => {
    const { valid, removed } = validateTriggerDetails({
      rules: true,
      roles: ['admin'],
      workspaceRoles: ['editor'],
      workspaceLabels: ['production'],
    });
    assert.strictEqual(removed.length, 0);
    assert.deepStrictEqual(valid.roles, ['admin']);
    assert.strictEqual(valid.rules, true);
  });

  it('handles empty details', () => {
    const { valid, removed } = validateTriggerDetails({});
    assert.deepStrictEqual(valid, {});
    assert.strictEqual(removed.length, 0);
  });

  it('rules is not required - details without rules is valid', () => {
    const { valid, removed } = validateTriggerDetails({
      name: 'Basic Agent',
      recordThread: false,
    });
    assert.strictEqual(removed.length, 0);
    assert.strictEqual(valid.rules, undefined);
  });
});
