import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  claudeModelSupportsSamplingParams,
  IntegrationSourceKind,
  type IClaudeAiSource,
} from '@qelos/global-types';
import { buildAnthropicMessagesCreateParams } from '../chat-completion/providers/anthropic-request-params';
import { applyResponseFormatToSystem } from '../chat-completion/providers/anthropic';
import type { AIServiceOptions } from '../chat-completion/providers/types';

const claudeSource = (): IClaudeAiSource => ({
  kind: IntegrationSourceKind.ClaudeAi,
  authentication: { token: 'test-token' },
  metadata: {},
});

const baseOptions = (overrides: Partial<AIServiceOptions> = {}): AIServiceOptions => ({
  model: 'claude-sonnet-4-6',
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1024,
  ...overrides,
});

describe('claudeModelSupportsSamplingParams', () => {
  it('returns false for catalog Claude Opus 4.8', () => {
    assert.strictEqual(claudeModelSupportsSamplingParams('claude-opus-4-8'), false);
  });

  it('returns true for catalog Claude Sonnet 4.6', () => {
    assert.strictEqual(claudeModelSupportsSamplingParams('claude-sonnet-4-6'), true);
  });

  it('returns false for custom dated Claude Opus 4.8 model id via heuristic', () => {
    assert.strictEqual(claudeModelSupportsSamplingParams('claude-opus-4-8-20260201'), false);
  });

  it('returns false for catalog Claude Opus 5', () => {
    assert.strictEqual(claudeModelSupportsSamplingParams('claude-opus-5'), false);
  });
});

describe('buildAnthropicMessagesCreateParams', () => {
  it('omits temperature and top_p for unsupported model even when options include them', () => {
    const params = buildAnthropicMessagesCreateParams(
      baseOptions({ model: 'claude-opus-5' }),
      claudeSource(),
      false,
    );

    assert.strictEqual(params.model, 'claude-opus-5');
    assert.strictEqual(params.max_tokens, 1024);
    assert.strictEqual(params.stream, false);
    assert.ok(!('temperature' in params));
    assert.ok(!('top_p' in params));
  });

  it('includes temperature and top_p for supported model', () => {
    const params = buildAnthropicMessagesCreateParams(
      baseOptions({ model: 'claude-sonnet-4-6' }),
      claudeSource(),
      true,
    );

    assert.strictEqual(params.model, 'claude-sonnet-4-6');
    assert.strictEqual(params.temperature, 0.7);
    assert.strictEqual(params.top_p, 0.9);
    assert.strictEqual(params.max_tokens, 1024);
    assert.strictEqual(params.stream, true);
  });

  it('maps stop to stop_sequences', () => {
    const params = buildAnthropicMessagesCreateParams(
      baseOptions({ stop: ['END', 'STOP'] }),
      claudeSource(),
      false,
    );

    assert.deepStrictEqual(params.stop_sequences, ['END', 'STOP']);
  });

  it('wraps a string stop into a stop_sequences array', () => {
    const params = buildAnthropicMessagesCreateParams(
      baseOptions({ stop: 'END' as any }),
      claudeSource(),
      false,
    );

    assert.deepStrictEqual(params.stop_sequences, ['END']);
  });

  it('omits stop_sequences when stop is empty or missing', () => {
    const withEmpty = buildAnthropicMessagesCreateParams(baseOptions({ stop: [] }), claudeSource(), false);
    const withoutStop = buildAnthropicMessagesCreateParams(baseOptions(), claudeSource(), false);

    assert.ok(!('stop_sequences' in withEmpty));
    assert.ok(!('stop_sequences' in withoutStop));
  });
});

describe('applyResponseFormatToSystem', () => {
  it('returns system unchanged when no response format', () => {
    assert.strictEqual(applyResponseFormatToSystem('base prompt'), 'base prompt');
    assert.strictEqual(applyResponseFormatToSystem(undefined), undefined);
  });

  it('appends JSON instruction for json_object format', () => {
    const result = applyResponseFormatToSystem('base prompt', { type: 'json_object' });
    assert.ok(result?.startsWith('base prompt'));
    assert.ok(result?.includes('valid JSON only'));
  });

  it('includes schema for json_schema format', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const result = applyResponseFormatToSystem(undefined, {
      type: 'json_schema',
      json_schema: { schema },
    });
    assert.ok(result?.includes('valid JSON only'));
    assert.ok(result?.includes(JSON.stringify(schema)));
  });

  it('ignores unknown response format types', () => {
    assert.strictEqual(applyResponseFormatToSystem('base prompt', { type: 'text' }), 'base prompt');
  });
});
