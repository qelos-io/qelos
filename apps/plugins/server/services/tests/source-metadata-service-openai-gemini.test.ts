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
