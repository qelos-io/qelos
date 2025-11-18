import * as ChatCompletionService from "./chat-completion-service";
import { executeFunctionCalls } from "./execute-function-calls";
import { createAIService } from "./ai-service";
import logger from "./logger";

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
  const { source, sourceAuthentication } = req;
  let options = req.aiOptions || req.body;
  // Only use SSE if res is provided and streaming is requested
  const useSSE = res && (req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true');

  if (useSSE) {
    setupSSEHeaders(res);
  }

  const aiService = createAIService(source, sourceAuthentication);
  const safeUserMessages = getSafeUserMessages(options.messages);
  const initialMessages = (options.pre_messages || []).concat(systemPrompt);
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
        []
      );
    } else {
      const result = await ChatCompletionService.handleNonStreamingChatCompletion(
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        []
      );
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
