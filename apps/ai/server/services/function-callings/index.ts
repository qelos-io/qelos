import { getBlueprintsCalling, createBlueprintCalling } from "./blueprints.calling";
import { 
  createPageCalling, 
  editPageCalling, 
  getBlueprintRequirementForPageCalling, 
  getHTTPRequirementForPageCalling, 
  getPagesCalling,
  addFreeTextToPageCalling,
  addGridToPageCalling,
  addTableToPageCalling,
  addFormToPageCalling,
  getPageCalling
} from "./plugins.calling";
import { createComponentCalling, editComponentCalling, getComponentsCalling } from "./no-code.calling";
import { callPagesEditorAgentCalling } from "./pages-agent.calling";
import { callIntegrationManagerAgentCalling } from "./integrations-agent.calling";
import {
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
} from "./integrations.calling";

export const editorsFunctionCallings = {
  [getBlueprintsCalling.name]: getBlueprintsCalling,
  [createBlueprintCalling.name]: createBlueprintCalling,
  [callPagesEditorAgentCalling.name]: callPagesEditorAgentCalling,
  [callIntegrationManagerAgentCalling.name]: callIntegrationManagerAgentCalling,
}