import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { emitAIProviderErrorEvent } from './platform-events';

// Define interfaces for better type safety
interface AIServiceOptions {
  model: string;
  messages: any[];
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  max_tokens?: number;
  tools?: any[];
  response_format?: any;
  unsafeUserContext?: Record<string, string>;
  stream?: boolean;
}

function createGeminiService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  const apiKey = authentication.token;

  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  const client = new GoogleGenerativeAI(apiKey);

  function buildGeminiPayload(options: AIServiceOptions) {
    const modelName = options.model || source.metadata.defaultModel || 'gemini-1.5-pro-latest';
    const messages = options.unsafeUserContext
      ? getMessagesWithUserContext(options.messages, options.unsafeUserContext)
      : options.messages;

    const { contents, systemInstruction } = transformMessagesToGemini(messages);
    const tools = transformToolsToGemini(options.tools);
    const generationConfig = compactObject({
      temperature: options.temperature,
      topP: options.top_p,
      maxOutputTokens: options.max_tokens,
      stopSequences: options.stop,
      responseMimeType: options.response_format?.type === 'json_object' ? 'application/json' : undefined,
      presencePenalty: options.presence_penalty,
      frequencyPenalty: options.frequency_penalty,
    });

    return {
      modelName,
      payload: compactObject({
        contents,
        tools,
        systemInstruction,
        generationConfig: Object.keys(generationConfig).length ? generationConfig : undefined,
      }),
    };
  }

  return {
    async createChatCompletion(options: AIServiceOptions) {
      const { modelName, payload } = buildGeminiPayload(options);
      const model = client.getGenerativeModel({ model: modelName });

      try {
        const result = await model.generateContent(payload);
        const response = result.response ?? result;
        return transformGeminiResponseToOpenAI(response, modelName);
      } catch (error: any) {
        logger.error('Error creating chat completion with Gemini', error);
        emitAIProviderErrorEvent({
          tenant: source.tenant,
          provider: source.kind,
          sourceId: source._id,
          stream: false,
          model: modelName,
          context: options.unsafeUserContext,
          error,
        });
        throw error;
      }
    },

    async createChatCompletionStream(options: AIServiceOptions) {
      const { modelName, payload } = buildGeminiPayload(options);
      const model = client.getGenerativeModel({ model: modelName });

      try {
        const result = await model.generateContentStream(payload);
        return createGeminiStreamGenerator(result.stream, modelName);
      } catch (error: any) {
        logger.error('Error creating chat completion stream with Gemini', error);
        emitAIProviderErrorEvent({
          tenant: source.tenant,
          provider: source.kind,
          sourceId: source._id,
          stream: true,
          model: modelName,
          context: options.unsafeUserContext,
          error,
        });
        throw error;
      }
    }
  };
}

interface AIServiceSource {
  kind: string;
  tenant: string;
  _id?: string;
  metadata: {
    apiKey?: string;
    apiUrl?: string;
    defaultModel?: string;
    organizationId?: string;
  };
}

interface AIServiceAuthentication {
  token?: string;
}

function getMessagesWithUserContext(messages: any[], unsafeUserContext: Record<string, string>) {
  const firstUserMessageIndex = messages.findIndex(msg => msg.role === 'user');
  if (firstUserMessageIndex > -1) {
    messages = [
      ...messages.slice(0, firstUserMessageIndex),
      { role: 'user', content: `Context given by user to this chat: ${JSON.stringify(unsafeUserContext)}` },
      ...messages.slice(firstUserMessageIndex)
    ];
  }
  return messages;
}
    
function compactObject<T extends Record<string, any>>(obj: T): T {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    ) {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as T);
}

export function createAIService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  // Determine which AI provider to use based on source.kind
  switch (source.kind) {
    case 'openai':
      return createOpenAIService(source, authentication);
    case 'anthropic':
      return createAnthropicService(source, authentication);
    case 'gemini':
      return createGeminiService(source, authentication);
    // Add more providers as needed
    default:
      throw new Error(`Unsupported AI provider: ${source.kind}`);
  }
}

