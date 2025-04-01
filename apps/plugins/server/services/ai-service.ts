import OpenAI from "openai";
import { IntegrationSourceKind } from "@qelos/global-types";

/**
 * AI Service for handling different AI providers
 * Currently supports OpenAI, with plans to support Claude and Gemini in the future
 */
export class AIService {
  private provider: any;
  private kind: IntegrationSourceKind;

  constructor(kind: IntegrationSourceKind, authentication: any) {
    this.kind = kind;
    this.provider = this.initializeProvider(kind, authentication);
  }

  /**
   * Initialize the appropriate AI provider based on the integration source kind
   */
  private initializeProvider(kind: IntegrationSourceKind, authentication: any) {
    switch (kind) {
      case IntegrationSourceKind.OpenAI:
        return new OpenAI({
          apiKey: authentication.token
        });
      // Future support for other AI providers
      // case IntegrationSourceKind.Claude:
      //   return new Claude(authentication);
      // case IntegrationSourceKind.Gemini:
      //   return new Gemini(authentication);
      default:
        throw new Error(`Unsupported AI provider: ${kind}`);
    }
  }

  /**
   * Generic chat completion method that works with any supported AI provider
   */
  async chatCompletion(options: {
    model?: string;
    messages: any[];
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stream?: boolean;
    max_tokens?: number;
    response_format?: { type: string };
  }) {
    if (this.kind === IntegrationSourceKind.OpenAI) {
      return this.provider.chat.completions.create(options);
    }
    
    // Add support for other providers as they are implemented
    // if (this.kind === IntegrationSourceKind.Claude) {
    //   return this.provider.messages.create(options);
    // }
    
    throw new Error(`Chat completion not implemented for provider: ${this.kind}`);
  }

  /**
   * Stream chat completion for providers that support streaming
   */
  async streamChatCompletion(options: {
    model?: string;
    messages: any[];
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    max_tokens?: number;
    response_format?: { type: string };
  }) {
    if (this.kind === IntegrationSourceKind.OpenAI) {
      return this.provider.chat.completions.create({
        ...options,
        stream: true
      });
    }
    
    // Add support for other providers as they are implemented
    
    throw new Error(`Streaming not implemented for provider: ${this.kind}`);
  }
}

/**
 * Factory function to create an AI service instance
 */
export function createAIService(kind: IntegrationSourceKind, authentication: any): AIService {
  return new AIService(kind, authentication);
}
