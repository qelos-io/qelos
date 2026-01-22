import * as ChatCompletionService from "./chat-completion-service";
import { executeFunctionCalls } from "./execute-function-calls";
import { createAIService } from "./ai-service";
import { emitAIProviderErrorEvent } from "./platform-events";
import logger from "./logger";

const NESTED_AGENT_TIMEOUT_MS = 600000; // 10 minutes timeout for nested agent calls

/**
 * Sets up SSE response headers for streaming responses
 */
function setupSSEHeaders(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
}

/**
 * Filters messages to only include safe roles
 */
function getSafeUserMessages(messages) {
  return messages.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant' || msg.role === 'tool'
  );
}

/**
 * Creates chat options from request options and source details
 */
function createChatOptions(options, sourceDetails, source, initialMessages, safeUserMessages, tools) {
  return {
    model: options.model || sourceDetails.model || source.metadata.defaultModel || 'gpt-4.1',
    temperature: options.temperature || sourceDetails.temperature,
    top_p: options.top_p || sourceDetails.top_p,
    frequency_penalty: options.frequency_penalty || sourceDetails.frequency_penalty,
    presence_penalty: options.presence_penalty || sourceDetails.presence_penalty,
    stop: options.stop || sourceDetails.stop,
    messages: initialMessages.concat(safeUserMessages).map(msg => 
      typeof msg === 'string' ? { role: 'user', content: msg } : msg
    ),
    response_format: options.response_format || sourceDetails.response_format,
    tools,
    unsafeUserContext: options.context,
  };
}

/**
 * Creates a function call handler for executing function calls
 */
function createFunctionCallHandler(req, allTools) {
  return async (functionCalls: ChatCompletionService.FunctionCall[], ...args: any[]) => {
    return executeFunctionCalls(
      req,
      functionCalls,
      allTools,
      req.headers.tenant,
      args[0]
    );
  };
}

/**
 * Handles errors in chat completion
 */
function handleChatCompletionError(error, res, useSSE) {
  logger.error('Error processing AI chat completion', error);
  if (useSSE) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing AI chat completion' })}\n\n`);
    res.end();
  } else {
    res.status(500).json({ message: 'Error processing AI chat completion' }).end();
  }
}

/**
 * Processes a chat completion request with the given system prompt and tools
 */
export async function processChatCompletion(req: any, res: any, systemPrompt: any, getToolsFn: any) {
  // Track recursion depth to prevent infinite loops
  const recursionDepth = (req._recursionDepth || 0) + 1;
  const MAX_RECURSION_DEPTH = 5;
  
  if (recursionDepth > MAX_RECURSION_DEPTH) {
    const error = new Error(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded in chat completion`);
    logger.error('Chat completion recursion limit exceeded', { recursionDepth, tenant: req.headers.tenant });
    if (res) {
      handleChatCompletionError(error, res, false);
      return;
    } else {
      throw error;
    }
  }
  
  req._recursionDepth = recursionDepth;
  const { source, sourceAuthentication } = req;
  let options = req.aiOptions || req.body;
  // Only use SSE if res is provided and streaming is requested
  const useSSE = res && (req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true');

  if (useSSE) {
    setupSSEHeaders(res);
  }

  const aiService = createAIService(source, sourceAuthentication);
  const safeUserMessages = getSafeUserMessages(options.messages);
  const initialMessages = systemPrompt ? (options.pre_messages || []).concat(systemPrompt) : options.pre_messages || [];
  const sourceDetails = options.details || {};
  
  // Get tools based on the provided function
  const allTools = await getToolsFn(req.headers.tenant, safeUserMessages, sourceDetails, sourceAuthentication);

  try {
    const chatOptions = createChatOptions(
      options, 
      sourceDetails, 
      source, 
      initialMessages, 
      safeUserMessages, 
      allTools
    );

    const executeFunctionCallsHandler = createFunctionCallHandler(req, allTools);

    if (useSSE) {
      await ChatCompletionService.handleStreamingChatCompletion(
        res,
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        [],
        undefined,
        {
          tenant: req.headers.tenant,
          userId: req.user?._id?.toString(),
          integrationId: source._id,
          integrationName: source.name,
          workspaceId: req.workspace?._id?.toString(),
        }
      );
    } else {
      // For non-streaming (when res is null), use a timeout wrapper
      const context = {
        tenant: req.headers.tenant,
        userId: req.user?._id?.toString(),
        integrationId: source._id,
        integrationName: source.name,
        workspaceId: req.workspace?._id?.toString(),
      };
      
      const result = await Promise.race([
        ChatCompletionService.handleNonStreamingChatCompletion(
          aiService,
          chatOptions,
          executeFunctionCallsHandler,
          allTools,
          undefined,
          context
        ),
        new Promise((_, reject) => {
          setTimeout(() => {
            const timeoutError = new Error(`Non-streaming chat completion timed out after ${NESTED_AGENT_TIMEOUT_MS}ms`);
            // Emit platform event for timeout
            if (req.headers.tenant) {
              emitAIProviderErrorEvent({
                tenant: req.headers.tenant,
                userId: req.user?._id?.toString(),
                provider: source.kind || 'unknown',
                sourceId: source._id,
                stream: false,
                model: chatOptions.model,
                error: timeoutError,
                context: {
                  integrationId: source._id,
                  integrationName: source.name,
                  workspaceId: req.workspace?._id?.toString(),
                }
              });
            }
            reject(timeoutError);
          }, NESTED_AGENT_TIMEOUT_MS);
        })
      ]);
      
      if (res) {
        res.status(200).json(result).end();
      } else {
        return result;
      }
    }
  } catch (error) {
    if (res) {
      handleChatCompletionError(error, res, useSSE);
    } else {
      throw error;
    }
  }
}
