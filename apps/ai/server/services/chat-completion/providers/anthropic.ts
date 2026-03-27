import Anthropic from '@anthropic-ai/sdk';
import logger from '../../logger';
import { emitAIProviderErrorEvent, emitTokenUsageEvent } from '../../platform-events';
import { compactObject, extractTextContent, getMessagesWithUserContext, safeJsonParse } from './shared';
import type { AIServiceAuthentication, AIServiceOptions, AIServiceSource } from './types';

export function createAnthropicService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  const apiKey = authentication.token;

  if (!apiKey) {
    throw new Error('Anthropic API key is required');
  }

  const anthropic = new Anthropic({
    apiKey,
    baseURL: source.metadata.apiUrl,
    timeout: 120000,
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

        const transformedResponse = transformAnthropicResponseToOpenAI(response);

        if (response.usage && options.loggingContext?.tenant) {
          emitTokenUsageEvent({
            tenant: options.loggingContext.tenant,
            userId: options.loggingContext.userId,
            provider: source.kind,
            sourceId: source._id,
            integrationId: options.loggingContext.integrationId,
            integrationName: options.loggingContext.integrationName,
            model: response.model,
            usage: {
              prompt_tokens: response.usage.input_tokens,
              completion_tokens: response.usage.output_tokens,
              total_tokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
            },
            stream: false,
            context: options.loggingContext,
          });
        }

        return transformedResponse;
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

        return createAnthropicSDKStreamGenerator(stream, options, source);
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
    },
  };
}

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

async function* createAnthropicSDKStreamGenerator(stream: any, options?: AIServiceOptions, source?: AIServiceSource) {
  let currentMessageId: string | null = null;
  let currentModel: string | null = null;
  let finishReason: string | null = null;
  let hasToolCalls = false;
  const toolCallState = new Map<number, { id: string; name: string; argumentsParts: string[] }>();
  let usageEmitted = false;

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
          const input = event.content_block.input ? JSON.stringify(event.content_block.input) : '';
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

        if (event.usage && !usageEmitted && options?.loggingContext?.tenant && source) {
          emitTokenUsageEvent({
            tenant: options.loggingContext.tenant,
            userId: options.loggingContext.userId,
            provider: source.kind,
            sourceId: source._id,
            integrationId: options.loggingContext.integrationId,
            integrationName: options.loggingContext.integrationName,
            model: currentModel || 'anthropic',
            usage: {
              prompt_tokens: event.usage.input_tokens,
              completion_tokens: event.usage.output_tokens,
              total_tokens: (event.usage.input_tokens || 0) + (event.usage.output_tokens || 0),
            },
            stream: true,
            context: options.loggingContext,
          });
          usageEmitted = true;
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
