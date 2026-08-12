export type AIModelProvider = 'openai' | 'gemini' | 'claude';

export interface AIModel {
  label: string;
  identifier: string;
  value?: string;
  description?: string;
  maxTokens: number;
  contextWindow: number;
  provider: AIModelProvider;
  /** When false, temperature/top_p/top_k must not be sent to Anthropic. Defaults to true. */
  supportsSamplingParams?: boolean;
}

const UNKNOWN_MODEL_MAX_TOKENS = 4096;
const UNKNOWN_MODEL_CONTEXT_WINDOW = 4096;

export const OPENAI_MODELS: AIModel[] = [
  {
    label: 'GPT-5.4',
    identifier: 'gpt-5.4',
    value: 'gpt-5.4',
    description: 'Frontier model for complex professional work',
    maxTokens: 128000,
    contextWindow: 1050000,
    provider: 'openai',
  },
  {
    label: 'GPT-5.2',
    identifier: 'gpt-5.2',
    value: 'gpt-5.2',
    description: 'High-capability GPT-5 generation model',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'openai',
  },
  {
    label: 'GPT-5 Mini',
    identifier: 'gpt-5-mini',
    value: 'gpt-5-mini',
    description: 'Efficient GPT-5 model for high-volume workloads',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai',
  },
  {
    label: 'GPT-4.1',
    identifier: 'gpt-4.1',
    value: 'gpt-4.1',
    description: 'Enhanced GPT-4 generation model',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai',
  },
  {
    label: 'GPT-4o',
    identifier: 'gpt-4o',
    value: 'gpt-4o',
    description: 'Multimodal flagship model',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai',
  },
  {
    label: 'GPT-4o Mini',
    identifier: 'gpt-4o-mini',
    value: 'gpt-4o-mini',
    description: 'Affordable and intelligent small model',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai',
  },
  {
    label: 'O3',
    identifier: 'o3',
    value: 'o3',
    description: 'Advanced reasoning model for complex tasks',
    maxTokens: 100000,
    contextWindow: 200000,
    provider: 'openai',
  },
  {
    label: 'O3 Mini',
    identifier: 'o3-mini',
    value: 'o3-mini',
    description: 'Efficient advanced reasoning model',
    maxTokens: 100000,
    contextWindow: 200000,
    provider: 'openai',
  },
  {
    label: 'O4 Mini',
    identifier: 'o4-mini',
    value: 'o4-mini',
    description: 'Fast, cost-efficient reasoning model',
    maxTokens: 100000,
    contextWindow: 200000,
    provider: 'openai',
  },
];

export const GEMINI_MODELS: AIModel[] = [
  {
    label: 'Gemini 2.5 Pro',
    identifier: 'gemini-2.5-pro',
    value: 'gemini-2.5-pro',
    description: 'Most capable Gemini model with thinking support',
    maxTokens: 65536,
    contextWindow: 1048576,
    provider: 'gemini',
  },
  {
    label: 'Gemini 2.5 Flash',
    identifier: 'gemini-2.5-flash',
    value: 'gemini-2.5-flash',
    description: 'Fast, efficient Gemini model with thinking support',
    maxTokens: 65536,
    contextWindow: 1048576,
    provider: 'gemini',
  },
  {
    label: 'Gemini 2.0 Flash',
    identifier: 'gemini-2.0-flash',
    value: 'gemini-2.0-flash',
    description: 'Gemini 2.0 Flash model',
    maxTokens: 8192,
    contextWindow: 1048576,
    provider: 'gemini',
  },
  {
    label: 'Gemini 1.5 Pro',
    identifier: 'gemini-1.5-pro',
    value: 'gemini-1.5-pro',
    description: 'Capable Gemini model with large context',
    maxTokens: 8192,
    contextWindow: 2000000,
    provider: 'gemini',
  },
  {
    label: 'Gemini 1.5 Flash',
    identifier: 'gemini-1.5-flash',
    value: 'gemini-1.5-flash',
    description: 'Fast and efficient Gemini model',
    maxTokens: 8192,
    contextWindow: 1000000,
    provider: 'gemini',
  },
];

export const CLAUDE_MODELS: AIModel[] = [
  {
    label: 'Claude Opus 5',
    identifier: 'claude-opus-5',
    value: 'claude-opus-5',
    description: 'Latest Claude Opus frontier model',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Sonnet 4.6',
    identifier: 'claude-sonnet-4-6',
    value: 'claude-sonnet-4-6',
    description: 'Latest Claude Sonnet for complex agents and coding',
    maxTokens: 64000,
    contextWindow: 200000,
    provider: 'claude',
  },
  {
    label: 'Claude Sonnet 4.5',
    identifier: 'claude-sonnet-4-5-20250929',
    value: 'claude-sonnet-4-5-20250929',
    description: 'Claude Sonnet 4.5 dated snapshot',
    maxTokens: 64000,
    contextWindow: 200000,
    provider: 'claude',
  },
  {
    label: 'Claude Opus 4.8',
    identifier: 'claude-opus-4-8',
    value: 'claude-opus-4-8',
    description: 'Most capable Claude Opus model',
    maxTokens: 128000,
    contextWindow: 1000000,
    provider: 'claude',
    supportsSamplingParams: false,
  },
  {
    label: 'Claude Opus 4.6',
    identifier: 'claude-opus-4-6',
    value: 'claude-opus-4-6',
    description: 'High-capability Claude Opus model',
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
    label: 'Claude 3.7 Sonnet',
    identifier: 'claude-3-7-sonnet-20250219',
    value: 'claude-3-7-sonnet-20250219',
    description: 'Claude 3.7 Sonnet dated snapshot',
    maxTokens: 8192,
    contextWindow: 200000,
    provider: 'claude',
  },
  {
    label: 'Claude 3.5 Haiku',
    identifier: 'claude-3-5-haiku-20241022',
    value: 'claude-3-5-haiku-20241022',
    description: 'Fast Claude Haiku model for everyday tasks',
    maxTokens: 8192,
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
  openai: 'gpt-5.4',
  gemini: 'gemini-2.5-flash',
  claude: 'claude-sonnet-4-6',
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
