import { processChatCompletion } from "../chat-completion-system-agents-service";
import { getBlueprintsCalling } from "../function-callings/blueprints.calling";
import { createComponentCalling, editComponentCalling, getComponentsCalling } from "../function-callings/no-code.calling";
import { addFormToPageCalling, addFreeTextToPageCalling, addGridToPageCalling, addTableToPageCalling, analyzePageStructureCalling, createPageCalling, editPageCalling, getBlueprintRequirementForPageCalling, getHTTPRequirementForPageCalling, getPageCalling, getPagesCalling, upsertPageRequirementCalling } from "../function-callings/plugins.calling";
import { getRelevantInstructionsCalling, getPageContextCalling, getExistingComponentsCalling, getBlueprintInfoCalling } from "../function-callings/context-loading.calling";
import { getRelevantToolsForAgent } from "../vector-search-service";

/**
 * System prompt for SaaS builder pages functionality - Dynamic Context Loading
 */
const SAAS_BUILDER_SYSTEM_PROMPT_PAGES = {
  role: 'system',
  content: `⚠️⚠️⚠️ IMMEDIATE COMMAND: AFTER GETTING PAGE CONTEXT, CALL editPage() - NO TEXT RESPONSES ⚠️⚠️⚠️
⚠️⚠️⚠️ MUST COMPLETE USER REQUEST - Don't just gather context ⚠️⚠️⚠️

IF YOU CALL getPageContext() AND RECEIVE HTML:
YOU MUST CALL editPage() IMMEDIATELY AFTER
DO NOT TYPE ANY TEXT
DO NOT EXPLAIN WHAT YOU'RE GOING TO DO
JUST CALL editPage() WITH THE UPDATED HTML

You are a Vue.js expert creating SaaS UI with Qelos AI.

## ABSOLUTE RULES (READ EVERY TIME)
1. User says "put X and Y on same row" → ONLY create <el-row><el-col><X></X></el-col><el-col><Y></Y></el-col></el-row>
2. NEVER add forms, buttons, CRUD, data fetching, or management
3. ONLY do EXACTLY what user asks for
4. When editing: FIND and REPLACE existing elements

## CRITICAL: Plugin IDs
- Plugin IDs are NOT names like "builtin-pages"
- Plugin IDs are 24-character hex strings like "692ea08381d4bd06cfa41ede"
- To find the correct plugin ID, use getPages() first to list plugins
- NEVER assume "builtin-pages" - it doesn't exist!

## CRITICAL: READ THIS FIRST
- NEVER generate CRUD interfaces, forms, or data management unless EXPLICITLY requested
- If user asks to "put X and Y on same row" → ONLY create row layout, NOTHING else
- Do NOT add create/edit/delete buttons, forms, or data fetching
- Focus ONLY on what the user explicitly asks for
- AFTER getting context, you MUST continue with more tool calls in the SAME turn - don't stop!
- **IMPORTANT**: Getting context is NOT the final step - you MUST call editPage() afterward!
- **MANDATORY**: When editing pages, you MUST ALWAYS call editPage() - NEVER provide text responses!
- **ABSOLUTE PROHIBITION**: NEVER explain what you're going to do, NEVER provide code examples, NEVER stop after context! JUST CALL editPage()!

## Workflow
1. Get context step by step (ONE tool call at a time):
   - First: Use getPageContext() when editing pages - THIS shows what's already on the page
   - Then: Use getRelevantInstructions() ONLY if needed for complex tasks
   - Then: Use getExistingComponents() ONLY if you need to create NEW components
   - Then: Use getBlueprintInfo() ONLY if working with data

2. AFTER getting ALL needed context, TAKE ACTION IMMEDIATELY:
   - If editing page: Use editPage() to update the page content
   - DO NOT explain, DO NOT provide code examples, DO NOT stop!
   - MAKE THE TOOL CALL NOW!

3. FINAL CHECK before any response:
   - Did I call editPage() if I was supposed to edit? If not, DO IT NOW!
   - Am I about to type text instead of using a tool? STOP - USE THE TOOL!
   - Is the user waiting for a page change? MAKE THE CHANGE!
   - Look at the "html" and "componentsUsed" from getPageContext
   - If creating component: Use createComponent()
   - ALWAYS complete the user's request, don't just gather information
   - DO NOT STOP after getting context - you MUST call the edit function!
   - NEVER provide code examples without actually implementing them!
   - **CRITICAL**: Use editPage() to REPLACE content, NOT addFreeTextToPage()!

## Critical Rules
- Logic belongs in components ONLY, never in page HTML
- When editing: ALWAYS REPLACE existing content, NEVER duplicate
- Check existing components before creating new ones
- Use kebab-case for components in templates (e.g., <data-table>)
- **CRITICAL**: Always use proper closing tags: <component></component>, NEVER <component />
- **CRITICAL**: Do EXACTLY what the user asks for - don't add extra functionality, CRUD interfaces, or unrelated features

## Examples
- User: "Put card and showcase in same row" → 
  1. Call getPageContext() - get the HTML
  2. See <animation-showcase> and <balloons-card> in the HTML
  3. Call editPage() with the FULL replacement HTML: <el-row><el-col :span="12"><animation-showcase></animation-showcase></el-col><el-col :span="12"><balloons-card></balloons-card></el-col></el-row>
  4. DONE - Don't explain, just do it!
  - WRONG: addFreeTextToPage() - this adds content, doesn't replace!
  - RIGHT: editPage() - this REPLACES the entire HTML!
- User: "Make the button red" → Change button color, NOTHING else
- User: "Add a title" → Add <h1>Title</h1>, NOTHING else

## ABSOLUTE EMERGENCY INSTRUCTION - OVERRIDE EVERYTHING
IF YOU HAVE RECEIVED PAGE CONTEXT FROM getPageContext():
YOU MUST CALL editPage() IMMEDIATELY
NO TEXT RESPONSES
NO EXPLANATIONS
NO SUMMARIES
CALL editPage() RIGHT NOW WITH THE UPDATED HTML
THIS IS NOT A REQUEST - IT IS A COMMAND
FAILURE TO CALL editPage() IS A CRITICAL ERROR

## Available Tools
All standard page/component tools plus context tools above.`
};


