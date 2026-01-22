import logger from "../logger";
import { getAllBlueprints, getComponents } from "../no-code-service";
import { getPluginAndPage } from "../plugins-service-api";

// Instruction sets for different task types
const instructionSets = {
  create: {
    title: "Page Creation Instructions",
    rules: [
      "1. Use createPage tool with: title, description, targetAudience, navBarPosition, html, requirements",
      "2. HTML is Vue template only - no <script> blocks or inline logic",
      "3. Use Element-Plus components and your custom components",
      "4. Components in templates use kebab-case (e.g., <data-table>)",
      "5. Always check existing components before creating new ones",
      "6. Set up data requirements with upsertPageRequirement",
      "7. CRITICAL: Always use proper closing tags: <component></component>, NEVER <component />"
    ]
  },
  edit: {
    title: "Page Editing Instructions",
    rules: [
      "1. CRITICAL: Do EXACTLY what the user requests - nothing more, nothing less",
      "2. ALWAYS REPLACE existing content, NEVER duplicate",
      "3. Use getPageContext() to get current page structure FIRST",
      "4. Find the EXACT elements to replace in the HTML",
      "5. REPLACE the entire old section with new layout",
      "6. NEVER append new content after old content",
      "7. NEVER add CRUD interfaces, forms, or unrelated features unless explicitly asked",
      "8. Example: User says 'put X and Y in same row' → ONLY create row with X and Y",
      "9. Example: If old HTML has '<card></card><show></show>', and user wants them in a row,",
      "   NEW HTML should be ONLY '<row><card></card><show></show></row>', NOT both old and new",
      "10. Always use proper closing tags: <component></component>"
    ]
  },
  component: {
    title: "Component Creation Instructions",
    rules: [
      "1. Use createComponent with: name (PascalCase), props, purpose, uxAndDesign",
      "2. All logic, state, and event handlers go in components",
      "3. Follow Vue 3 Composition API patterns",
      "4. Components become available as kebab-case tags",
      "5. Make components reusable and modular"
    ]
  }
};

export const getRelevantInstructionsCalling = {
  type: 'function',
  name: 'getRelevantInstructions',
  description: 'Get task-specific instructions for the current operation',
  parameters: {
    type: 'object',
    properties: {
      taskType: { 
        type: 'string', 
        enum: ['create', 'edit', 'component'],
        description: 'The type of task you are performing' 
      }
    },
    required: ['taskType']
  },
  function: {
    name: 'getRelevantInstructions',
    description: 'Get task-specific instructions for the current operation',
    parameters: {
      type: 'object',
      properties: {
        taskType: { 
          type: 'string', 
          enum: ['create', 'edit', 'component'],
          description: 'The type of task you are performing' 
        }
      },
      required: ['taskType']
    }
  },
  handler: async (req, payload: { taskType: string }) => {
    const instructions = instructionSets[payload.taskType as keyof typeof instructionSets];
    
    if (!instructions) {
      return {
        error: `Unknown task type: ${payload.taskType}. Valid types: create, edit, component`
      };
    }

    return {
      taskType: payload.taskType,
      instructions: instructions.rules.join('\n'),
      title: instructions.title
    };
  }
};

