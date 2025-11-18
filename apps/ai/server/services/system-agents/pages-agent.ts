import { processChatCompletion } from "../chat-completion-system-agents-service";
import { getBlueprintsCalling } from "../function-callings/blueprints.calling";
import { createComponentCalling, editComponentCalling, getComponentsCalling } from "../function-callings/no-code.calling";
import { addFormToPageCalling, addFreeTextToPageCalling, addGridToPageCalling, addTableToPageCalling, analyzePageStructureCalling, createPageCalling, editPageCalling, getBlueprintRequirementForPageCalling, getHTTPRequirementForPageCalling, getPageCalling, getPagesCalling, upsertPageRequirementCalling } from "../function-callings/plugins.calling";
import { getComponents } from "../no-code-service";
import { getRelevantToolsForAgent } from "../vector-search-service";
import logger from "../logger";

// Simple circuit breaker for getComponents
let componentServiceFailures = 0;
let lastComponentServiceFailure = 0;
const COMPONENT_SERVICE_FAILURE_THRESHOLD = 3;
const COMPONENT_SERVICE_RECOVERY_TIME = 60000; // 1 minute


/**
 * System prompt for SaaS builder pages functionality
 */
const SAAS_BUILDER_SYSTEM_PROMPT_PAGES = {
  role: 'system',
  content: `You are an expert Vue.js developer specializing in SaaS UI creation. Your task is to create beautiful, functional pages and components for a SaaS application using Qelos AI.

  CAPABILITIES:
  - Create reusable UI components with "createComponent" tool
  - Update existing components with "editComponent" tool
  - Build complete pages with "createPage" tool
  - Edit existing pages with "editPage" tool
  - Get list of blueprints (existing data models in your SaaS application) with "getBlueprints" tool (READ-ONLY, do NOT create or update blueprints here)
  - Set up data requirements for pages with "getHTTPRequirementForPage" or "getBlueprintRequirementForPage" tool
  
  COMPONENTS & LOGIC (VERY IMPORTANT):
  - All business logic, state management, and event handlers must live inside components, not directly in page HTML.
  - The page "html" field is a Vue template only. You MUST NOT define JavaScript functions, composables, or logic inside the page HTML.
  - Do NOT add inline function definitions, <script> blocks, or setup code in the page HTML.
  - To add behavior, first create or update a component, then use that component in the page template.
  
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
  - Prefer composing UIs from existing components instead of duplicating similar ones
  - When implementing CRUD-like UIs for a blueprint (e.g., Todo, Board), use: tables/grids for lists, forms for create/edit, and filters/search where helpful
  - When editing pages, prefer small, focused changes over rewriting the entire template

  COMPONENT REUSE:
  - Before creating any new component, always review the "Existing components" list that is appended at the end of this prompt.
  - If an existing component can be reused, slightly extended, or combined with others to achieve the goal, prefer that over creating a new, similar component.
  - Avoid creating duplicate components with overlapping responsibilities and different names.

  NAMES & STRUCTURE:
  - Name components in PascalCase with clear roles (e.g., "BoardsList", "CreateTodoModal", "FilterBar").
  - Name pages using human-readable, navigation-friendly titles (e.g., "Boards", "Board", "Settings").
  - Avoid vague names like "MyComponent", "TestPage", or names that don’t reflect the purpose.
  
  COMMUNICATION STYLE:
  - Be direct and concise in your responses
  - When you understand the requirements, proceed directly to implementation
  - Minimize unnecessary explanations between function calls when the intent is clear
  - Provide brief confirmations when components or pages are successfully created
  - Only ask for clarification when truly necessary
  
  WORKFLOW:
  1. Quickly assess page and UX requirements (what the user wants to see and do).
  2. Inspect relevant blueprints with "getBlueprints" (read-only) to understand available data.
  3. Create or update components with "createComponent" / "editComponent" to encapsulate logic and behavior.
  4. Define data requirements with "getHTTPRequirementForPage" / "getBlueprintRequirementForPage", and use "upsertPageRequirement" to insert or update them without rewriting the entire page.
  5. Create or edit the page with "createPage" / "editPage" using your components and requirements.

  PLANNING (WITHIN UI SCOPE):
  - When the user describes a UI flow or screen in high-level terms, you should:
    * Outline a very short plan (1-3 bullets) of which pages and components are needed, and how they will connect to blueprints/data.
    * Then immediately create or update those pages and components using the available tools, reusing existing components where possible.
  - Do NOT change blueprints (data models) or integrations here; keep your changes strictly in pages, components, and page requirements.

  PAGE EDITING:
  1. Use "getPage" tool (and "analyzePageStructure" when you need a quick overview) to understand the current structure before editing.
  2. Use existing structure and requirements as a starting point; make incremental updates instead of full rewrites.
  3. Use "editPage" tool to edit the page
  
  If you understand the user's request clearly, proceed directly to implementation without asking unnecessary clarifying questions.`
};


export const pagesAgentTools = [
  getComponentsCalling,
  createComponentCalling,
  editComponentCalling,
  createPageCalling,
  editPageCalling,
  analyzePageStructureCalling,
  getPageCalling,
  getBlueprintsCalling,
  getHTTPRequirementForPageCalling,
  getBlueprintRequirementForPageCalling,
  getPagesCalling,
  addFreeTextToPageCalling,
  addGridToPageCalling,
  addTableToPageCalling,
  addFormToPageCalling,
  upsertPageRequirementCalling,
];
/**
 * Gets tools for pages chat completion
 */
async function getPagesTools(tenant: string, safeUserMessages: any[], sourceDetails: any, sourceAuthentication: any) {
  const allTools = pagesAgentTools;

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
 * Processes a pages chat completion request
 */
export async function processPagesChatCompletion(req: any, res: any) {
  const tenant = req.headers.tenant;
  
  let list: any[] = [];
  
  // Circuit breaker: skip component service if it's been failing recently
  const now = Date.now();
  const isCircuitOpen = componentServiceFailures >= COMPONENT_SERVICE_FAILURE_THRESHOLD && 
                       (now - lastComponentServiceFailure) < COMPONENT_SERVICE_RECOVERY_TIME;
  
  if (isCircuitOpen) {
    logger.warn('Component service circuit breaker is OPEN, skipping getComponents call', {
      failures: componentServiceFailures,
      lastFailure: new Date(lastComponentServiceFailure).toISOString(),
      tenant
    });
    list = [];
  } else {
    try {
      // Add aggressive timeout and fallback for getComponents
      list = await Promise.race([
        getComponents(tenant),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('getComponents timeout after 5 seconds')), 5000);
        })
      ]) as any[];
      
      // Reset failure count on success
      componentServiceFailures = 0;
    } catch (error) {
      componentServiceFailures++;
      lastComponentServiceFailure = now;
      
      logger.error('Failed to get components, using empty list:', {
        error: error instanceof Error ? error.message : error,
        failures: componentServiceFailures,
        tenant
      });
      
      // Continue with empty components list instead of failing
      list = [];
    }
  }
  
  const prompt = {
    role: SAAS_BUILDER_SYSTEM_PROMPT_PAGES.role,
    content: SAAS_BUILDER_SYSTEM_PROMPT_PAGES.content + 
    `\n\nExisting components: ${JSON.stringify(list.map(c => ({_id: c._id, componentName: c.componentName, description: c.description})))}`,
  };
  return processChatCompletion(req, res, prompt, getPagesTools);
} 