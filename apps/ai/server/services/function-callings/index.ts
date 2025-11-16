import { getBlueprintsCalling, createBlueprintCalling, updateBlueprintCalling } from "./blueprints.calling";
import { callPagesEditorAgentCalling } from "./pages-agent.calling";
import { callIntegrationManagerAgentCalling } from "./integrations-agent.calling";
import { callBlueprintsAgentCalling } from "./blueprints-agent.calling";

export const editorsFunctionCallings = {
  [getBlueprintsCalling.name]: getBlueprintsCalling,
  [createBlueprintCalling.name]: createBlueprintCalling,
  [updateBlueprintCalling.name]: updateBlueprintCalling,
  [callPagesEditorAgentCalling.name]: callPagesEditorAgentCalling,
  [callIntegrationManagerAgentCalling.name]: callIntegrationManagerAgentCalling,
  [callBlueprintsAgentCalling.name]: callBlueprintsAgentCalling,
}