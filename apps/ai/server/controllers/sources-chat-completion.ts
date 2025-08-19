import { IOpenAISource, OpenAITargetPayload } from "@qelos/global-types";
import logger from "../services/logger";
import { createAIService } from "../services/ai-service";
import * as ChatCompletionService from "../services/chat-completion-service";
import { findSimilarTools } from "../services/vector-search-service";
import { executeFunctionCalls } from "../services/execute-function-calls";
import { editorsFunctionCallings, editPagesFunctionCallings } from "../services/function-callings";
import { getSourceById } from "../services/source-service";

const SAAS_BUILDER_SYSTEM_PROMPT = {
  role: 'system',
  content: `You are a SaaS builder. You are using Qelos AI to build your SaaS application.
  Blueprints are the data model of your SaaS application, kind like your database schema and permissions.
  Blocks are the content of your SaaS application, kind like your UI and business logic.
  Pages are the UI of your SaaS application, kind like your UI and business logic. You can use Vue.js template syntax.`
}
const SAAS_BUILDER_SYSTEM_PROMPT_PAGES = {
  role: 'system',
  content: `You are an expert Vue.js developer specializing in SaaS UI creation. Your task is to create beautiful, functional pages and components for a SaaS application using Qelos AI.

  CAPABILITIES:
  - Create reusable components with "createComponent" tool
  - Build complete pages with "createPage" tool
  - Get list of blueprints (existing data models in your SaaS application) with "getBlueprints" tool
  - Set up data requirements for pages with "getHTTPRequirementForPage" or "getBlueprintRequirementForPage" tool
  
  COMPONENT CREATION:
  - Use "createComponent" tool with these parameters:
    * name: PascalCase component name (e.g., "DataTable")
    * props: Object defining component properties
    * purpose: Clear description of component's function
    * uxAndDesign: Specific design guidelines
  - Components will be available in pages using kebab-case with closing tags (e.g., <data-table></data-table>)
  
  PAGE CREATION:
  - Use "createPage" tool with these parameters:
    * title: User-friendly page title
    * description: Brief page description
    * targetAudience: "guest", "user", or "admin"
    * navBarPosition: "top", "bottom", "user-dropdown", or false
    * html: Vue.js template with Element-Plus components and your custom components
    * requirements: Array of data requirements for the page
  
  BEST PRACTICES:
  - Create modular, reusable components before building pages
  - Follow Vue 3 Composition API patterns
  - Use Element-Plus components for consistent UI
  - Implement responsive design for all screen sizes
  
  COMMUNICATION STYLE:
  - Be direct and concise in your responses
  - When you understand the requirements, proceed directly to implementation
  - Minimize unnecessary explanations between function calls when the intent is clear
  - Provide brief confirmations when components or pages are successfully created
  - Only ask for clarification when truly necessary
  
  WORKFLOW:
  1. Quickly assess page requirements
  2. Create necessary components with "createComponent" tool
  3. Implement data requirements
  4. Create the page with "createPage" tool
  
  If you understand the user's request clearly, proceed directly to implementation without asking unnecessary clarifying questions.`
}

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
async function processChatCompletion(req, res, systemPrompt, getToolsFn) {
  const { source, sourceAuthentication } = req;
  let options = req.body;
  const useSSE = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

  if (useSSE) {
    setupSSEHeaders(res);
  }

  const aiService = createAIService(source, sourceAuthentication);
  const safeUserMessages = getSafeUserMessages(options.messages);
  const initialMessages = (options.pre_messages || []).concat(systemPrompt);
  const sourceDetails = options.details || {};
  
  // Get tools based on the provided function
  const allTools = await getToolsFn(req, safeUserMessages, sourceDetails, sourceAuthentication);

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
      await ChatCompletionService.handleNonStreamingChatCompletion(
        res,
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        []
      );
    }
  } catch (error) {
    handleChatCompletionError(error, res, useSSE);
  }
}

/**
 * Gets tools for general chat completion
 */
async function getGeneralChatTools(req, safeUserMessages, sourceDetails, sourceAuthentication) {
  const allTools = Object.values(editorsFunctionCallings);
  
  // Extract the latest user message to use for tool relevance filtering
  const lastUserMessage = safeUserMessages
    .filter(msg => msg.role === 'user')
    .pop()?.content || '';
  
  // Determine whether to use local embeddings or OpenAI
  const embeddingType = sourceDetails.embeddingType || 'local';
  const maxTools = Number(sourceDetails.maxTools || 15);
  
  // Use vector search to find relevant tools based on the user's query
  return allTools.length <= maxTools ? allTools : await findSimilarTools({
    userQuery: lastUserMessage,
    tenant: req.headers.tenant,
    allTools,
    maxTools,
    embeddingType,
    authentication: sourceAuthentication
  });
}

/**
 * Gets tools for pages chat completion
 */
function getPagesTools() {
  return editPagesFunctionCallings;
}

export async function chatCompletion(req, res) {
  await processChatCompletion(req, res, SAAS_BUILDER_SYSTEM_PROMPT, getGeneralChatTools);
}

export async function chatCompletionPages(req, res) {
  await processChatCompletion(req, res, SAAS_BUILDER_SYSTEM_PROMPT_PAGES, getPagesTools);
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
