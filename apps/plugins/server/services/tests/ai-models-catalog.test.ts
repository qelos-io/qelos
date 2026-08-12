import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  OPENAI_MODELS,
  GEMINI_MODELS,
  CLAUDE_MODELS,
  DEFAULT_AI_MODEL_BY_PROVIDER,
  getModelByIdentifier,
  getMaxTokensForModel,
  getContextWindowForModel,
  getModelsByProvider,
  getProviderFromSourceKind,
} from '@qelos/global-types';

describe('AI model catalog', () => {
  it('exports expected curated OpenAI identifiers', () => {
    const identifiers = OPENAI_MODELS.map((m) => m.identifier);
    assert.deepStrictEqual(identifiers, [
      'gpt-5.4',
      'gpt-5.2',
      'gpt-5-mini',
      'gpt-4.1',
      'gpt-4o',
      'gpt-4o-mini',
      'o3',
      'o3-mini',
      'o4-mini',
    ]);
  });

  it('exports expected curated Gemini identifiers', () => {
    const identifiers = GEMINI_MODELS.map((m) => m.identifier);
    assert.deepStrictEqual(identifiers, [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ]);
  });

  it('exports expected curated Claude identifiers', () => {
    const identifiers = CLAUDE_MODELS.map((m) => m.identifier);
    assert.ok(identifiers.includes('claude-sonnet-4-6'));
    assert.ok(identifiers.includes('claude-opus-4-8'));
    assert.ok(identifiers.includes('claude-3-7-sonnet-20250219'));
    assert.ok(identifiers.includes('claude-3-5-haiku-20241022'));
  });

  it('DEFAULT_AI_MODEL_BY_PROVIDER points at current defaults', () => {
    assert.strictEqual(DEFAULT_AI_MODEL_BY_PROVIDER.openai, 'gpt-5.4');
    assert.strictEqual(DEFAULT_AI_MODEL_BY_PROVIDER.gemini, 'gemini-2.5-flash');
    assert.strictEqual(DEFAULT_AI_MODEL_BY_PROVIDER.claude, 'claude-sonnet-4-6');
  });

  it('getModelByIdentifier resolves known models', () => {
    const model = getModelByIdentifier('gpt-5.4');
    assert.ok(model);
    assert.strictEqual(model!.identifier, 'gpt-5.4');
    assert.strictEqual(model!.provider, 'openai');
  });

  it('getModelByIdentifier returns undefined for unknown models', () => {
    assert.strictEqual(getModelByIdentifier('my-unknown-model'), undefined);
  });

  it('getMaxTokensForModel returns catalog value for known models', () => {
    assert.strictEqual(getMaxTokensForModel('gemini-2.5-flash'), 65536);
  });

  it('getMaxTokensForModel falls back for unknown models', () => {
    assert.strictEqual(getMaxTokensForModel('custom-model'), 4096);
  });

  it('getContextWindowForModel falls back for unknown models', () => {
    assert.strictEqual(getContextWindowForModel('custom-model'), 4096);
  });

  it('getModelsByProvider returns only that provider', () => {
    const openai = getModelsByProvider('openai');
    assert.ok(openai.length > 0);
    assert.ok(openai.every((m) => m.provider === 'openai'));
  });

  it('getProviderFromSourceKind maps integration source kinds', () => {
    assert.strictEqual(getProviderFromSourceKind('openai'), 'openai');
    assert.strictEqual(getProviderFromSourceKind('gemini'), 'gemini');
    assert.strictEqual(getProviderFromSourceKind('google'), 'gemini');
    assert.strictEqual(getProviderFromSourceKind('claudeai'), 'claude');
    assert.strictEqual(getProviderFromSourceKind('unknown'), null);
  });
});
