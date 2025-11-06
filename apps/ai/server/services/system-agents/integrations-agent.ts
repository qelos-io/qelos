import { IntegrationSourceKind } from "@qelos/global-types";
import { processChatCompletion } from "../chat-completion-system-agents-service";
import { createConnectionCalling, createIntegrationCalling, getConnectionCalling, listConnectionsCalling, removeConnectionCalling, updateConnectionCalling } from "../function-callings/integrations.calling";
import { toggleIntegrationStatusCalling } from "../function-callings/integrations.calling";
import { removeIntegrationCalling } from "../function-callings/integrations.calling";
import { listIntegrationsCalling } from "../function-callings/integrations.calling";
import { getWebhookSampleCalling } from "../function-callings/integrations.calling";
import { buildDataManipulationCalling } from "../function-callings/integrations.calling";
import { updateIntegrationCalling } from "../function-callings/integrations.calling";

/**
 * Gets tools for integrations chat completion
 */
function getIntegrationAgentTools() {
  return [
  createConnectionCalling,
  getConnectionCalling,
  updateConnectionCalling,
  removeConnectionCalling,
  listConnectionsCalling,
  createIntegrationCalling,
  updateIntegrationCalling,
  toggleIntegrationStatusCalling,
  removeIntegrationCalling,
  listIntegrationsCalling,
  getWebhookSampleCalling,
  buildDataManipulationCalling
  ];
}


/**
 * System prompt for SaaS builder integrations functionality
 */
const SAAS_BUILDER_SYSTEM_PROMPT_INTEGRATIONS = {
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
 * Processes a integrations chat completion request
 */
export function processIntegrationsChatCompletion(req: any, res: any) {
  return processChatCompletion(req, res, SAAS_BUILDER_SYSTEM_PROMPT_INTEGRATIONS, getIntegrationAgentTools);
}
