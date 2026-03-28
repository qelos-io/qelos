import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Mirrors the rules extraction logic from chat-completion controller.
 * Kept in sync so we can unit-test without spinning up the full server.
 */
function extractRules(
  triggerDetails: any,
  optionsRules: any,
): string[] {
  return (triggerDetails?.rules && Array.isArray(optionsRules))
    ? optionsRules.filter((r: any) => typeof r === 'string' && r.trim())
    : [];
}

function buildRulesMessages(rules: string[]): Array<{ role: string; content: string }> {
  if (rules.length === 0) return [];
  return [{
    role: 'system',
    content: `The following rules MUST be followed:\n\n${rules.map((rule, i) => `Rule ${i + 1}:\n${rule}`).join('\n\n')}`,
  }];
}

describe('chat-completion rules', () => {
  describe('extractRules', () => {
    it('returns rules when trigger allows and options has valid rules', () => {
      const result = extractRules(
        { rules: true },
        ['Use TypeScript', 'No console.log'],
      );
      assert.deepStrictEqual(result, ['Use TypeScript', 'No console.log']);
    });

    it('returns empty array when trigger does not allow rules', () => {
      const result = extractRules(
        { recordThread: true },
        ['Use TypeScript'],
      );
      assert.deepStrictEqual(result, []);
    });

    it('returns empty array when trigger.details.rules is false', () => {
      const result = extractRules(
        { rules: false },
        ['Use TypeScript'],
      );
      assert.deepStrictEqual(result, []);
    });

    it('returns empty array when options.rules is not an array', () => {
      const result = extractRules(
        { rules: true },
        'not an array',
      );
      assert.deepStrictEqual(result, []);
    });

    it('returns empty array when options.rules is undefined', () => {
      const result = extractRules(
        { rules: true },
        undefined,
      );
      assert.deepStrictEqual(result, []);
    });

    it('filters out non-string values from rules', () => {
      const result = extractRules(
        { rules: true },
        ['Valid rule', 123, null, undefined, { obj: true }, 'Another rule'],
      );
      assert.deepStrictEqual(result, ['Valid rule', 'Another rule']);
    });

    it('filters out empty and whitespace-only strings', () => {
      const result = extractRules(
        { rules: true },
        ['Valid rule', '', '   ', '\t', 'Another rule'],
      );
      assert.deepStrictEqual(result, ['Valid rule', 'Another rule']);
    });

    it('handles null trigger details', () => {
      const result = extractRules(null, ['rule']);
      assert.deepStrictEqual(result, []);
    });

    it('handles undefined trigger details', () => {
      const result = extractRules(undefined, ['rule']);
      assert.deepStrictEqual(result, []);
    });

    it('returns empty array when both trigger allows rules but options.rules is empty array', () => {
      const result = extractRules({ rules: true }, []);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('buildRulesMessages', () => {
    it('returns empty array when no rules provided', () => {
      const result = buildRulesMessages([]);
      assert.deepStrictEqual(result, []);
    });

    it('returns system message with single rule', () => {
      const result = buildRulesMessages(['Use strict TypeScript']);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].role, 'system');
      assert.ok(result[0].content.includes('Rule 1:'));
      assert.ok(result[0].content.includes('Use strict TypeScript'));
      assert.ok(result[0].content.includes('The following rules MUST be followed'));
    });

    it('returns system message with multiple rules numbered correctly', () => {
      const result = buildRulesMessages(['Rule A', 'Rule B', 'Rule C']);
      assert.strictEqual(result.length, 1);
      assert.ok(result[0].content.includes('Rule 1:\nRule A'));
      assert.ok(result[0].content.includes('Rule 2:\nRule B'));
      assert.ok(result[0].content.includes('Rule 3:\nRule C'));
    });

    it('preserves multiline rule content', () => {
      const multilineRule = 'First line\nSecond line\nThird line';
      const result = buildRulesMessages([multilineRule]);
      assert.ok(result[0].content.includes(multilineRule));
    });
  });

  describe('rules integration in message building', () => {
    it('rules messages are placed between pre_messages and user messages', () => {
      const preMessages = [{ role: 'system', content: 'You are an assistant' }];
      const rulesMessages = buildRulesMessages(['Always be polite']);
      const userMessages = [{ role: 'user', content: 'Hello' }];

      const initialMessages = [
        ...preMessages,
        ...rulesMessages,
        ...userMessages,
      ];

      assert.strictEqual(initialMessages.length, 3);
      assert.strictEqual(initialMessages[0].role, 'system');
      assert.strictEqual(initialMessages[0].content, 'You are an assistant');
      assert.strictEqual(initialMessages[1].role, 'system');
      assert.ok(initialMessages[1].content.includes('rules MUST be followed'));
      assert.strictEqual(initialMessages[2].role, 'user');
      assert.strictEqual(initialMessages[2].content, 'Hello');
    });

    it('no rules messages when rules disabled - user messages follow pre_messages directly', () => {
      const preMessages = [{ role: 'system', content: 'You are an assistant' }];
      const rules = extractRules({ rules: false }, ['ignored rule']);
      const rulesMessages = buildRulesMessages(rules);
      const userMessages = [{ role: 'user', content: 'Hello' }];

      const initialMessages = [
        ...preMessages,
        ...rulesMessages,
        ...userMessages,
      ];

      assert.strictEqual(initialMessages.length, 2);
      assert.strictEqual(initialMessages[0].content, 'You are an assistant');
      assert.strictEqual(initialMessages[1].content, 'Hello');
    });
  });
});
