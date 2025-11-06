import { processChatCompletion } from "../chat-completion-system-agents-service";
import { findSimilarTools } from "../vector-search-service";
import { editorsFunctionCallings } from "../function-callings";

/**
 * System prompt for general SaaS builder functionality
 */
const SAAS_BUILDER_SYSTEM_PROMPT = {
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
 * Gets tools for general chat completion
 */
async function getGeneralChatTools(tenant: string, safeUserMessages: any[], sourceDetails: any, sourceAuthentication: any) {
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
 * Processes a general chat completion request
 */
export function processGeneralChatCompletion(req: any, res: any) {
  return processChatCompletion(req, res, SAAS_BUILDER_SYSTEM_PROMPT, getGeneralChatTools);
}