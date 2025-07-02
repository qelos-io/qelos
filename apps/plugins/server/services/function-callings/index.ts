import { getBlueprintsCalling, createBlueprintCalling } from "./blueprints.calling";
import { createPageCalling } from "./plugins.calling";

export const editorsFunctionCallings = {
  [getBlueprintsCalling.name]: getBlueprintsCalling,
  [createBlueprintCalling.name]: createBlueprintCalling,
  [createPageCalling.name]: createPageCalling
}