import { IOpenAISource, OpenAITargetPayload } from "@qelos/global-types";
import logger from "../services/logger";
import { createAIService } from "../services/ai-service";
import * as ChatCompletionService from "../services/chat-completion-service";
import { findSimilarTools } from "../services/vector-search-service";
import { executeFunctionCalls } from "../services/execute-function-calls";
import { editorsFunctionCallings } from "../services/function-callings";
import { getSourceById } from "../services/source-service";

/**
 * Middleware to get source by ID and verify permissions
 */
export async function getSourceToIntegrate(req, res, next) {
  try {
    const result = await getSourceById(req.headers.tenant, req.params.sourceId);
    
    if (result.error) {
      res.status(result.status || 500).json({ message: result.error }).end();
      return;
    }
    
    const { source, authentication } = result;

    // Store source and authentication in request
    req.source = source;
    req.sourceAuthentication = authentication;

    next();
  } catch (e: any) {
    logger.error('Failed to get source to integrate', e);
    res.status(500).json({ message: 'Could not get source to integrate' }).end();
    return;
  }
}

export async function chatCompletion(req, res) {
  const { source, sourceAuthentication } = req;
  let options = req.body;
  const useSSE = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

  if (useSSE) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
  }

  const aiService = createAIService(source, sourceAuthentication);

  const safeUserMessages = options.messages.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant' || msg.role === 'tool'
  );

  // For direct source access, we don't have integration data manipulation
  // so we use the messages directly
  const initialMessages = options.pre_messages || [];
  const sourceDetails = options.details || {};
    
  // Map all available tools
  const allTools = Object.values(editorsFunctionCallings);
  
  // Extract the latest user message to use for tool relevance filtering
  const lastUserMessage = safeUserMessages
    .filter(msg => msg.role === 'user')
    .pop()?.content || '';
  
  // Determine whether to use local embeddings or OpenAI
  const embeddingType = sourceDetails.embeddingType || 'local';
  const maxTools = Number(sourceDetails.maxTools || 15);
  
  // Use vector search to find relevant tools based on the user's query
  const tools = allTools.length <= maxTools ? allTools : await findSimilarTools({
    userQuery: lastUserMessage,
    tenant: req.headers.tenant,
    allTools,
    maxTools,
    embeddingType,
    authentication: sourceAuthentication
  });

  try {
    const chatOptions = {
      model: options.model || sourceDetails.model || source.metadata.defaultModel,
      temperature: options.temperature || sourceDetails.temperature,
      top_p: options.top_p || sourceDetails.top_p,
      frequency_penalty: options.frequency_penalty || sourceDetails.frequency_penalty,
      presence_penalty: options.presence_penalty || sourceDetails.presence_penalty,
      stop: options.stop || sourceDetails.stop,
      messages: initialMessages.concat(safeUserMessages).map(msg => typeof msg === 'string' ? { role: 'user', content: msg } : msg),
      response_format: options.response_format || sourceDetails.response_format,
      tools,
    };

    // Custom function to execute function calls for this controller
    const executeFunctionCallsHandler = async (
      functionCalls: ChatCompletionService.FunctionCall[],
      ...args: any[]
    ) => {
      return executeFunctionCalls(
        req,
        functionCalls,
        allTools,
        req.headers.tenant,
        args[0]
      );
    };

    if (useSSE) {
      // Use the shared streaming chat completion handler
      await ChatCompletionService.handleStreamingChatCompletion(
        res,
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        []
      );
    } else {
      // Use the shared non-streaming chat completion handler
      await ChatCompletionService.handleNonStreamingChatCompletion(
        res,
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        []
      );
    }
  } catch (error) {
    logger.error('Error processing AI chat completion', error);
    if (useSSE) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing AI chat completion' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ message: 'Error processing AI chat completion' }).end();
    }
  }
}

export async function internalChatCompletion(req, res) {
  const { source, authentication, payload } = req.body as { source: IOpenAISource, authentication: any, payload: OpenAITargetPayload };
  const aiService = createAIService(source, authentication);
  try {
    const response = await aiService.createChatCompletion({
      messages: payload.messages,
      model: payload.model || source.metadata.defaultModel,
      temperature: payload.temperature || source.metadata.defaultTemperature,
      top_p: payload.top_p || source.metadata.defaultTopP,
      frequency_penalty: payload.frequency_penalty || source.metadata.defaultFrequencyPenalty,
      presence_penalty: payload.presence_penalty || source.metadata.defaultPresencePenalty,
      stream: false,
      max_tokens: payload.max_tokens || source.metadata.defaultMaxTokens,
      response_format: payload.response_format || source.metadata.defaultResponseFormat,
    })
    res.json(response).end();
  } catch {
    res.json({message: 'failed to execute chat completion'}).end();
  }
}
