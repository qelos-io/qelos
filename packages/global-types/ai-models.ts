export type AIModelProvider = 'openai' | 'gemini' | 'claude';

export interface AIModel {
  label: string;
  identifier: string;
  value?: string;
  description?: string;
  maxTokens: number;
  contextWindow: number;
  provider: AIModelProvider;
  /** When false, temperature/top_p/top_k must not be sent (Anthropic 4.7+, OpenAI GPT-6 reasoning-only models). Defaults to true. */
  supportsSamplingParams?: boolean;
}

const UNKNOWN_MODEL_MAX_TOKENS = 4096;
const UNKNOWN_MODEL_CONTEXT_WINDOW = 4096;

export const OPENAI_MODELS: AIModel[] = [
  {
    label: 'GPT-6 Astra',
    identifier: 'gpt-6-astra',
    value: 'gpt-6-astra',
    description: 'Most capable model for the most demanding work',
    maxTokens: 128000,
    contextWindow: 1050000,
    provider: 'openai',
    supportsSamplingParams: false,
  },
  {
    label: 'GPT-6.1 Sol',
    identifier: 'gpt-6.1-sol',
    value: 'gpt-6.1-sol',
    description: 'Near-Astra performance for complex work at lower cost',
    maxTokens: 128000,
    contextWindow: 1050000,
    provider: 'openai',
    supportsSamplingParams: false,
  },
  {
    label: 'GPT-6 Luna',
    identifier: 'gpt-6-luna',
    value: 'gpt-6-luna',
    description: 'Most efficient model for focused, high-volume tasks',
    maxTokens: 128000,
    contextWindow: 1050000,
    provider: 'openai',
  },
  {
    label: 'GPT-5.4',
    identifier: 'gpt-5.4',
    value: 'gpt-5.4',
    description: 'Previous-generation frontier model',
    maxTokens: 128000,
    contextWindow: 1050000,
    provider: 'openai',
  },
  {
    label: 'GPT-5.2',
    identifier: 'gpt-5.2',
    value: 'gpt-5.2',
    description: 'Previous-generation GPT-5 model',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'openai',
  },
];

export const GEMINI_MODELS: AIModel[] = [
  {
    label: 'Gemini 4 Argon',
    identifier: 'gemini-4-argon',
    value: 'gemini-4-argon',
    description: 'Flagship reasoning model with a 1M-token context window',
    maxTokens: 65536,
    contextWindow: 1048576,
    provider: 'gemini',
  },
  {
    label: 'Gemini 3.8 Flash',
    identifier: 'gemini-3.8-flash',
    value: 'gemini-3.8-flash',
    description: 'Most capable Flash model for agents and long-running engineering work',
    maxTokens: 65536,
    contextWindow: 1048576,
    provider: 'gemini',
  },
  {
    label: 'Gemini 3.6 Flash',
    identifier: 'gemini-3.6-flash',
    value: 'gemini-3.6-flash',
    description: 'Balanced speed and multimodal ability for everyday tasks',
    maxTokens: 65536,
    contextWindow: 1048576,
    provider: 'gemini',
  },
  {
    label: 'Gemini 3.5 Flash-Lite',
    identifier: 'gemini-3.5-flash-lite',
    value: 'gemini-3.5-flash-lite',
    description: 'Fastest and most cost-effective 3.5 model for high-throughput work',
    maxTokens: 65536,
    contextWindow: 1048576,
    provider: 'gemini',
  },
  {
    label: 'Gemini 3.1 Flash-Lite',
    identifier: 'gemini-3.1-flash-lite',
    value: 'gemini-3.1-flash-lite',
    description: 'Near larger-model quality at a fraction of the cost',
    maxTokens: 65536,
    contextWindow: 1048576,
    provider: 'gemini',
  },
  {
    label: 'Gemini 2.5 Pro',
    identifier: 'gemini-2.5-pro',
    value: 'gemini-2.5-pro',
    description: 'Previous-generation Gemini with deep reasoning (limited access)',
    maxTokens: 65536,
    contextWindow: 1048576,
    provider: 'gemini',
  },
  {
    label: 'Gemini 2.5 Flash',
    identifier: 'gemini-2.5-flash',
    value: 'gemini-2.5-flash',
    description: 'Previous-generation Flash for low-latency reasoning (limited access)',
    maxTokens: 65536,
    contextWindow: 1048576,
    provider: 'gemini',
  },
];

