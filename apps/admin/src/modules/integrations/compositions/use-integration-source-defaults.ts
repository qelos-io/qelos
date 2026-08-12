import { DEFAULT_AI_MODEL_BY_PROVIDER, IntegrationSourceKind } from '@qelos/global-types';

export function useIntegrationSourceDefaults() {
  const getDefaultMetadata = (kind: IntegrationSourceKind) => {
    if (kind === IntegrationSourceKind.LinkedIn) {
      return { scope: 'openid email profile' };
    }
    if (kind === IntegrationSourceKind.Facebook) {
      return { scope: 'openid email public_profile' };
    }
    if (kind === IntegrationSourceKind.Google || kind === IntegrationSourceKind.GitHub) {
      return { scope: 'openid email profile' };
    }
    if (kind === IntegrationSourceKind.OpenAI) {
      return { defaultModel: DEFAULT_AI_MODEL_BY_PROVIDER.openai };
    }
    if (kind === IntegrationSourceKind.ClaudeAi) {
      return { defaultModel: DEFAULT_AI_MODEL_BY_PROVIDER.claude };
    }
    if (kind === IntegrationSourceKind.Gemini) {
      return { defaultModel: DEFAULT_AI_MODEL_BY_PROVIDER.gemini };
    }

    return {};
  };

  const buildBlankIntegrationSource = (kind: IntegrationSourceKind) => ({
    kind,
    name: '',
    labels: [],
    metadata: getDefaultMetadata(kind),
    authentication: {}
  });

  return {
    getDefaultMetadata,
    buildBlankIntegrationSource
  };
}
