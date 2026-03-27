import { createAnthropicService } from './anthropic';
import { createGeminiService } from './gemini';
import { createOpenAIService } from './openai';
import type { AIServiceAuthentication, AIServiceSource } from './types';

export type { AIServiceAuthentication, AIServiceOptions, AIServiceSource } from './types';

export function createAIService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  switch (source.kind) {
    case 'openai':
      return createOpenAIService(source, authentication);
    case 'claudeai':
      return createAnthropicService(source, authentication);
    case 'gemini':
      return createGeminiService(source, authentication);
    default:
      throw new Error(`Unsupported AI provider: ${source.kind}`);
  }
}