export const getPageContextCalling = {
  type: 'function',
  name: 'getPageContext',
  description: 'Get the current page structure, components, and requirements',
  parameters: {
    type: 'object',
    properties: {
      pluginId: {
        type: 'string',
        description: 'the ID of the plugin that manages this page'
      },
      pageId: { 
        type: 'string', 
        description: 'The ID or path of the page to analyze' 
      }
    },
    required: ['pageId', 'pluginId']
  },
  function: {
    name: 'getPageContext',
    description: 'Get the current page structure, components, and requirements',
    parameters: {
      type: 'object',
      properties: {
        pluginId: {
          type: 'string',
          description: 'the ID of the plugin that manages this page'
        },
        pageId: { 
          type: 'string', 
          description: 'The ID or path of the page to analyze' 
        }
      },
      required: ['pageId', 'pluginId']
    }
  },
  handler: async (req, payload: { pageId: string, pluginId: string }) => {
    try {
      const tenant = req.headers.tenant;
      
      // Get page details
      const {plugin, pageIndex} = await getPluginAndPage(payload.pluginId, payload.pageId, req.headers);

      const page = plugin.microFrontends[pageIndex];
      
      if (!page) {
        return {
          error: `Page not found: ${payload.pageId}`
        };
      }

      // Extract components used in the page
      const componentRegex = /<([a-z][a-z0-9-]*)[^>]*>/g;
      const componentsUsed: string[] = [];
      let match;
      
      const pageHtml = page.html || page.structure || '';
      
      while ((match = componentRegex.exec(pageHtml)) !== null) {
        const componentName = (match[1] as string) || '';
        if (!componentName.startsWith('el-') && !componentsUsed.includes(componentName)) {
          componentsUsed.push(componentName);
        }
      }

      const result = {
        pageId: payload.pageId,
        title: page.title,
        html: page.html || page.structure, // Handle both possible field names
        fullHtmlContent: page.html || page.structure, // Full HTML for precise replacement
        requirements: page.requirements || [],
        componentsUsed,
        targetAudience: page.targetAudience,
        navBarPosition: page.navBarPosition
      };
      
      // Add instruction as a separate message
      logger.info('getPageContext completed - agent MUST call editPage() next');
      
      return result;
    } catch (error) {
      logger.error('Error getting page context', error);
      return {
        error: `Failed to get page context: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const getExistingComponentsCalling = {
  type: 'function',
  name: 'getExistingComponents',
  description: 'Get list of available components with descriptions',
  parameters: {
    type: 'object',
    properties: {
      filter: { 
        type: 'string', 
        description: 'Optional filter to find components relevant to your task (e.g., "form", "table", "card")' 
      }
    },
    required: []
  },
  function: {
    name: 'getExistingComponents',
    description: 'Get list of available components with descriptions',
    parameters: {
      type: 'object',
      properties: {
        filter: { 
          type: 'string', 
          description: 'Optional filter to find components relevant to your task (e.g., "form", "table", "card")' 
        }
      },
      required: []
    }
  },
  handler: async (req, payload: { filter?: string }) => {
    try {
      const tenant = req.headers.tenant;
      const components = await getComponents(tenant);
      
      let filteredComponents = components.map(c => ({
        id: c._id,
        name: c.componentName,
        description: c.description,
        props: c.props || {}
      }));

      // Apply filter if provided
      if (payload.filter) {
        const filterTerms = payload.filter.toLowerCase().split(',').map(t => t.trim());
        filteredComponents = filteredComponents.filter(c => {
          const nameLower = c.name.toLowerCase();
          const descLower = c.description.toLowerCase();
          
          // Check if ANY filter term matches
          return filterTerms.some(term => 
            nameLower.includes(term) ||
            descLower.includes(term) ||
            // Also check camelCase splitting (e.g., "BalloonsCard" contains "balloons" and "card")
            nameLower.replace(/([A-Z])/g, ' $1').toLowerCase().includes(term)
          );
        });
      }

      return {
        components: filteredComponents,
        total: filteredComponents.length
      };
    } catch (error) {
      logger.error('Error getting existing components', error);
      return {
        error: `Failed to get components: ${error instanceof Error ? error.message : 'Unknown error'}`,
        components: []
      };
    }
  }
};

export const getBlueprintInfoCalling = {
  type: 'function',
  name: 'getBlueprintInfo',
  description: 'Get blueprint schema and field information',
  parameters: {
    type: 'object',
    properties: {
      blueprintNames: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Array of blueprint names to get info for. If empty, returns all blueprints.' 
      }
    },
    required: []
  },
  function: {
    name: 'getBlueprintInfo',
    description: 'Get blueprint schema and field information',
    parameters: {
      type: 'object',
      properties: {
        blueprintNames: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of blueprint names to get info for. If empty, returns all blueprints.' 
        }
      },
      required: []
    }
  },
  handler: async (req, payload: { blueprintNames?: string[] }) => {
    try {
      const tenant = req.headers.tenant;
      const blueprints = await getAllBlueprints(tenant, {});
      
      let filteredBlueprints = blueprints;
      
      if (payload.blueprintNames && payload.blueprintNames.length > 0) {
        filteredBlueprints = blueprints.filter(b => 
          payload.blueprintNames!.includes(b.name)
        );
      }

      const blueprintInfo = filteredBlueprints.map(b => ({
        name: b.name,
        displayName: b.displayName || b.name,
        description: b.description,
        fields: b.properties ? Object.keys(b.properties).map(key => ({
          name: key,
          type: b.properties[key].type,
          required: b.properties[key].required || false,
          description: b.properties[key].description
        })) : []
      }));

      return {
        blueprints: blueprintInfo,
        total: blueprintInfo.length
      };
    } catch (error) {
      logger.error('Error getting blueprint info', error);
      return {
        error: `Failed to get blueprint info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        blueprints: []
      };
    }
  }
};