export const CLAUDE_MODELS: AIModel[] = [
  {
    label: 'Claude Fable 5.1',
    identifier: 'claude-fable-5-1',
    value: 'claude-fable-5-1',
    description: 'For demanding reasoning and long-horizon agentic work',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Opus 5.5',
    identifier: 'claude-opus-5-5',
    value: 'claude-opus-5-5',
    description: 'For long-running agentic coding and knowledge work',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Sonnet 5.5',
    identifier: 'claude-sonnet-5-5',
    value: 'claude-sonnet-5-5',
    description: 'The best combination of speed and intelligence',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Haiku 5.5',
    identifier: 'claude-haiku-5-5',
    value: 'claude-haiku-5-5',
    description: 'For high-volume, latency-sensitive tasks',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Fable 5',
    identifier: 'claude-fable-5',
    value: 'claude-fable-5',
    description: 'Previous Claude Fable model',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Opus 5',
    identifier: 'claude-opus-5',
    value: 'claude-opus-5',
    description: 'Previous Claude Opus frontier model',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Sonnet 5',
    identifier: 'claude-sonnet-5',
    value: 'claude-sonnet-5',
    description: 'Previous Claude Sonnet model',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Opus 4.8',
    identifier: 'claude-opus-4-8',
    value: 'claude-opus-4-8',
    description: 'Claude Opus 4.8',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Sonnet 4.6',
    identifier: 'claude-sonnet-4-6',
    value: 'claude-sonnet-4-6',
    description: 'Claude Sonnet 4.6 for complex agents and coding',
    maxTokens: 64000,
    contextWindow: 200000,
    provider: 'claude',
  },
  {
    label: 'Claude Opus 4.6',
    identifier: 'claude-opus-4-6',
    value: 'claude-opus-4-6',
    description: 'Claude Opus 4.6',
    maxTokens: 128000,
    contextWindow: 200000,
    provider: 'claude',
  },
  {
    label: 'Claude Opus 4.5',
    identifier: 'claude-opus-4-5-20251101',
    value: 'claude-opus-4-5-20251101',
    description: 'Claude Opus 4.5 dated snapshot',
    maxTokens: 64000,
    contextWindow: 200000,
    provider: 'claude',
  },
  {
    label: 'Claude Haiku 4.5',
    identifier: 'claude-haiku-4-5-20251001',
    value: 'claude-haiku-4-5-20251001',
    description: 'Claude Haiku 4.5 dated snapshot',
    maxTokens: 64000,
    contextWindow: 200000,
    provider: 'claude',
  },
];

export const ALL_AI_MODELS: AIModel[] = [
  ...OPENAI_MODELS,
  ...GEMINI_MODELS,
  ...CLAUDE_MODELS,
];

export const DEFAULT_AI_MODEL_BY_PROVIDER: Record<AIModelProvider, string> = {
  openai: 'gpt-6.1-sol',
  gemini: 'gemini-3.8-flash',
  claude: 'claude-sonnet-5-5',
};

export const getModelByIdentifier = (identifier: string): AIModel | undefined => {
  const normalized = identifier.trim();
  return ALL_AI_MODELS.find(
    (model) => model.identifier === normalized || model.value === normalized,
  );
};

export const getMaxTokensForModel = (identifier: string): number => {
  return getModelByIdentifier(identifier)?.maxTokens ?? UNKNOWN_MODEL_MAX_TOKENS;
};

export const getContextWindowForModel = (identifier: string): number => {
  return getModelByIdentifier(identifier)?.contextWindow ?? UNKNOWN_MODEL_CONTEXT_WINDOW;
};

const CLAUDE_MODELS_WITHOUT_SAMPLING_PARAMS: RegExp[] = [
  /^claude-opus-4-(?:[7-9]|\d{2,})/,
  /^claude-opus-5/,
  /^claude-sonnet-5/,
  /^claude-fable-5/,
  /^claude-haiku-5/,
  /^claude-mythos/,
];

export const claudeModelSupportsSamplingParams = (modelId: string): boolean => {
  const normalized = modelId.trim();
  const catalogModel = getModelByIdentifier(normalized);

  if (catalogModel?.provider === 'claude') {
    return catalogModel.supportsSamplingParams !== false;
  }

  return !CLAUDE_MODELS_WITHOUT_SAMPLING_PARAMS.some((pattern) => pattern.test(normalized));
};

/** False only for catalog models flagged as rejecting temperature / top_p; unknown models are assumed to accept them. */
export const modelSupportsSamplingParams = (identifier: string): boolean =>
  getModelByIdentifier(identifier)?.supportsSamplingParams !== false;

export const getModelsByProvider = (provider: AIModelProvider): AIModel[] => {
  return ALL_AI_MODELS.filter((model) => model.provider === provider);
};

export const getProviderFromSourceKind = (sourceKind: string): AIModelProvider | null => {
  switch (sourceKind.toLowerCase()) {
    case 'openai':
      return 'openai';
    case 'gemini':
      return 'gemini';
    case 'google':
      return 'gemini';
    case 'claudeai':
      return 'claude';
    default:
      return null;
  }
};

export const OPENAI_MODEL_OPTIONS = OPENAI_MODELS.map((model) => ({
  label: model.label,
  identifier: model.identifier,
}));

export const AVAILABLE_MODELS = OPENAI_MODELS.map((model) => ({
  label: model.label,
  value: model.value ?? model.identifier,
  description: model.description ?? '',
}));
