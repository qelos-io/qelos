import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../logger';
import { emitAIProviderErrorEvent, emitTokenUsageEvent } from '../../platform-events';
import { compactObject, extractTextContent, getMessagesWithUserContext, safeJsonParse } from './shared';
import type { AIServiceAuthentication, AIServiceOptions, AIServiceSource } from './types';

export function createGeminiService(source: AIServiceSource, authentication: AIServiceAuthentication) {
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
        const transformedResponse = transformGeminiResponseToOpenAI(response, modelName);

        if (response.usageMetadata && options.loggingContext?.tenant) {
          emitTokenUsageEvent({
            tenant: options.loggingContext.tenant,
            userId: options.loggingContext.userId,
            provider: source.kind,
            sourceId: source._id,
            integrationId: options.loggingContext.integrationId,
            integrationName: options.loggingContext.integrationName,
            model: modelName,
            usage: {
              prompt_tokens: response.usageMetadata.promptTokenCount || 0,
              completion_tokens: response.usageMetadata.candidatesTokenCount || 0,
              total_tokens: response.usageMetadata.totalTokenCount || 0,
            },
            stream: false,
            context: options.loggingContext,
          });
        }

        return transformedResponse;
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
        return createGeminiStreamGenerator(result.stream, modelName, options, source);
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
    },
  };
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

async function* createGeminiStreamGenerator(
  stream: AsyncIterable<any>,
  modelName: string,
  options?: AIServiceOptions,
  source?: AIServiceSource,
) {
  let usageEmitted = false;

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

    if (chunk.usageMetadata && !usageEmitted && options?.loggingContext?.tenant && source) {
      emitTokenUsageEvent({
        tenant: options.loggingContext.tenant,
        userId: options.loggingContext.userId,
        provider: source.kind,
        sourceId: source._id,
        integrationId: options.loggingContext.integrationId,
        integrationName: options.loggingContext.integrationName,
        model: modelName,
        usage: {
          prompt_tokens: chunk.usageMetadata.promptTokenCount || 0,
          completion_tokens: chunk.usageMetadata.candidatesTokenCount || 0,
          total_tokens: chunk.usageMetadata.totalTokenCount || 0,
        },
        stream: true,
        context: options.loggingContext,
      });
      usageEmitted = true;
    }

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
