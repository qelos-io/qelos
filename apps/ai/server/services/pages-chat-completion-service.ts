import * as ChatCompletionService from "./chat-completion-service";
import { executeFunctionCalls } from "./execute-function-calls";
import { editIntegrationsFunctionCallings, editorsFunctionCallings, editPagesFunctionCallings } from "./function-callings";
import { createAIService } from "./ai-service";
import logger from "./logger";
import { findSimilarTools } from "./vector-search-service";
import { IntegrationSourceKind } from "@qelos/global-types";
import { getComponents } from "./no-code-service";

/**
 * System prompt for general SaaS builder functionality
 */
export const SAAS_BUILDER_SYSTEM_PROMPT = {
  role: 'system',
  content: `You are a SaaS builder. You are using Qelos AI to build your SaaS application.
  Blueprints are the data model of your SaaS application, kind like your database schema and permissions.
  Blocks are the content of your SaaS application, kind like your UI and business logic.
  Pages are the UI of your SaaS application, kind like your UI and business logic. You can use Vue.js template syntax.
  Components are reusable UI elements that can be used in pages.
  
  IMPORTANT: For any questions or tasks related to integrations or connections with external services, DO NOT handle them yourself. Instead, ALWAYS use the call_integration_manager_agent tool.
  
  Integrations are completely separate from components or pages. Integrations connect your SaaS application with external services and APIs.
  
  When the user mentions any of these terms: "integrations", "connections", "integration sources", "webhooks", "API connections", "external services", "OpenAI integration", "function calling", or asks about connecting to external services - ALWAYS use the call_integration_manager_agent tool.
  
  DO NOT confuse integrations (external service connections) with components (UI elements).
  `
}

/**
 * System prompt for SaaS builder pages functionality
 */
export const SAAS_BUILDER_SYSTEM_PROMPT_PAGES = {
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

  PAGE EDITING:
  1. Use "getPage" tool to retrieve the page
  2. Use existing structure and requirements as a starting point.
  3. Use "editPage" tool to edit the page
  
  If you understand the user's request clearly, proceed directly to implementation without asking unnecessary clarifying questions.`
};

/**
 * System prompt for SaaS builder integrations functionality
 */
export const SAAS_BUILDER_SYSTEM_PROMPT_INTEGRATIONS = {
  role: 'system',
  content: `You are an integrations manager. You are using Qelos AI to manage your integrations and connections.
  Integrations are the connections between your SaaS application and external services and APIs.
  The main resources yu manage are connections (a.k.a integration sources) and integrations.
  every integration define 3 major parts: trigger, data manipulation and target.
  the trigger is a description of the event that will trigger the integration, that will come from one of the connections.
  the data manipulation is a description of the data that will be manipulated, that will come from one of the trigger.
  the target is a description of the target connection that will receive the data, after manipulation.

  existing connections kinds are: ${Object.values(IntegrationSourceKind).join(', ')}
  popular integrations triggers are:
  - { kind: 'qelos', operation: 'webhook' } // ability to subscribe to any event in qelos, such as user-registered, asset-uploaded, etc.
  - { kind: 'qelos', operation: 'chatCompletion' } // create chat completion endpoint
  - { kind: 'openai', operation: 'functionCalling' } // trigger when openai function calling is running, to target a function call.
  
  when the user asks for integrations, use the "get_integrations_list" tool to retrieve them.
  `
}

/**
 * Gets tools for pages chat completion
 */
export function getPagesTools() {
  return editPagesFunctionCallings;
}

/**
 * Gets tools for integrations chat completion
 */
export function getIntegrationTools() {
  return editIntegrationsFunctionCallings;
}

/**
 * Gets tools for general chat completion
 */
export async function getGeneralChatTools(tenant: string, safeUserMessages: any[], sourceDetails: any, sourceAuthentication: any) {
  const allTools = Object.values(editorsFunctionCallings);
  
  // Extract the latest user message to use for tool relevance filtering
  const lastUserMessage = safeUserMessages
    .filter(msg => msg.role === 'user')
    .pop()?.content || '';
  
  // Determine whether to use local embeddings or OpenAI
  const embeddingType = sourceDetails.embeddingType || 'local';
  const maxTools = Number(sourceDetails.maxTools || 4);
  
  // Use vector search to find relevant tools based on the user's query
  const tools = allTools.length <= maxTools ? allTools : await findSimilarTools({
    userQuery: lastUserMessage,
    tenant,
    allTools,
    maxTools,
    embeddingType,
    authentication: sourceAuthentication
  });

  return tools;
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

/**
 * Processes a general chat completion request
 */
export function processGeneralChatCompletion(req: any, res: any) {
  return processChatCompletion(req, res, SAAS_BUILDER_SYSTEM_PROMPT, getGeneralChatTools);
}

/**
 * Processes a pages chat completion request
 */
export async function processPagesChatCompletion(req: any, res: any) {
  const tenant = req.headers.tenant;
  const list = await getComponents(tenant);
  const prompt = {
    role: SAAS_BUILDER_SYSTEM_PROMPT_PAGES.role,
    content: SAAS_BUILDER_SYSTEM_PROMPT_PAGES.content + 
    `\n\nExisting components: ${JSON.stringify(list.map(c => ({_id: c._id, componentName: c.componentName, description: c.description})))}`,
  };
  return processChatCompletion(req, res, prompt, getPagesTools);
}


/**
 * Processes a integrations chat completion request
 */
export function processIntegrationsChatCompletion(req: any, res: any) {
  return processChatCompletion(req, res, SAAS_BUILDER_SYSTEM_PROMPT_INTEGRATIONS, getIntegrationTools);
}
