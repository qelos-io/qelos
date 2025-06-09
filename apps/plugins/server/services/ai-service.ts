import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk"; // Ensure your SDK version is recent
import { IntegrationSourceKind } from "@qelos/global-types";

type AIAuthentication = {
  token: string;
};

type ChatMessageServiceInput = {
  role: 'system' | 'user' | 'assistant' | string;
  content?: any | null;
};

type AIServiceChatCompletionOptions = {
  model?: string;
  messages: ChatMessageServiceInput[];
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number; // OpenAI specific
  presence_penalty?: number;  // OpenAI specific
  stream?: boolean; // Service internal flag to differentiate call types
  max_tokens?: number;
  response_format?: { type: "text" | "json_object" }; // Primarily for OpenAI
  system?: string; // Explicit system prompt
};

/**
 * AI Service for handling different AI providers.
 */
export class AIService {
  private provider: OpenAI | Anthropic;
  private kind: IntegrationSourceKind;

  constructor(kind: IntegrationSourceKind, authentication: AIAuthentication) {
    this.kind = kind;
    if (!authentication || !authentication.token) {
      throw new Error(`Authentication token missing for provider: ${kind}`);
    }
    this.provider = this.initializeProvider(kind, authentication);
  }

  private initializeProvider(kind: IntegrationSourceKind, authentication: AIAuthentication): OpenAI | Anthropic {
    switch (kind) {
      case IntegrationSourceKind.OpenAI:
        return new OpenAI({ apiKey: authentication.token });
      case IntegrationSourceKind.ClaudeAi:
        return new Anthropic({ apiKey: authentication.token });
      default:
        throw new Error(`[AIService] Unsupported AI provider: ${kind}`);
    }
  }

  /**
   * Prepares OpenAI parameters for chat completion
   */
  private prepareOpenAIParams(options: AIServiceChatCompletionOptions, streaming: boolean): any {
    const { system, ...openaiSpecificOptions } = options;
    const openaiParams = {
      ...openaiSpecificOptions,
      messages: options.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      stream: streaming,
      model: options.model || 'gpt-3.5-turbo'
    };
    
    // Remove undefined values
    Object.keys(openaiParams).forEach(key => openaiParams[key] === undefined && delete openaiParams[key]);
    return openaiParams;
  }

  /**
   * Prepares Claude AI parameters for chat completion
   */
  private prepareClaudeParams(options: AIServiceChatCompletionOptions, streaming: boolean): {
    params: any,
    claudeUserAssistantMessages: Anthropic.Messages.MessageParam[],
    systemPrompt?: string
  } {
    const { model: requestedModel, messages, system, temperature, top_p, max_tokens } = options;
    
    // Determine the model to use
    let finalClaudeModel: string;
    const openAiModelPattern = /^(gpt-|text-(davinci|curie|babbage|ada)|dall-e)/i;
    if (!requestedModel || openAiModelPattern.test(requestedModel)) {
      finalClaudeModel = 'claude-3-7-sonnet-latest';
    } else {
      finalClaudeModel = requestedModel;
    }

    // Process messages and extract system prompt
    let systemPromptForClaude: string | undefined = system;
    const claudeUserAssistantMessages: Anthropic.Messages.MessageParam[] = [];
    
    messages.forEach(msg => {
      if (msg.role === 'system' && !systemPromptForClaude) {
        systemPromptForClaude = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        claudeUserAssistantMessages.push({ 
          role: msg.role as 'user' | 'assistant', 
          content: msg.content || "" 
        });
      }
    });
    
    // Validate that we have either messages or a system prompt
    if (claudeUserAssistantMessages.length === 0 && !systemPromptForClaude) {
      throw new Error(`[AIService Claude] Requires at least one user/assistant message or a system prompt.`);
    }

    // Prepare the parameters
    const claudeParams = {
      model: finalClaudeModel,
      messages: claudeUserAssistantMessages,
      max_tokens: max_tokens || (streaming ? 1024 : 8192),
      ...(streaming && { stream: true }),
      ...(systemPromptForClaude && { system: systemPromptForClaude }),
      temperature: temperature,
      top_p: top_p,
    };
    
    // Remove undefined values
    Object.keys(claudeParams).forEach(key => claudeParams[key] === undefined && delete claudeParams[key]);
    
    return { 
      params: claudeParams, 
      claudeUserAssistantMessages,
      systemPrompt: systemPromptForClaude 
    };
  }

  /**
   * Extract content from Claude AI response
   */
  private extractClaudeContent(sdkResponse: any): string | null {
    let extractedContent: string | null = null;
    if (sdkResponse.content && sdkResponse.content.length > 0) {
      const textBlock = sdkResponse.content.find(block => block.type === 'text');
      if (textBlock) {
        extractedContent = textBlock.text || null;
      }
    }
    return extractedContent;
  }

  /**
   * Handles chat completion with or without streaming
   */
  async chatCompletion(options: AIServiceChatCompletionOptions): Promise<any> {
    if (options.stream === true) {
      const { stream, ...restOptions } = options;
      // Streaming calls should directly use streamChatCompletion.
      // This path in chatCompletion (non-streaming) indicates a potential misuse.
      // For now, we'll re-route, but it's better if the caller uses the correct method.
      // The return type of streamChatCompletion (AsyncIterable) is different from this method's augmented SDK response.
      return this.streamChatCompletion(restOptions); // This will return a raw stream, not an augmented object.
    }

    try {
      if (this.kind === IntegrationSourceKind.OpenAI) {
        const openaiProvider = this.provider as OpenAI;
        const openaiParams = this.prepareOpenAIParams(options, false);
        
        const sdkResponse = await openaiProvider.chat.completions.create(openaiParams);
        const extractedContent = sdkResponse.choices?.[0]?.message?.content || null;
        return { ...sdkResponse, responseContent: extractedContent };

      } else if (this.kind === IntegrationSourceKind.ClaudeAi) {
        const claudeProvider = this.provider as Anthropic;
        const { params: claudeParams } = this.prepareClaudeParams(options, false);
        
        const sdkResponse = await claudeProvider.messages.create(claudeParams);
        const extractedContent = this.extractClaudeContent(sdkResponse);
        return { ...sdkResponse, responseContent: extractedContent };
      }
      throw new Error(`[AIService] Chat completion logic not implemented for provider: ${this.kind}`);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Handles streaming chat completion
   */
  async streamChatCompletion(options: Omit<AIServiceChatCompletionOptions, 'stream'>): Promise<any> {
    try {
      if (this.kind === IntegrationSourceKind.OpenAI) {
        const openaiProvider = this.provider as OpenAI;
        const openaiParams = this.prepareOpenAIParams(options, true);
        return openaiProvider.chat.completions.create(openaiParams);
      }

      if (this.kind === IntegrationSourceKind.ClaudeAi) {
        const claudeProvider = this.provider as Anthropic;
        const { params: claudeParams } = this.prepareClaudeParams(options, true);
        return await claudeProvider.messages.create(claudeParams);
      }
      throw new Error(`[AIService] Streaming chat completion not implemented for provider: ${this.kind}`);
    } catch (error: any) {
      throw error;
    }
  }
}

export function createAIService(kind: IntegrationSourceKind, authentication: AIAuthentication): AIService {
  return new AIService(kind, authentication);
}