function transformMessagesToGemini(messages: any[]) {
  const systemParts: string[] = [];
  const contents: any[] = [];

  messages.forEach((message) => {
    if (!message) {
      return;
    }

    if (message.role === 'system') {
      const systemText = extractTextContent(message.content);
      if (systemText) {
        systemParts.push(systemText);
      }
      return;
    }

    if (message.role === 'tool' || message.role === 'function') {
      contents.push({
        role: 'tool',
        parts: [
          {
            functionResponse: {
              name: message.name || message.tool_call_id || 'tool',
              response: safeJsonParse(message.content) ?? { result: message.content },
            },
          },
        ],
      });
      return;
    }

    if (message.role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      contents.push({
        role: 'model',
        parts: message.tool_calls.map((toolCall: any) => ({
          functionCall: {
            name: toolCall.function?.name || 'function',
            args: safeJsonParse(toolCall.function?.arguments, {}),
          },
        })),
      });
      return;
    }

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: convertContentToGeminiParts(message.content),
    });
  });

  if (!contents.length) {
    contents.push({
      role: 'user',
      parts: [{ text: '' }],
    });
  }

  const systemInstruction = systemParts.length
    ? {
        role: 'system',
        parts: [{ text: systemParts.join('\n\n') }],
      }
    : undefined;

  return { contents, systemInstruction };
}

function convertContentToGeminiParts(content: any) {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  if (Array.isArray(content)) {
    const parts = content
      .map((part) => {
        if (typeof part === 'string') {
          return { text: part };
        }
        if (part?.type === 'text' && part.text) {
          return { text: part.text };
        }
        if (part?.text) {
          return { text: part.text };
        }
        return part ? { text: JSON.stringify(part) } : null;
      })
      .filter(Boolean);

    return parts.length ? parts : [{ text: '' }];
  }

  if (content && typeof content === 'object') {
    return [{ text: JSON.stringify(content) }];
  }

  return [{ text: '' }];
}

function transformToolsToGemini(tools?: any[]) {
  if (!Array.isArray(tools) || !tools.length) {
    return undefined;
  }

  const functionDeclarations = tools
    .filter((tool) => tool?.type === 'function' && tool.function?.name)
    .map((tool) =>
      compactObject({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      }),
    );

  if (!functionDeclarations.length) {
    return undefined;
  }

  return [{ functionDeclarations }];
}

function transformGeminiResponseToOpenAI(response: any, modelName: string) {
  const candidate = response?.candidates?.[0];
  if (!candidate) {
    throw new Error('Gemini did not return any candidates');
  }

  const message = convertGeminiContentToOpenAI(candidate.content);

  return {
    id: response.responseId || `gemini-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: modelName,
    choices: [
      {
        index: 0,
        message,
        finish_reason: mapGeminiFinishReason(candidate.finishReason, message.tool_calls),
      },
    ],
    usage: transformGeminiUsage(response.usageMetadata),
  };
}

function convertGeminiContentToOpenAI(content: any) {
  const message: any = {
    role: 'assistant',
    content: '',
  };

  if (!content?.parts) {
    return message;
  }

  const textParts: string[] = [];
  const toolCalls: any[] = [];

  content.parts.forEach((part: any, index: number) => {
    if (part?.text) {
      textParts.push(part.text);
    } else if (part?.functionCall) {
      toolCalls.push({
        id: `call_${part.functionCall.name || 'function'}_${Date.now()}_${index}`,
        type: 'function',
        function: {
          name: part.functionCall.name || 'function',
          arguments: JSON.stringify(part.functionCall.args ?? {}),
        },
      });
    }
  });

  message.content = textParts.join('') || null;

  if (toolCalls.length) {
    message.tool_calls = toolCalls;
  }

  return message;
}

function transformGeminiUsage(usage?: any) {
  if (!usage) {
    return undefined;
  }

  return {
    prompt_tokens: usage.promptTokenCount ?? 0,
    completion_tokens: usage.candidatesTokenCount ?? usage.totalTokenCount ?? 0,
    total_tokens: usage.totalTokenCount ?? (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0),
  };
}

function mapGeminiFinishReason(reason?: string, toolCalls?: any[]) {
  if (toolCalls?.length) {
    return 'tool_calls';
  }

  switch (reason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
    case 'RECITATION':
    case 'BLOCKLIST':
      return 'content_filter';
    default:
      return reason?.toLowerCase() || 'stop';
  }
}

async function* createGeminiStreamGenerator(stream: AsyncIterable<any>, modelName: string) {
  for await (const chunk of stream) {
    const candidate = chunk?.candidates?.[0];
    if (!candidate) {
      continue;
    }

    const delta: any = {};
    const textParts: string[] = [];
    const toolCalls: any[] = [];

    candidate.content?.parts?.forEach((part: any, index: number) => {
      if (part?.text) {
        textParts.push(part.text);
      } else if (part?.functionCall) {
        toolCalls.push({
          id: `call_${part.functionCall.name || 'function'}_${Date.now()}_${index}`,
          type: 'function',
          function: {
            name: part.functionCall.name || 'function',
            arguments: JSON.stringify(part.functionCall.args ?? {}),
          },
        });
      }
    });

    if (textParts.length) {
      delta.content = textParts.join('');
    }

    if (toolCalls.length) {
      delta.tool_calls = toolCalls;
    }

    const finishReason = toolCalls.length ? 'tool_calls' : mapGeminiFinishReason(candidate.finishReason);

    yield {
      id: chunk.responseId || `gemini-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: finishReason === 'stop' ? null : finishReason || null,
        },
      ],
    };
  }
}

