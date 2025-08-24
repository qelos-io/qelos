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
  addFormToPageCalling
} from "./plugins.calling";
import { createComponentCalling, getComponentsCalling } from "./no-code.calling";
import { callPagesEditorAgentCalling } from "./pages-agent.calling";

export const editorsFunctionCallings = {
  [getBlueprintsCalling.name]: getBlueprintsCalling,
  [createBlueprintCalling.name]: createBlueprintCalling,
  [callPagesEditorAgentCalling.name]: callPagesEditorAgentCalling,
}

export const editPagesFunctionCallings = [
  getComponentsCalling,
  createComponentCalling,
  createPageCalling,
  editPageCalling,
  createBlueprintCalling,
  getBlueprintsCalling,
  getHTTPRequirementForPageCalling,
  getBlueprintRequirementForPageCalling,
  getPagesCalling,
  addFreeTextToPageCalling,
  addGridToPageCalling,
  addTableToPageCalling,
  addFormToPageCalling,
];