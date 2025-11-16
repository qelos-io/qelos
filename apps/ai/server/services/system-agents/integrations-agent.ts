import { IntegrationSourceKind } from "@qelos/global-types";
import { processChatCompletion } from "../chat-completion-system-agents-service";
import { createConnectionCalling, createIntegrationCalling, getConnectionCalling, listConnectionsCalling, removeConnectionCalling, updateConnectionCalling, getIntegrationCalling } from "../function-callings/integrations.calling";
import { toggleIntegrationStatusCalling } from "../function-callings/integrations.calling";
import { removeIntegrationCalling } from "../function-callings/integrations.calling";
import { listIntegrationsCalling } from "../function-callings/integrations.calling";
import { getWebhookSampleCalling } from "../function-callings/integrations.calling";
import { buildDataManipulationCalling } from "../function-callings/integrations.calling";
import { updateIntegrationCalling } from "../function-callings/integrations.calling";
import { getRelevantToolsForAgent } from "../vector-search-service";

/**
 * Gets tools for integrations chat completion
 */
async function getIntegrationAgentTools(tenant: string, safeUserMessages: any[], sourceDetails: any, sourceAuthentication: any) {
  const allTools = [
    createConnectionCalling,
    getConnectionCalling,
    updateConnectionCalling,
    removeConnectionCalling,
    listConnectionsCalling,
    createIntegrationCalling,
    getIntegrationCalling,
    updateIntegrationCalling,
    toggleIntegrationStatusCalling,
    removeIntegrationCalling,
    listIntegrationsCalling,
    getWebhookSampleCalling,
    buildDataManipulationCalling,
  ];

  return getRelevantToolsForAgent({
    tenant,
    safeUserMessages,
    sourceDetails,
    sourceAuthentication,
    allTools,
    defaultMaxTools: 8,
  });
}


/**
 * System prompt for SaaS builder integrations functionality
 */
const SAAS_BUILDER_SYSTEM_PROMPT_INTEGRATIONS = {
  role: 'system',
  content: `You are an integrations manager. You are using Qelos AI to manage your integrations and connections.
  Integrations are the connections between your SaaS application and external services and APIs.
  The main resources you manage are connections (a.k.a integration sources) and integrations.
  every integration define 3 major parts: trigger, data manipulation and target.
  the trigger is a description of the event that will trigger the integration, that will come from one of the connections.
  the data manipulation is a description of the data that will be manipulated, that will come from one of the trigger.
  the target is a description of the target connection that will receive the data, after manipulation.

  existing connections kinds are: ${Object.values(IntegrationSourceKind).join(', ')}
  popular integrations triggers are:
  - { kind: 'qelos', operation: 'webhook' } // ability to subscribe to any event in qelos, such as user-registered, asset-uploaded, etc.
  - { kind: 'qelos', operation: 'chatCompletion' } // create chat completion endpoint
  - { kind: 'openai', operation: 'functionCalling' } // trigger when openai function calling is running, to target a function call.
  
  PLANNING (WITHIN INTEGRATIONS SCOPE):
  - When the user describes an automation or integration in natural language, you can:
    * Propose which connections and integrations are needed (trigger, data manipulation, target).
    * Then use the tools to create/update connections and integrations to match that design.
  - Do NOT create or edit pages, components, or blueprints. Keep your work strictly in integrations and connections.

  HANDOFF & CONTEXT:
  - When you inspect or modify an integration/connection, capture the key identifiers (source IDs, integration IDs, trigger/target operations) in your summary so other agents can reuse them.
  - Before editing, retrieve the existing definition (list/get) so you make incremental updates instead of overwriting the whole configuration.
  - After each change, restate the resulting trigger, data manipulation, and target in a concise summary.

  when the user asks for integrations, use the "get_integrations_list" tool to retrieve them.
  `
}
/**
 * Processes a integrations chat completion request
 */
export function processIntegrationsChatCompletion(req: any, res: any) {
  return processChatCompletion(req, res, SAAS_BUILDER_SYSTEM_PROMPT_INTEGRATIONS, getIntegrationAgentTools);
}