function extractTextContent(content: any) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text))
      .filter(Boolean)
      .join('\n');
  }

  if (content && typeof content === 'object') {
    return JSON.stringify(content);
  }

  return '';
}

function safeJsonParse(value: any, fallback?: any) {
  if (typeof value !== 'string') {
    return value ?? fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback ?? value;
  }
}

function createOpenAIService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  // Get API key from authentication or source metadata
  const apiKey = authentication.token;
  const organizationId = source.metadata.organizationId;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  // Create OpenAI client instance with timeout
  const openai = new OpenAI({
    apiKey: apiKey,
    organization: organizationId,
    baseURL: source.metadata.apiUrl, // Will use default if not provided
    timeout: 120000, // 2 minute timeout for OpenAI API calls
  });
  
  return {
    async createChatCompletion(options: AIServiceOptions) {
      try {
        const messages = options.unsafeUserContext ? getMessagesWithUserContext(options.messages, options.unsafeUserContext) : options.messages;
        const response = await openai.chat.completions.create({
          model: options.model || source.metadata.defaultModel || 'gpt-4.1',
          messages,
          temperature: options.temperature,
          top_p: options.top_p,
          frequency_penalty: options.frequency_penalty,
          presence_penalty: options.presence_penalty,
          stop: options.stop,
          max_tokens: options.max_tokens,
          tools: options.tools,
          response_format: options.response_format,
          stream: false
        });
        
        return response;
      } catch (error: any) {
        logger.error('Error creating chat completion', error);
        emitAIProviderErrorEvent({
          tenant: source.tenant,
          provider: source.kind,
          sourceId: source._id,
          stream: false,
          model: options.model || source.metadata.defaultModel || 'gpt-4.1',
          context: options.unsafeUserContext,
          error,
        });
        throw error;
      }
    },
    
    async createChatCompletionStream(options: AIServiceOptions) {
      try {
        const messages = options.unsafeUserContext ? getMessagesWithUserContext(options.messages, options.unsafeUserContext) : options.messages;
        const stream = await openai.chat.completions.create({
          model: options.model || source.metadata.defaultModel || 'gpt-4.1',
          messages,
          temperature: options.temperature,
          top_p: options.top_p,
          frequency_penalty: options.frequency_penalty,
          presence_penalty: options.presence_penalty,
          stop: options.stop,
          max_tokens: options.max_tokens,
          tools: options.tools,
          response_format: options.response_format,
          stream: true
        });
        
        return stream;
      } catch (error: any) {
        logger.error('Error creating chat completion stream', error);
        emitAIProviderErrorEvent({
          tenant: source.tenant,
          provider: source.kind,
          sourceId: source._id,
          stream: true,
          model: options.model || source.metadata.defaultModel || 'gpt-4.1',
          context: options.unsafeUserContext,
          error,
        });
        throw error;
      }
    }
  };
}

