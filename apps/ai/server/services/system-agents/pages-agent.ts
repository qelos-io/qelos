import { processChatCompletion } from "../chat-completion-system-agents-service";
import { getBlueprintsCalling } from "../function-callings/blueprints.calling";
import { createComponentCalling, editComponentCalling, getComponentsCalling } from "../function-callings/no-code.calling";
import { addFormToPageCalling, addFreeTextToPageCalling, addGridToPageCalling, addTableToPageCalling, createPageCalling, editPageCalling, getBlueprintRequirementForPageCalling, getHTTPRequirementForPageCalling, getPageCalling, getPagesCalling } from "../function-callings/plugins.calling";
import { getComponents } from "../no-code-service";


/**
 * System prompt for SaaS builder pages functionality
 */
const SAAS_BUILDER_SYSTEM_PROMPT_PAGES = {
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


export const pagesAgentTools = [
  getComponentsCalling,
  createComponentCalling,
  editComponentCalling, 
  createPageCalling,
  editPageCalling,
  getPageCalling,
  getBlueprintsCalling,
  getHTTPRequirementForPageCalling,
  getBlueprintRequirementForPageCalling,
  getPagesCalling,
  addFreeTextToPageCalling,
  addGridToPageCalling,
  addTableToPageCalling,
  addFormToPageCalling,
];
/**
 * Gets tools for pages chat completion
 */
function getPagesTools() {
  return pagesAgentTools;
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