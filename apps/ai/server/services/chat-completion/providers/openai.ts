import { OpenAI } from 'openai';
import { ResponseTextConfig } from 'openai/resources/responses/responses';
import logger from '../../logger';
import { emitAIProviderErrorEvent, emitTokenUsageEvent } from '../../platform-events';
import { compactObject, getMessagesWithUserContext } from './shared';
import type { AIServiceAuthentication, AIServiceOptions, AIServiceSource } from './types';

function openAIApiUrlHostname(apiUrl: string | undefined | null): string | null {
  const raw = apiUrl == null ? '' : String(apiUrl).trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    try {
      return new URL(`https://${raw}`).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
}

function useOpenAIResponsesApiForBaseUrl(apiUrl: string | undefined | null): boolean {
  const host = openAIApiUrlHostname(apiUrl);
  if (host == null) {
    return true;
  }
  return host === 'openai.com' || host.endsWith('.openai.com');
}

export function createOpenAIService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  const apiKey = authentication.token;
  const organizationId = source.metadata.organizationId;

  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    organization: organizationId,
    baseURL: source.metadata.apiUrl,
    timeout: 120000,
  });

  const useResponsesApi = useOpenAIResponsesApiForBaseUrl(source.metadata.apiUrl);

  function transformToInput(messages: any[]): string {
    if (messages.length === 0) return '';

    let conversation = '';

    for (const message of messages) {
      if (message.role === 'user') {
        conversation += `User: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        conversation += `Assistant: ${message.content}\n\n`;

        if (message.tool_calls && message.tool_calls.length > 0) {
          conversation += `Assistant called the following functions:\n`;
          for (const toolCall of message.tool_calls) {
            conversation += `- ${toolCall.function.name} with arguments: ${toolCall.function.arguments}\n`;
          }
          conversation += '\n';
        }
      } else if (message.role === 'tool' || message.role === 'function') {
        const toolCallId = message.tool_call_id;
        const functionName = message.name || (toolCallId && toolCallId.startsWith('call_') ? 'function' : 'tool');

        if (typeof message.content === 'string') {
          try {
            const parsedContent = JSON.parse(message.content);
            conversation += `Function result for ${functionName}:\n${JSON.stringify(parsedContent, null, 2)}\n\n`;
          } catch {
            conversation += `Function result for ${functionName}:\n${message.content}\n\n`;
          }
        } else {
          conversation += `Function result for ${functionName}:\n${JSON.stringify(message.content, null, 2)}\n\n`;
        }
      }
    }

    return conversation.trim();
  }

  function transformToInstructions(messages: any[]): string {
    return messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
  }

  function convertResponseFormatToOpenAIText(responseFormat: any): ResponseTextConfig {
    if (!responseFormat) {
      return { format: { type: 'text' } };
    }

    if (responseFormat === 'json_object') {
      return { format: { type: 'json_object' } };
    }

    return { format: responseFormat };
  }

  return {
    async createChatCompletion(options: AIServiceOptions) {
      const model = options.model || source.metadata.defaultModel || 'gpt-5.4';
      try {
        const messages = options.unsafeUserContext
          ? getMessagesWithUserContext(options.messages, options.unsafeUserContext)
          : options.messages;

        if (!useResponsesApi) {
          const chatTools = options.tools?.filter((tool) => tool && tool.type === 'function' && tool.function);
          const chatParams = compactObject({
            model,
            messages,
            temperature: options.temperature,
            top_p: options.top_p,
            max_tokens: options.max_tokens,
            frequency_penalty: options.frequency_penalty,
            presence_penalty: options.presence_penalty,
            stop: options.stop,
            tools: chatTools?.length ? chatTools : undefined,
            response_format: options.response_format,
            stream: false as const,
          });

          const response = await openai.chat.completions.create(chatParams as any);

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
                prompt_tokens: response.usage.prompt_tokens || 0,
                completion_tokens: response.usage.completion_tokens || 0,
                total_tokens: response.usage.total_tokens || 0,
              },
              stream: false,
              context: options.loggingContext,
            });
          }

          return response;
        }

        const transformedTools = options.tools?.filter((tool) => tool && tool.function).map((tool) => ({
          type: 'function' as const,
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
          strict: tool.function.strict,
        }));

        const customTools = options.tools?.filter((tool) => tool && tool.type !== 'function') || [];
        const allTools = [...(transformedTools || []), ...customTools];

        const transformedInput = options.input || transformToInput(messages);

        const responseFormat = convertResponseFormatToOpenAIText(options.response_format);

        let finalInput = transformedInput || 'Please continue based on the system instructions.';

        if (responseFormat.format?.type?.startsWith('json_') && !finalInput.includes('json')) {
          finalInput += `\n\nexpected response: json`;
        }

        const response = await openai.responses.create({
          model,
          instructions: transformToInstructions(messages),
          input: finalInput,
          tools: allTools,
          temperature: options.temperature,
          top_p: options.top_p,
          max_output_tokens: options.max_tokens,
          text: responseFormat,
          stream: false,
        });

        const transformedResponse = {
          id: response.id || `resp-${Date.now()}`,
          object: 'chat.completion' as const,
          created: Math.floor(Date.now() / 1000),
          model: response.model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant' as const,
                content:
                  (response.output as any[])?.find((item: any) => item.type === 'message')?.content?.[0]?.text || '',
                tool_calls: response.output
                  ?.filter((item: any) => item.type === 'function_call')
                  .map((item: any) => ({
                    id: item.id,
                    type: 'function' as const,
                    function: {
                      name: item.name,
                      arguments: item.arguments || '',
                    },
                  })),
              },
              finish_reason:
                response.status === 'completed'
                  ? ('stop' as const)
                  : response.output?.some((item: any) => item.type === 'function_call')
                    ? ('tool_calls' as const)
                    : ('stop' as const),
            },
          ],
          usage: response.usage
            ? {
                prompt_tokens: response.usage.input_tokens || 0,
                completion_tokens: response.usage.output_tokens || 0,
                total_tokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
              }
            : undefined,
        };

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
              prompt_tokens: response.usage.input_tokens || 0,
              completion_tokens: response.usage.output_tokens || 0,
              total_tokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
            },
            stream: false,
            context: options.loggingContext,
          });
        }

        return transformedResponse;
      } catch (error: any) {
        logger.error('Error creating chat completion', error);
        emitAIProviderErrorEvent({
          tenant: source.tenant,
          provider: source.kind,
          sourceId: source._id,
          stream: false,
          model,
          context: options.unsafeUserContext,
          error,
        });
        throw error;
      }
    },

    async createChatCompletionStream(options: AIServiceOptions) {
      const model = options.model || source.metadata.defaultModel || 'gpt-5.4';
      try {
        const messages = options.unsafeUserContext
          ? getMessagesWithUserContext(options.messages, options.unsafeUserContext)
          : options.messages;

        if (!useResponsesApi) {
          const chatTools = options.tools?.filter((tool) => tool && tool.type === 'function' && tool.function);
          const chatParams = compactObject({
            model,
            messages,
            temperature: options.temperature,
            top_p: options.top_p,
            max_tokens: options.max_tokens,
            frequency_penalty: options.frequency_penalty,
            presence_penalty: options.presence_penalty,
            stop: options.stop,
            tools: chatTools?.length ? chatTools : undefined,
            response_format: options.response_format,
            stream: true as const,
          });

          const stream = (await openai.chat.completions.create(chatParams as any)) as unknown as AsyncIterable<any>;

          async function* chatCompletionStreamWithUsage() {
            let usageEmitted = false;
            for await (const chunk of stream) {
              const u = (chunk as any).usage;
              if (u && !usageEmitted && options.loggingContext?.tenant) {
                usageEmitted = true;
                emitTokenUsageEvent({
                  tenant: options.loggingContext.tenant,
                  userId: options.loggingContext.userId,
                  provider: source.kind,
                  sourceId: source._id,
                  integrationId: options.loggingContext.integrationId,
                  integrationName: options.loggingContext.integrationName,
                  model: (chunk as any).model || model,
                  usage: {
                    prompt_tokens: u.prompt_tokens ?? 0,
                    completion_tokens: u.completion_tokens ?? 0,
                    total_tokens: u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0),
                  },
                  stream: true,
                  context: options.loggingContext,
                });
              }
              yield chunk;
            }
          }

          return chatCompletionStreamWithUsage();
        }

        const transformedTools = options.tools?.filter((tool) => tool && tool.function).map((tool) => ({
          type: 'function' as const,
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
          strict: tool.function.strict,
        }));

        const customTools = options.tools?.filter((tool) => tool && tool.type !== 'function') || [];
        const allTools = [...(transformedTools || []), ...customTools];

        const transformedInput = options.input || transformToInput(messages);

        const finalInput = transformedInput || 'Please continue based on the system instructions.';

        const stream = await openai.responses.create({
          model,
          instructions: transformToInstructions(messages),
          input: finalInput,
          tools: allTools,
          temperature: options.temperature,
          top_p: options.top_p,
          max_output_tokens: options.max_tokens,
          text: convertResponseFormatToOpenAIText(options.response_format),
          stream: true,
        });

        async function* createNormalizedStream(originalStream: any, streamOptions: AIServiceOptions) {
          let usageEmitted = false;
          let messageId = `resp-${Date.now()}`;
          let currentFunctionCall: any = null;
          let accumulatedContent = '';
          let buffer = '';
          let lastFlushTime = Date.now();

          function* flushBuffer() {
            if (buffer) {
              accumulatedContent += buffer;
              yield {
                id: messageId,
                object: 'chat.completion.chunk' as const,
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [
                  {
                    index: 0,
                    delta: { content: buffer },
                    finish_reason: null,
                  },
                ],
              };
              buffer = '';
              lastFlushTime = Date.now();
            }
          }

          for await (const chunk of originalStream) {
            if (chunk.usage && !usageEmitted && streamOptions.loggingContext?.tenant) {
              emitTokenUsageEvent({
                tenant: streamOptions.loggingContext.tenant,
                userId: streamOptions.loggingContext.userId,
                provider: source.kind,
                sourceId: source._id,
                integrationId: streamOptions.loggingContext.integrationId,
                integrationName: streamOptions.loggingContext.integrationName,
                model: chunk.model,
                usage: {
                  prompt_tokens: chunk.usage.input_tokens || 0,
                  completion_tokens: chunk.usage.output_tokens || 0,
                  total_tokens: (chunk.usage.input_tokens || 0) + (chunk.usage.output_tokens || 0),
                },
                stream: true,
                context: streamOptions.loggingContext,
              });
              usageEmitted = true;
            }

            if (chunk.type === 'response.output_text.delta') {
              const delta = chunk.delta || '';
              if (delta) {
                buffer += delta;

                const now = Date.now();
                const shouldFlush =
                  buffer.endsWith('\n') ||
                  buffer.endsWith('. ') ||
                  buffer.endsWith('! ') ||
                  buffer.endsWith('? ') ||
                  buffer.length >= 10 ||
                  now - lastFlushTime > 50;

                if (shouldFlush) {
                  yield* flushBuffer();
                }
              }
            } else if (chunk.type === 'response.output_text.completed' || chunk.type === 'response.completed') {
              yield* flushBuffer();

              const outputItem = (chunk as any).output?.[(chunk as any).output?.length - 1];
              if (outputItem?.type === 'message' && outputItem.content) {
                const text = outputItem.content[0]?.text || '';
                if (text) {
                  yield {
                    id: messageId,
                    object: 'chat.completion.chunk' as const,
                    created: Math.floor(Date.now() / 1000),
                    model: (chunk as any).model || model,
                    choices: [
                      {
                        index: 0,
                        delta: { content: text },
                        finish_reason: null,
                      },
                    ],
                    completion_type: 'full_content',
                  };
                }
              }
              yield {
                id: messageId,
                object: 'chat.completion.chunk' as const,
                created: Math.floor(Date.now() / 1000),
                model: (chunk as any).model || model,
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: 'stop',
                  },
                ],
              };
            } else if (chunk.type === 'response.output_item.added' && chunk.item?.type === 'function_call') {
              currentFunctionCall = {
                id: chunk.item.id,
                name: chunk.item.name,
                arguments: '',
              };

              yield {
                id: messageId,
                object: 'chat.completion.chunk' as const,
                created: Math.floor(Date.now() / 1000),
                model: (chunk as any).model || model,
                choices: [
                  {
                    index: 0,
                    delta: {
                      tool_calls: [
                        {
                          id: currentFunctionCall.id,
                          type: 'function' as const,
                          function: {
                            name: currentFunctionCall.name,
                            arguments: '',
                          },
                        },
                      ],
                    },
                    finish_reason: null,
                  },
                ],
              };
            } else if (chunk.type === 'response.function_call_arguments.delta') {
              if (currentFunctionCall && chunk.delta) {
                yield {
                  id: messageId,
                  object: 'chat.completion.chunk' as const,
                  created: Math.floor(Date.now() / 1000),
                  model: (chunk as any).model || model,
                  choices: [
                    {
                      index: 0,
                      delta: {
                        tool_calls: [
                          {
                            id: currentFunctionCall.id,
                            type: 'function' as const,
                            function: {
                              name: null,
                              arguments: chunk.delta,
                            },
                          },
                        ],
                      },
                      finish_reason: null,
                    },
                  ],
                };
              }
            } else if (chunk.type === 'response.function_call_arguments.done') {
              currentFunctionCall = null;
            } else if (chunk.type === 'text' || chunk.text) {
              const text = chunk.text || (chunk as any).content || '';
              if (text) {
                const isCompleteContent = text.length > 50 && accumulatedContent && text.includes(accumulatedContent);

                yield {
                  id: messageId,
                  object: 'chat.completion.chunk' as const,
                  created: Math.floor(Date.now() / 1000),
                  model: (chunk as any).model || model,
                  choices: [
                    {
                      index: 0,
                      delta: { content: text },
                      finish_reason: null,
                    },
                  ],
                  ...(isCompleteContent && { completion_type: 'full_content' }),
                };
              }
            } else if ((chunk as any).type === 'function_call') {
              yield {
                id: messageId,
                object: 'chat.completion.chunk' as const,
                created: Math.floor(Date.now() / 1000),
                model: (chunk as any).model || model,
                choices: [
                  {
                    index: 0,
                    delta: {
                      tool_calls: [
                        {
                          id: (chunk as any).id,
                          type: 'function' as const,
                          function: {
                            name: (chunk as any).name,
                            arguments: (chunk as any).arguments || '',
                          },
                        },
                      ],
                    },
                    finish_reason: null,
                  },
                ],
              };
            } else if ((chunk as any).output) {
              const outputItem = (chunk as any).output[(chunk as any).output.length - 1];
              if (outputItem?.type === 'message' && outputItem.content) {
                const text = outputItem.content[0]?.text || '';
                if (text) {
                  const isCompleteContent = text.length > 50 && text.includes(accumulatedContent);

                  yield {
                    id: messageId,
                    object: 'chat.completion.chunk' as const,
                    created: Math.floor(Date.now() / 1000),
                    model: (chunk as any).model || model,
                    choices: [
                      {
                        index: 0,
                        delta: { content: text },
                        finish_reason: null,
                      },
                    ],
                    ...(isCompleteContent && { completion_type: 'full_content' }),
                  };
                }
              } else if (outputItem?.type === 'function_call') {
                yield {
                  id: messageId,
                  object: 'chat.completion.chunk' as const,
                  created: Math.floor(Date.now() / 1000),
                  model: (chunk as any).model || model,
                  choices: [
                    {
                      index: 0,
                      delta: {
                        tool_calls: [
                          {
                            id: outputItem.id,
                            type: 'function' as const,
                            function: {
                              name: outputItem.name,
                              arguments: outputItem.arguments || '',
                            },
                          },
                        ],
                      },
                      finish_reason: null,
                    },
                  ],
                };
              }
            } else if ((chunk as any).type === 'response.done' || (chunk as any).type === 'response.completed') {
              yield {
                id: messageId,
                object: 'chat.completion.chunk' as const,
                created: Math.floor(Date.now() / 1000),
                model: (chunk as any).model || model,
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: 'stop' as const,
                  },
                ],
              };
            }
          }
        }

        return createNormalizedStream(stream, options);
      } catch (error: any) {
        logger.error('Error creating chat completion stream', error);
        emitAIProviderErrorEvent({
          tenant: source.tenant,
          provider: source.kind,
          sourceId: source._id,
          stream: true,
          model,
          context: options.unsafeUserContext,
          error,
        });
        throw error;
      }
    },
  };
}