function createAnthropicService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  // Get API key from authentication or source metadata
  const apiKey = authentication.token;
  
  if (!apiKey) {
    throw new Error('Anthropic API key is required');
  }
  
  // Create Anthropic client instance with timeout
  const anthropic = new Anthropic({
    apiKey,
    baseURL: source.metadata.apiUrl, // Will use default if not provided
    timeout: 120000, // 2 minute timeout for Anthropic API calls
  });
  
  return {
    async createChatCompletion(options: AIServiceOptions) {
      try {
        const originalMessages = options.unsafeUserContext
          ? getMessagesWithUserContext(options.messages, options.unsafeUserContext)
          : options.messages;
        const { system, messages } = transformMessagesToAnthropicSDK(originalMessages);
        const tools = transformToolsToAnthropic(options.tools);
        
        const response = await anthropic.messages.create({
          model: options.model || source.metadata.defaultModel || 'claude-3-opus-20240229',
          system,
          messages,
          temperature: options.temperature,
          top_p: options.top_p,
          max_tokens: options.max_tokens || 4000,
          stream: false,
          tools,
        });
        
        // Transform Anthropic response to OpenAI format for consistency
        return transformAnthropicResponseToOpenAI(response);
      } catch (error: any) {
        logger.error('Error creating chat completion with Anthropic', error);
        emitAIProviderErrorEvent({
          tenant: source.tenant,
          provider: source.kind,
          sourceId: source._id,
          stream: false,
          model: options.model || source.metadata.defaultModel || 'claude-3-opus-20240229',
          context: options.unsafeUserContext,
          error,
        });
        throw error;
      }
    },
    
    async createChatCompletionStream(options: AIServiceOptions) {
      try {
        const originalMessages = options.unsafeUserContext
          ? getMessagesWithUserContext(options.messages, options.unsafeUserContext)
          : options.messages;
        const { system, messages } = transformMessagesToAnthropicSDK(originalMessages);
        const tools = transformToolsToAnthropic(options.tools);
        
        const stream = await anthropic.messages.create({
          model: options.model || source.metadata.defaultModel || 'claude-3-opus-20240229',
          system,
          messages,
          temperature: options.temperature,
          top_p: options.top_p,
          max_tokens: options.max_tokens || 4000,
          stream: true,
          tools,
        });
        
        return createAnthropicSDKStreamGenerator(stream);
      } catch (error: any) {
        logger.error('Error creating chat completion stream with Anthropic', error);
        emitAIProviderErrorEvent({
          tenant: source.tenant,
          provider: source.kind,
          sourceId: source._id,
          stream: true,
          model: options.model || source.metadata.defaultModel || 'claude-3-opus-20240229',
          context: options.unsafeUserContext,
          error,
        });
        throw error;
      }
    }
  };
}

// Helper function to transform OpenAI message format to Anthropic SDK format
function transformMessagesToAnthropicSDK(messages: any[]) {
  const systemParts: string[] = [];
  const transformedMessages: any[] = [];

  messages.forEach((msg) => {
    if (!msg) {
      return;
    }

    if (msg.role === 'system') {
      const systemText = extractTextContent(msg.content);
      if (systemText) {
        systemParts.push(systemText);
      }
      return;
    }

    if (msg.role === 'tool') {
      transformedMessages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: msg.tool_call_id || msg.id || 'tool_result',
            content: [{ type: 'text', text: extractTextContent(msg.content) }],
          },
        ],
      });
      return;
    }

    if (msg.role === 'assistant') {
      const contentBlocks: any[] = [];
      const textContent = extractTextContent(msg.content);
      if (textContent) {
        contentBlocks.push({ type: 'text', text: textContent });
      }

      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        msg.tool_calls.forEach((toolCall: any) => {
          if (!toolCall?.function?.name) {
            return;
          }
          contentBlocks.push({
            type: 'tool_use',
            id: toolCall.id || `tooluse_${toolCall.function.name}_${Date.now()}`,
            name: toolCall.function.name,
            input: safeJsonParse(toolCall.function.arguments, {}),
          });
        });
      }

      transformedMessages.push({
        role: 'assistant',
        content: contentBlocks.length ? contentBlocks : [{ type: 'text', text: '' }],
      });
      return;
    }

    transformedMessages.push({
      role: 'user',
      content: [{ type: 'text', text: extractTextContent(msg.content) }],
    });
  });

  if (!transformedMessages.length) {
    transformedMessages.push({
      role: 'user',
      content: [{ type: 'text', text: '' }],
    });
  }

  return {
    system: systemParts.length ? systemParts.join('\n\n') : undefined,
    messages: transformedMessages,
  };
}

// Helper function to transform Anthropic response to OpenAI format
function transformAnthropicResponseToOpenAI(response: any) {
  const { content, tool_calls } = convertAnthropicContentToOpenAI(response.content);

  return {
    id: response.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: compactObject({
          role: 'assistant',
          content: content ?? null,
          tool_calls: tool_calls.length ? tool_calls : undefined,
        }),
        finish_reason: mapAnthropicFinishReason(response.stop_reason, tool_calls.length > 0),
      },
    ],
    usage: response.usage
      ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
        }
      : undefined,
  };
}

