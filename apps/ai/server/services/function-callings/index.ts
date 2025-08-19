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

export const editorsFunctionCallings = {
  [getBlueprintsCalling.name]: getBlueprintsCalling,
  [createBlueprintCalling.name]: createBlueprintCalling,
  [createPageCalling.name]: createPageCalling,
  [editPageCalling.name]: editPageCalling,
  [getHTTPRequirementForPageCalling.name]: getHTTPRequirementForPageCalling,
  [createComponentCalling.name]: createComponentCalling,
  [getComponentsCalling.name]: getComponentsCalling,
  [getBlueprintRequirementForPageCalling.name]: getBlueprintRequirementForPageCalling,
  [getPagesCalling.name]: getPagesCalling,
  [addFreeTextToPageCalling.name]: addFreeTextToPageCalling,
  [addGridToPageCalling.name]: addGridToPageCalling,
  [addTableToPageCalling.name]: addTableToPageCalling,
  [addFormToPageCalling.name]: addFormToPageCalling,
}

export const editPagesFunctionCallings = [
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