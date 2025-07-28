import { getBlueprintsCalling, createBlueprintCalling } from "./blueprints.calling";
import { createPageCalling, getHTTPRequirementForPageCalling } from "./plugins.calling";
import { createComponentCalling } from "./no-code.calling";

export const editorsFunctionCallings = {
  [getBlueprintsCalling.name]: getBlueprintsCalling,
  [createBlueprintCalling.name]: createBlueprintCalling,
  [createPageCalling.name]: createPageCalling,
  [getHTTPRequirementForPageCalling.name]: getHTTPRequirementForPageCalling,
  [createComponentCalling.name]: createComponentCalling,
}