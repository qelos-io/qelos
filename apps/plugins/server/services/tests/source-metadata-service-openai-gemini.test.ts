import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IntegrationSourceKind } from '@qelos/global-types';
import { validateSourceMetadata } from '../source-metadata-service';

const emptyOpenAiShape = {
  defaultModel: null,
  initialMessages: [],
  defaultTemperature: null,
  defaultTopP: null,
  defaultFrequencyPenalty: null,
  defaultPresencePenalty: null,
  defaultMaxTokens: null,
  defaultResponseFormat: null,
  apiUrl: null,
  organizationId: null,
};

const emptyGeminiShape = {
  defaultModel: null,
  initialMessages: [],
  defaultTemperature: null,
  defaultTopP: null,
  defaultFrequencyPenalty: null,
  defaultPresencePenalty: null,
  defaultMaxTokens: null,
  defaultResponseFormat: null,
  apiUrl: null,
};

describe('validateSourceMetadata - OpenAI / Gemini apiUrl', () => {
  it('OpenAI: omits apiUrl / organizationId → null', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.OpenAI, {});
    assert.deepStrictEqual(result, emptyOpenAiShape);
  });

  it('OpenAI: accepts https apiUrl and trims organizationId', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.OpenAI, {
      apiUrl: 'https://api.internal/v1',
      organizationId: '  org-123  ',
    });
    assert.deepStrictEqual(result, {
      ...emptyOpenAiShape,
      apiUrl: 'https://api.internal/v1',
      organizationId: 'org-123',
    });
  });

  it('OpenAI: accepts host-only apiUrl (normalized to https)', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.OpenAI, {
      apiUrl: 'api.openai.com',
    });
    assert.strictEqual(result.apiUrl, 'https://api.openai.com/');
  });

  it('OpenAI: rejects non-http(s) apiUrl', async () => {
    await assert.rejects(
      () =>
        validateSourceMetadata(IntegrationSourceKind.OpenAI, {
          apiUrl: 'javascript:alert(1)',
        }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        return true;
      },
    );
  });

  it('OpenAI: rejects invalid apiUrl', async () => {
    await assert.rejects(
      () =>
        validateSourceMetadata(IntegrationSourceKind.OpenAI, {
          apiUrl: 'not a url !!!',
        }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        return true;
      },
    );
  });

  it('OpenAI: rejects non-string apiUrl', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.OpenAI, { apiUrl: 123 }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        return true;
      },
    );
  });

  it('OpenAI: rejects non-string organizationId', async () => {
    await assert.rejects(
      () => validateSourceMetadata(IntegrationSourceKind.OpenAI, { organizationId: 1 }),
      (err: any) => {
        assert.strictEqual(err.status, 400);
        return true;
      },
    );
  });

  it('Gemini: includes apiUrl null and no organizationId key', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Gemini, {});
    assert.deepStrictEqual(result, emptyGeminiShape);
    assert.strictEqual('organizationId' in result, false);
  });

  it('Gemini: validates apiUrl like OpenAI', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Gemini, {
      apiUrl: 'http://localhost:11434/v1',
    });
    assert.strictEqual(result.apiUrl, 'http://localhost:11434/v1');
    assert.strictEqual('organizationId' in result, false);
  });
});

describe('validateSourceMetadata - OpenAI / Gemini / Claude defaultModel', () => {
  it('OpenAI: trims custom defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.OpenAI, {
      defaultModel: '  my-custom-model  ',
    });
    assert.strictEqual(result.defaultModel, 'my-custom-model');
  });

  it('OpenAI: accepts curated model identifier', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.OpenAI, {
      defaultModel: 'gpt-5.4',
    });
    assert.strictEqual(result.defaultModel, 'gpt-5.4');
  });

  it('OpenAI: rejects empty defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.OpenAI, {
      defaultModel: '',
    });
    assert.strictEqual(result.defaultModel, null);
  });

  it('OpenAI: rejects whitespace-only defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.OpenAI, {
      defaultModel: '   ',
    });
    assert.strictEqual(result.defaultModel, null);
  });

  it('OpenAI: rejects non-string defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.OpenAI, {
      defaultModel: 123,
    });
    assert.strictEqual(result.defaultModel, null);
  });

  it('Gemini: trims custom defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Gemini, {
      defaultModel: '  gemini-custom  ',
    });
    assert.strictEqual(result.defaultModel, 'gemini-custom');
  });

  it('Gemini: rejects empty defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.Gemini, {
      defaultModel: '',
    });
    assert.strictEqual(result.defaultModel, null);
  });

  it('ClaudeAi: trims custom defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.ClaudeAi, {
      defaultModel: '  claude-custom  ',
    });
    assert.strictEqual(result.defaultModel, 'claude-custom');
  });

  it('ClaudeAi: accepts curated model identifier', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.ClaudeAi, {
      defaultModel: 'claude-sonnet-4-6',
    });
    assert.strictEqual(result.defaultModel, 'claude-sonnet-4-6');
  });

  it('ClaudeAi: rejects empty defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.ClaudeAi, {
      defaultModel: '',
    });
    assert.strictEqual(result.defaultModel, null);
  });

  it('ClaudeAi: rejects whitespace-only defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.ClaudeAi, {
      defaultModel: '   ',
    });
    assert.strictEqual(result.defaultModel, null);
  });

  it('ClaudeAi: rejects non-string defaultModel', async () => {
    const result = await validateSourceMetadata(IntegrationSourceKind.ClaudeAi, {
      defaultModel: false,
    });
    assert.strictEqual(result.defaultModel, null);
  });
});