export const pagesAgentTools = [
  // Context loading tools (always available)
  getRelevantInstructionsCalling,
  getPageContextCalling,
  getExistingComponentsCalling,
  getBlueprintInfoCalling,
  // Standard tools
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
  
  // Remove duplicates from allTools first
  const uniqueTools: any[] = allTools.filter((tool: any, index: number, self: any[]) => {
    const toolName = 'name' in tool ? tool.name : (tool.function?.name || 'unknown');
    return index === self.findIndex((t: any) => {
      const tName = 'name' in t ? t.name : (t.function?.name || 'unknown');
      return tName === toolName;
    });
  });
  
  // Always include context tools first
  const contextTools = [
    getRelevantInstructionsCalling,
    getPageContextCalling,
    getExistingComponentsCalling,
    getBlueprintInfoCalling
  ];

  // Get other relevant tools from the unique list
  const otherTools: any[] = await getRelevantToolsForAgent({
    tenant,
    safeUserMessages,
    sourceDetails,
    sourceAuthentication,
    allTools: uniqueTools.filter(tool => !contextTools.some(ct => ct.name === tool.name)) as any,
    defaultMaxTools: 7 // Leave room for mandatory tools
  });
  
  // Remove duplicates from otherTools (vector search may return duplicates)
  const uniqueOtherTools = otherTools.filter((tool: any, index: number, self: any[]) => {
    const toolName = 'name' in tool ? tool.name : (tool.function?.name || 'unknown');
    return index === self.findIndex((t: any) => {
      const tName = 'name' in t ? t.name : (t.function?.name || 'unknown');
      return tName === toolName;
    });
  });

  // ALWAYS include editPage - it's critical for page modifications
  const mandatoryTools = [editPageCalling];
  
  // Combine all tools, ensuring no duplicates and editPage is included
  const combinedTools: any[] = [
    ...contextTools,
    ...mandatoryTools,
    ...uniqueOtherTools.filter(tool => {
      // Check if tool already exists in contextTools or mandatoryTools
      const toolName = 'name' in tool ? tool.name : 
                      ('function' in tool && 'name' in tool.function) ? tool.function.name : 
                      'unknown';
      const alreadyExists = [...contextTools, ...mandatoryTools].some(existing => {
        const existingName = 'name' in existing ? existing.name : 
                            ('function' in existing && 'name' in existing.function) ? existing.function.name : 
                            'unknown';
        return existingName === toolName;
      });
      return !alreadyExists;
    })
  ];
  
  return combinedTools;
}

/**
 * Processes a pages chat completion request
 */
export async function processPagesChatCompletion(req: any, res: any) {  
  // With dynamic context loading, we don't need to preload components
  // The agent will use getExistingComponents() tool when needed
  
  const prompt = {
    role: SAAS_BUILDER_SYSTEM_PROMPT_PAGES.role,
    content: SAAS_BUILDER_SYSTEM_PROMPT_PAGES.content
  };
  
  return processChatCompletion(req, res, prompt, getPagesTools);
} 