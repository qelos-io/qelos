export interface AIModel {
  label: string;
  identifier: string;
  value?: string;
  description?: string;
  maxTokens: number;
  contextWindow: number;
  provider: 'openai' | 'gemini' | 'claude';
}

// OpenAI Models
export const OPENAI_MODELS: AIModel[] = [
  // O3 Series - Latest advanced reasoning models
  { 
    label: 'O3', 
    identifier: 'o3', 
    value: 'o3', 
    description: 'Latest advanced reasoning model',
    maxTokens: 200000,
    contextWindow: 1000000,
    provider: 'openai'
  },
  { 
    label: 'O3 Mini', 
    identifier: 'o3-mini', 
    value: 'o3-mini', 
    description: 'Efficient advanced reasoning model',
    maxTokens: 200000,
    contextWindow: 1000000,
    provider: 'openai'
  },
  
  // GPT-5 Series
  { 
    label: 'GPT-5', 
    identifier: 'gpt-5', 
    value: 'gpt-5', 
    description: 'Next generation flagship model',
    maxTokens: 200000,
    contextWindow: 1000000,
    provider: 'openai'
  },
  { 
    label: 'GPT-5.1', 
    identifier: 'gpt-5.1', 
    value: 'gpt-5.1', 
    description: 'Enhanced GPT-5 model',
    maxTokens: 200000,
    contextWindow: 1000000,
    provider: 'openai'
  },
  { 
    label: 'GPT-5 Mini', 
    identifier: 'gpt-5-mini', 
    value: 'gpt-5-mini', 
    description: 'GPT-5 optimized version',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'GPT-5 Turbo', 
    identifier: 'gpt-5-turbo', 
    value: 'gpt-5-turbo', 
    description: 'GPT-5 optimized version',
    maxTokens: 200000,
    contextWindow: 1000000,
    provider: 'openai'
  },
  { 
    label: 'GPT-5 Turbo Preview', 
    identifier: 'gpt-5-turbo-preview', 
    value: 'gpt-5-turbo-preview', 
    description: 'GPT-5 Turbo preview',
    maxTokens: 200000,
    contextWindow: 1000000,
    provider: 'openai'
  },
  { 
    label: 'GPT-5.2', 
    identifier: 'gpt-5.2', 
    value: 'gpt-5.2', 
    description: 'Latest GPT-5.2 model',
    maxTokens: 200000,
    contextWindow: 1000000,
    provider: 'openai'
  },
  { 
    label: 'GPT-5.2 Mini', 
    identifier: 'gpt-5.2-mini', 
    value: 'gpt-5.2-mini', 
    description: 'GPT-5.2 optimized version',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'GPT-5.2 Turbo', 
    identifier: 'gpt-5.2-turbo', 
    value: 'gpt-5.2-turbo', 
    description: 'GPT-5.2 turbo version',
    maxTokens: 200000,
    contextWindow: 1000000,
    provider: 'openai'
  },
  { 
    label: 'GPT-5.2 Turbo Preview', 
    identifier: 'gpt-5.2-turbo-preview', 
    value: 'gpt-5.2-turbo-preview', 
    description: 'GPT-5.2 turbo preview',
    maxTokens: 200000,
    contextWindow: 1000000,
    provider: 'openai'
  },
  
  // GPT-4o Series
  { 
    label: 'GPT-4o', 
    identifier: 'gpt-4o', 
    value: 'gpt-4o', 
    description: 'Most capable, multimodal flagship model',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4o Mini', 
    identifier: 'gpt-4o-mini', 
    value: 'gpt-4o-mini', 
    description: 'Affordable and intelligent small model',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4o Nano', 
    identifier: 'gpt-4o-nano', 
    value: 'gpt-4o-nano', 
    description: 'Ultra-efficient, lightweight model',
    maxTokens: 16000,
    contextWindow: 16000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4o 16k', 
    identifier: 'gpt-4o-16k', 
    value: 'gpt-4o-16k', 
    description: 'GPT-4o with 16k context',
    maxTokens: 16000,
    contextWindow: 16000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4o 32k', 
    identifier: 'gpt-4o-32k', 
    value: 'gpt-4o-32k', 
    description: 'GPT-4o with 32k context',
    maxTokens: 32000,
    contextWindow: 32000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4o 64k', 
    identifier: 'gpt-4o-64k', 
    value: 'gpt-4o-64k', 
    description: 'GPT-4o with 64k context',
    maxTokens: 64000,
    contextWindow: 64000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4o 128k', 
    identifier: 'gpt-4o-128k', 
    value: 'gpt-4o-128k', 
    description: 'GPT-4o with 128k context',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4o 256k', 
    identifier: 'gpt-4o-256k', 
    value: 'gpt-4o-256k', 
    description: 'GPT-4o with 256k context',
    maxTokens: 256000,
    contextWindow: 256000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4o 512k', 
    identifier: 'gpt-4o-512k', 
    value: 'gpt-4o-512k', 
    description: 'GPT-4o with 512k context',
    maxTokens: 512000,
    contextWindow: 512000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4o 1024k', 
    identifier: 'gpt-4o-1024k', 
    value: 'gpt-4o-1024k', 
    description: 'GPT-4o with 1024k context',
    maxTokens: 1024000,
    contextWindow: 1024000,
    provider: 'openai'
  },
  
  // GPT-4.1 Series
  { 
    label: 'GPT-4.1', 
    identifier: 'gpt-4.1', 
    value: 'gpt-4.1', 
    description: 'Enhanced GPT-4 model',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4.1 Nano', 
    identifier: 'gpt-4.1-nano', 
    value: 'gpt-4.1-nano', 
    description: 'GPT-4.1 nano version',
    maxTokens: 16000,
    contextWindow: 16000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4.1 Mini', 
    identifier: 'gpt-4.1-mini', 
    value: 'gpt-4.1-mini', 
    description: 'GPT-4.1 mini version',
    maxTokens: 32000,
    contextWindow: 32000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4.1 Turbo', 
    identifier: 'gpt-4.1-turbo', 
    value: 'gpt-4.1-turbo', 
    description: 'GPT-4.1 optimized version',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4.1 Preview', 
    identifier: 'gpt-4.1-preview', 
    value: 'gpt-4.1-preview', 
    description: 'GPT-4.1 preview version',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  
  // GPT-4 Series
  { 
    label: 'GPT-4 Turbo', 
    identifier: 'gpt-4-turbo', 
    value: 'gpt-4-turbo', 
    description: 'Latest GPT-4 Turbo',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4 Turbo Preview', 
    identifier: 'gpt-4-turbo-preview', 
    value: 'gpt-4-turbo-preview', 
    description: 'GPT-4 Turbo preview',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'GPT-4', 
    identifier: 'gpt-4', 
    value: 'gpt-4', 
    description: 'Latest GPT-4 model',
    maxTokens: 8192,
    contextWindow: 8192,
    provider: 'openai'
  },
  { 
    label: 'GPT-4 32k', 
    identifier: 'gpt-4-32k', 
    value: 'gpt-4-32k', 
    description: '32k context window',
    maxTokens: 32768,
    contextWindow: 32768,
    provider: 'openai'
  },
  { 
    label: 'GPT-4 Vision', 
    identifier: 'gpt-4-vision-preview', 
    value: 'gpt-4-vision-preview', 
    description: 'GPT-4 with vision capabilities',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  
  // GPT-3.5 Series
  { 
    label: 'GPT-3.5', 
    identifier: 'gpt-3.5', 
    value: 'gpt-3.5', 
    description: 'GPT-3.5 model',
    maxTokens: 4096,
    contextWindow: 4096,
    provider: 'openai'
  },
  { 
    label: 'GPT-3.5 Turbo', 
    identifier: 'gpt-3.5-turbo', 
    value: 'gpt-3.5-turbo', 
    description: 'Latest GPT-3.5 Turbo',
    maxTokens: 4096,
    contextWindow: 4096,
    provider: 'openai'
  },
  { 
    label: 'GPT-3.5 Turbo 16k', 
    identifier: 'gpt-3.5-turbo-16k', 
    value: 'gpt-3.5-turbo-16k', 
    description: 'GPT-3.5 Turbo with 16k context',
    maxTokens: 16384,
    contextWindow: 16384,
    provider: 'openai'
  },
  { 
    label: 'GPT-3.5 Turbo Instruct', 
    identifier: 'gpt-3.5-turbo-instruct', 
    value: 'gpt-3.5-turbo-instruct', 
    description: 'Instruction-following model',
    maxTokens: 4096,
    contextWindow: 4096,
    provider: 'openai'
  },
  
  // O1 Series
  { 
    label: 'O1', 
    identifier: 'o1', 
    value: 'o1', 
    description: 'Advanced reasoning model',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'O1 Preview', 
    identifier: 'o1-preview', 
    value: 'o1-preview', 
    description: 'O1 preview version',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  },
  { 
    label: 'O1 Mini', 
    identifier: 'o1-mini', 
    value: 'o1-mini', 
    description: 'Faster, cheaper reasoning model',
    maxTokens: 128000,
    contextWindow: 128000,
    provider: 'openai'
  }
];

// Google Gemini Models
export const GEMINI_MODELS: AIModel[] = [
  {
    label: 'Gemini 2.0 Flash',
    identifier: 'gemini-2.0-flash-exp',
    value: 'gemini-2.0-flash-exp',
    description: 'Latest Gemini 2.0 Flash experimental model',
    maxTokens: 8192,
    contextWindow: 1000000,
    provider: 'gemini'
  },
  {
    label: 'Gemini 1.5 Pro',
    identifier: 'gemini-1.5-pro',
    value: 'gemini-1.5-pro',
    description: 'Most capable Gemini model with 2M context',
    maxTokens: 8192,
    contextWindow: 2000000,
    provider: 'gemini'
  },
  {
    label: 'Gemini 1.5 Flash',
    identifier: 'gemini-1.5-flash',
    value: 'gemini-1.5-flash',
    description: 'Fast and efficient Gemini model',
    maxTokens: 8192,
    contextWindow: 1000000,
    provider: 'gemini'
  },
  {
    label: 'Gemini 1.5 Flash-8B',
    identifier: 'gemini-1.5-flash-8b',
    value: 'gemini-1.5-flash-8b',
    description: 'Smaller, faster Gemini Flash model',
    maxTokens: 8192,
    contextWindow: 1000000,
    provider: 'gemini'
  },
  {
    label: 'Gemini 1.0 Pro',
    identifier: 'gemini-1.0-pro',
    value: 'gemini-1.0-pro',
    description: 'Original Gemini Pro model',
    maxTokens: 2048,
    contextWindow: 32760,
    provider: 'gemini'
  }
];

// Anthropic Claude Models
export const CLAUDE_MODELS: AIModel[] = [
  {
    label: 'Claude 3.5 Sonnet',
    identifier: 'claude-3-5-sonnet-20241022',
    value: 'claude-3-5-sonnet-20241022',
    description: 'Most intelligent Claude model',
    maxTokens: 8192,
    contextWindow: 200000,
    provider: 'claude'
  },
  {
    label: 'Claude 3.5 Haiku',
    identifier: 'claude-3-5-haiku-20241022',
    value: 'claude-3-5-haiku-20241022',
    description: 'Fastest Claude model for everyday tasks',
    maxTokens: 8192,
    contextWindow: 200000,
    provider: 'claude'
  },
  {
    label: 'Claude 3 Opus',
    identifier: 'claude-3-opus-20240229',
    value: 'claude-3-opus-20240229',
    description: 'Most powerful Claude model for complex tasks',
    maxTokens: 4096,
    contextWindow: 200000,
    provider: 'claude'
  },
  {
    label: 'Claude 3 Sonnet',
    identifier: 'claude-3-sonnet-20240229',
    value: 'claude-3-sonnet-20240229',
    description: 'Balanced Claude model for various tasks',
    maxTokens: 4096,
    contextWindow: 200000,
    provider: 'claude'
  },
  {
    label: 'Claude 3 Haiku',
    identifier: 'claude-3-haiku-20240307',
    value: 'claude-3-haiku-20240307',
    description: 'Fastest Claude model',
    maxTokens: 4096,
    contextWindow: 200000,
    provider: 'claude'
  }
];

// All models combined
export const ALL_AI_MODELS: AIModel[] = [
  ...OPENAI_MODELS,
  ...GEMINI_MODELS,
  ...CLAUDE_MODELS
];

// Helper functions
export const getModelByIdentifier = (identifier: string): AIModel | undefined => {
  return ALL_AI_MODELS.find(model => model.identifier === identifier || model.value === identifier);
};

export const getMaxTokensForModel = (identifier: string): number => {
  const model = getModelByIdentifier(identifier);
  return model?.maxTokens || 4096; // Default fallback
};

export const getContextWindowForModel = (identifier: string): number => {
  const model = getModelByIdentifier(identifier);
  return model?.contextWindow || 4096; // Default fallback
};

export const getModelsByProvider = (provider: 'openai' | 'gemini' | 'claude'): AIModel[] => {
  return ALL_AI_MODELS.filter(model => model.provider === provider);
};

export const getProviderFromSourceKind = (sourceKind: string): 'openai' | 'gemini' | 'claude' | null => {
  switch (sourceKind.toLowerCase()) {
    case 'openai':
      return 'openai';
    case 'google':
      return 'gemini';
    case 'claudeai':
      return 'claude';
    default:
      return null;
  }
};

// For OpenAITargetConfig.vue (uses identifier) - keeping for backward compatibility
export const OPENAI_MODEL_OPTIONS = OPENAI_MODELS.map(model => ({
  label: model.label,
  identifier: model.identifier
}));

// For AIAgentForm.vue (uses value and description) - keeping for backward compatibility
export const AVAILABLE_MODELS = OPENAI_MODELS.map(model => ({
  label: model.label,
  value: model.value || model.identifier,
  description: model.description || ''
}));