// Create an async generator for Anthropic SDK streaming responses
async function* createAnthropicSDKStreamGenerator(stream: any) {
  let currentMessageId: string | null = null;
  let currentModel: string | null = null;
  let finishReason: string | null = null;
  let hasToolCalls = false;
  const toolCallState = new Map<
    number,
    { id: string; name: string; argumentsParts: string[] }
  >();

  const createChunk = (delta: any, finish?: string | null) => ({
    id: currentMessageId || `anthropic-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: currentModel || 'anthropic',
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finish ?? null,
      },
    ],
  });

  for await (const event of stream) {
    switch (event.type) {
      case 'message_start':
        currentMessageId = event.message?.id || currentMessageId;
        currentModel = event.message?.model || currentModel;
        break;
      case 'content_block_start':
        if (event.content_block?.type === 'tool_use') {
          const blockIndex = event.index ?? event.content_block_index ?? toolCallState.size;
          const input = event.content_block.input
            ? JSON.stringify(event.content_block.input)
            : '';
          const state = {
            id: event.content_block.id || `tooluse_${blockIndex}`,
            name: event.content_block.name || 'function',
            argumentsParts: input ? [input] : [],
          };
          toolCallState.set(blockIndex, state);
          if (input) {
            hasToolCalls = true;
            yield createChunk({
              tool_calls: [
                {
                  id: state.id,
                  type: 'function',
                  function: {
                    name: state.name,
                    arguments: input,
                  },
                },
              ],
            });
          }
        }
        break;
      case 'content_block_delta':
        if (event.delta?.type === 'text_delta') {
          const text = event.delta.text || '';
          if (text) {
            yield createChunk({ content: text });
          }
        } else if (event.delta?.type === 'input_json_delta') {
          const blockIndex = event.index ?? event.content_block_index;
          const partial = event.delta.partial_json || '';
          if (partial && blockIndex !== undefined && toolCallState.has(blockIndex)) {
            const state = toolCallState.get(blockIndex)!;
            state.argumentsParts.push(partial);
            hasToolCalls = true;
            yield createChunk({
              tool_calls: [
                {
                  id: state.id,
                  type: 'function',
                  function: {
                    name: state.name,
                    arguments: partial,
                  },
                },
              ],
            });
          }
        }
        break;
      case 'message_delta':
        if (event.delta?.stop_reason) {
          finishReason = mapAnthropicFinishReason(event.delta.stop_reason, hasToolCalls);
        }
        break;
      case 'content_block_stop':
        if (event.index !== undefined && toolCallState.has(event.index)) {
          toolCallState.delete(event.index);
        }
        break;
      case 'message_stop':
        yield createChunk({}, finishReason || (hasToolCalls ? 'tool_calls' : 'stop'));
        break;
      default:
        break;
    }
  }
}

function transformToolsToAnthropic(tools?: any[]) {
  if (!Array.isArray(tools) || !tools.length) {
    return undefined;
  }

  const mapped = tools
    .filter((tool) => tool?.type === 'function' && tool.function?.name)
    .map((tool) =>
      compactObject({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters || {
          type: 'object',
          properties: {},
        },
      }),
    );

  return mapped.length ? mapped : undefined;
}

function convertAnthropicContentToOpenAI(contentBlocks: any[] = []) {
  const textParts: string[] = [];
  const toolCalls: any[] = [];

  contentBlocks.forEach((block) => {
    if (!block) {
      return;
    }

    if (block.type === 'text' && block.text !== undefined) {
      textParts.push(block.text);
      return;
    }

    if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id || `tooluse_${block.name || 'function'}`,
        type: 'function',
        function: {
          name: block.name || 'function',
          arguments: JSON.stringify(block.input ?? {}),
        },
      });
    }
  });

  return {
    content: textParts.length ? textParts.join('') : undefined,
    tool_calls: toolCalls,
  };
}

function mapAnthropicFinishReason(reason?: string, hasToolCalls: boolean = false) {
  if (hasToolCalls) {
    return 'tool_calls';
  }

  switch (reason) {
    case 'end_turn':
    case 'stop':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_calls';
    default:
      return reason || 'stop';
  }
}
