import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ALL_AI_MODELS,
  modelSupportsSamplingParams,
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
    assert.deepStrictEqual(identifiers, ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-luna', 'gpt-5.4', 'gpt-5.2']);
  });

  it('exports expected curated Gemini identifiers', () => {
    const identifiers = GEMINI_MODELS.map((m) => m.identifier);
    assert.deepStrictEqual(identifiers, [
      'gemini-4-argon',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ]);
  });

  it('exports expected curated Claude identifiers', () => {
    const identifiers = CLAUDE_MODELS.map((m) => m.identifier);
    for (const id of ['claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-sonnet-4-6']) {
      assert.ok(identifiers.includes(id), `${id} missing`);
    }
  });

  it('does not list models the providers have deprecated or retired', () => {
    const deprecated = [
      /^gpt-3\.5/, /^gpt-4/, /^gpt-5-/, /^gpt-5$/, /^o[134](-|$)/,
      /^gemini-1\./, /^gemini-2\.0/,
      /^claude-3/, /^claude-sonnet-4-5/, /^claude-(sonnet|opus)-4-2025/,
    ];
    for (const model of ALL_AI_MODELS) {
      assert.ok(!deprecated.some((re) => re.test(model.identifier)), `${model.identifier} is deprecated`);
    }
  });

  it('flags models that reject temperature and top_p', () => {
    for (const id of ['gpt-6-astra', 'gpt-6.1-sol', 'claude-haiku-5-5', 'claude-sonnet-5-5']) {
      assert.strictEqual(modelSupportsSamplingParams(id), false, id);
    }
    for (const id of ['gpt-6-luna', 'gemini-3.8-flash', 'claude-sonnet-4-6', 'my-gateway-model']) {
      assert.strictEqual(modelSupportsSamplingParams(id), true, id);
    }
  });

  it('DEFAULT_AI_MODEL_BY_PROVIDER points at current defaults, all in the catalog', () => {
    assert.strictEqual(DEFAULT_AI_MODEL_BY_PROVIDER.openai, 'gpt-6.1-sol');
    assert.strictEqual(DEFAULT_AI_MODEL_BY_PROVIDER.gemini, 'gemini-3.8-flash');
    assert.strictEqual(DEFAULT_AI_MODEL_BY_PROVIDER.claude, 'claude-sonnet-5-5');
    for (const id of Object.values(DEFAULT_AI_MODEL_BY_PROVIDER)) assert.ok(getModelByIdentifier(id), id);
  });

  it('getModelByIdentifier resolves known models', () => {
    const model = getModelByIdentifier('gpt-6-luna');
    assert.ok(model);
    assert.strictEqual(model!.identifier, 'gpt-6-luna');
    assert.strictEqual(model!.provider, 'openai');
  });

  it('getModelByIdentifier returns undefined for unknown models', () => {
    assert.strictEqual(getModelByIdentifier('my-unknown-model'), undefined);
  });

  it('getMaxTokensForModel returns catalog value for known models', () => {
    assert.strictEqual(getMaxTokensForModel('gemini-3.8-flash'), 65536);
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
