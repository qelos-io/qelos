import { calPublicPluginsService, createPlugin } from "../plugins-service-api";
import logger from "../logger";
import { IScreenRequirement } from "@qelos/global-types";
import { getBlueprint } from "../no-code-service";

// Helper functions for plugin and page operations
async function getPluginAndPage(pluginId: string, pageId: string, headers: any) {
  if (!pluginId) {
    throw new Error('Plugin ID is required');
  }
  
  if (!pageId) {
    throw new Error('Page ID is required');
  }

  try {
    // Get the plugin first to verify it exists
    const plugin = await calPublicPluginsService(
      `/api/plugins/${pluginId}`, 
      { tenant: headers.tenant, user: headers.user }, 
      { data: {}, method: 'GET' }
    );
    
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }
    
    // Find the page to update
    const pageIndex = plugin.microFrontends?.findIndex(page => page._id === pageId);
    
    if (pageIndex === undefined || pageIndex === -1 || !plugin.microFrontends) {
      throw new Error(`Page with ID ${pageId} not found in plugin ${pluginId}`);
    }
    
    return { plugin, pageIndex };
  } catch (error: any) {
    throw new Error(`Failed to get plugin or page: ${error?.message || 'Unknown error'}`);
  }
}

async function updatePluginPage(plugin: any, pageIndex: number, updatedPage: any, headers: any) {
  try {
    // Create a new microFrontends array with the updated page
    const updatedMicroFrontends = [...plugin.microFrontends];
    updatedMicroFrontends[pageIndex] = updatedPage;
    
    // Update the plugin with the new microFrontends array
    const updatedPlugin = await calPublicPluginsService(
      `/api/plugins/${plugin._id}`,
      { tenant: headers.tenant, user: headers.user },
      { data: { ...plugin, microFrontends: updatedMicroFrontends }, method: 'PUT' }
    );
    
    // Return the updated page
    return updatedPlugin.microFrontends[pageIndex];
  } catch (error: any) {
    throw new Error(`Failed to update page: ${error?.message || 'Unknown error'}`);
  }
}

export const createPageCalling = {
    type: 'function',
    name: 'createPage',
    description: 'Create a new page for the application. Returns the created page.',
    function: {
        name: 'createPage',
        description: 'Create a new page for the application. Returns the created page.',
        parameters: {
          type: 'object',
          properties: {
              title: { type: 'string', description: 'Title of the page' },
              description: { type: 'string', description: 'Description of the page. Optional.' },
              targetAudience: { type: 'string', enum: ['guest', 'user', 'admin'], default: 'guest', description: 'Target audience for the page. Can be guest, user or admin. go for "user" if not specified.' },
              navBarPosition: { type: 'string', enum: ['top', 'bottom', 'user-dropdown', false], default: 'top', description: 'Position of the page in the navigation bar. Can be top, bottom, user-dropdown or false. go for "top" if not specified.' },
              html: { type: 'string',
                description: `HTML content of the page. Optional.
Try to be creative and make it look good. you can use vue.js template syntax (only. no script tags or anything else) inside the html, you can use any Element-Plus component.
You can also use any component created by the "createComponent" function.`
              },
              requirements: {
                type: 'array', 
                description: `Requirements for the page. Optional. Will be handled by pinia as page state. Consider to use helper tools to create a requirement object, such as "getHTTPRequirementForPage" or "getBlueprintRequirementForPage"`, 
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string', description: 'Key of the requirement. This key can be used inside the template.' },
                    fromHTTP: { type: 'object', description: 'HTTP requirement. Optional. This object will be passed to an http request method.' },
                    fromCrud: { type: 'object', description: 'CRUD requirement. Optional.' },
                    fromBlueprint: { type: 'object', description: 'Blueprint requirement. Optional. can be used to get data from a blueprint entity/entities.' },
                    fromData: { type: 'object', description: 'Data requirement. Optional. This is a JSON object that will be passed to the page.' },
                  },  
                  required: ['key']
                }
              },
          },
          required: ['title', 'targetAudience'],
      },
    },
    handler: async (req, payload = { title: '', description: '', targetAudience: 'guest', navBarPosition: 'top', html: '', requirements: [] }) => {
      const tenant = req.headers.tenant;

        if (typeof payload.title !== 'string') {
          throw new Error('title must be a string');
        }

        if (typeof payload.targetAudience !== 'string' || !['guest', 'user', 'admin'].includes(payload.targetAudience)) {
          throw new Error('targetAudience must be one of: guest, user, admin');
        }

        const roles = (payload.targetAudience === 'guest' || payload.targetAudience === 'user') ? ['*'] : ['admin'];

        const plugin = await createPlugin(tenant, req.headers.tenanthost, {
            name: payload.title,
            description: payload.description || '',
            microFrontends: [
              {
                active: true,
                opened: true,
                name: payload.title,
                description: payload.description || '',
                guest: payload.targetAudience === 'guest',
                roles,
                use: 'plain',
                structure: payload.html?.trim() || '<h1>WELCOME TO ' + payload.title + '</h1>',
                searchQuery: false,
                searchPlaceholder: '',
                requirements: payload.requirements || [],
                route: {
                  navBarPosition: payload.navBarPosition,
                  name: payload.title.replace(/\s/g, '-').toLowerCase() + '-page',
                  path: payload.title.replace(/\s/g, '-').toLowerCase(),
                }
              }
            ]
        });

        return plugin;
    }
}

export const getHTTPRequirementForPageCalling = {
    type: 'function',
    name: 'getHTTPRequirementForPage',
    description: 'Get HTTP requirement for page. Returns the requirement object. This is used to create a requirement for a page that will be loaded from an HTTP request on the client side when page is loaded.',
    function: {
        name: 'getHTTPRequirementForPage',
        description: 'Get HTTP requirement for page. Returns the requirement object. This is used to create a requirement for a page that will be loaded from an HTTP request on the client side when page is loaded.',
        parameters: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'Key of the requirement' },
                url: { type: 'string', description: 'URL of the requirement.' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'Method of the requirement' },
                query: { type: 'object', description: 'Query of the requirement' },
            },
            required: ['key', 'url', 'method']
        },
    },
    handler: async (req, payload = { key: '', url: '', method: 'GET', query: {} }) => {
        const { key, url, method, query } = payload;

        return {
          key,
          fromHTTP: {
            uri: url?.startsWith('http') ? url : ('https://' + url),
            method,
            query,
          }
        }
    }
}

export const getBlueprintRequirementForPageCalling = {
    type: 'function',
    name: 'getBlueprintRequirementForPage',
    description: 'Get blueprint requirement for page. Returns the requirement object. This is used to create a requirement for a page that will be loaded from the blueprints entities API.',
    function: {
        name: 'getBlueprintRequirementForPage',
        description: 'Get blueprint requirement for page. Returns the requirement object. This is used to create a requirement for a page that will be loaded from the blueprints entities API.',
        parameters: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'Key of the requirement' },
                blueprint: { type: 'string', description: 'Blueprint of the requirement.' },
                isSingle: { type: 'boolean', description: 'Whether the requirement is for a single entity or a list of entities. If true, the requirement will get entity id from page $route.params.id' },
                query: { type: 'object', description: 'filter query for multiple entities' },
            },
            required: ['key', 'blueprint', 'isSingle']
        },
    },
    handler: async (req, payload = { key: '', blueprint: '', isSingle: false, query: {} }) => {
        const { key, blueprint, isSingle, query } = payload;

        return {
          key,
          fromBlueprint: {
            name: blueprint,
            identifier: isSingle ? 'id' : undefined,
            query: query || {},
          }
        }
    }
}

export const getPagesCalling = {
    type: 'function',
    name: 'getPages',
    description: 'Get pages by query. Returns a list of pages that match the query.',
    function: {
        name: 'getPages',
        description: 'Get pages by query. Returns a list of pages that match the query.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query to filter pages by name or description' },
                limit: { type: 'number', description: 'Limit of pages to return' },
            },
            required: ['query', 'limit']
        },
    },
    handler: async (req, payload = { query: '', limit: 10 }) => {
      try {
        const tenant = req.headers.tenant;
        
        // Call the plugins service to get all plugins
        const plugins = await calPublicPluginsService('/api/plugins', {tenant, user: req.headers.user}, {method: 'GET'}) as any[];
        
        // Extract all microFrontends (pages) from plugins
        let pages: Array<{
          name?: string;
          description?: string;
          structure?: string;
          requirements: IScreenRequirement[]
          pluginId?: string;
          pluginName?: string;
          [key: string]: any;
        }> = [];
        
        // Ensure plugins is an array before processing
        if (!Array.isArray(plugins)) {
          throw new Error('Invalid response from plugins service: expected an array');
        }
        
        plugins.forEach(plugin => {
          if (plugin && plugin.microFrontends && Array.isArray(plugin.microFrontends)) {
            // Add plugin ID and name to each microFrontend for reference
            const microFrontends = plugin.microFrontends.map(mfe => ({
              ...mfe,
              pluginId: plugin._id,
              pluginName: plugin.name
            }));
            pages = [...pages, ...microFrontends];
          }
        });
        
        // Filter pages by query if provided
        if (payload.query && payload.query.trim() !== '') {
          const query = payload.query.toLowerCase();
          
          // Calculate similarity score for each page
          const scoredPages = pages.map(page => {
            let score = 0;
            const pageName = page.name?.toLowerCase() || '';
            const pageDesc = page.description?.toLowerCase() || '';
            
            // Exact name match gets highest score
            if (pageName === query) {
              score += 100;
            } 
            // Name starts with query gets high score
            else if (pageName.startsWith(query)) {
              score += 75;
            }
            // Name includes query gets medium score
            else if (pageName.includes(query)) {
              score += 50;
            }
            // Description includes query gets lower score
            if (pageDesc.includes(query)) {
              score += 25;
            }
            
            return { page, score };
          });
          
          // Filter out pages with no match
          const matchedPages = scoredPages.filter(item => item.score > 0);
          
          // Sort by score (highest first)
          matchedPages.sort((a, b) => b.score - a.score);
          
          // Limit results by the provided limit or default to 10
          const limitedResults = matchedPages.slice(0, payload.limit || 10);
          
          // Extract just the page objects
          pages = limitedResults.map(item => item.page);
        }
        
        return pages;
      } catch (error: unknown) {
        logger.error('Error in getPages function:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return [{ error: `Failed to retrieve pages: ${errorMessage}` }];
      }
    }
}

export const editPageCalling = {
  type: 'function',
  name: 'editPage',
  description: 'Edit an existing page in a plugin',
  function: {
    name: 'editPage',
    description: 'Edit an existing page in a plugin',
    parameters: {
      type: 'object',
      properties: {
        pluginId: { type: 'string', description: 'ID of the plugin containing the page' },
        pageId: { type: 'string', description: 'ID of the page to edit' },
        name: { type: 'string', description: 'New name for the page' },
        description: { type: 'string', description: 'New description for the page' },
        structure: { type: 'string', description: 'New structure for the page (HTML string with Vue.js template syntax)' },
        requirements: {
          type: 'array',
          description: 'Updated requirements for the page',
          items: {
            type: 'object',
            description: 'Requirement for the page. Use "getHTTPRequirementForPage" or "getBlueprintRequirementForPage" tools to generate the requirement object.',
            oneOf: [
              {
                properties: {
                  key: { type: 'string', description: 'Key of the requirement' },
                  fromHTTP: { type: 'object', description: 'HTTP requirement. This object will be passed to an http request method.' },
                },
                required: ['key', 'fromHTTP']
              },
              {
                properties: {
                  key: { type: 'string', description: 'Key of the requirement' },
                  fromBlueprint: { type: 'object', description: 'Blueprint requirement. This object will be passed to a blueprints entities API.' },
                },
                required: ['key', 'fromBlueprint']
              }
            ],
          }
        }
      }
    },
    required: ['pluginId', 'pageId', 'structure', 'requirements']
  },
  handler: async (req, payload) => {    
    try {
      // Get the plugin and page using the helper function
      const { plugin, pageIndex } = await getPluginAndPage(payload.pluginId, payload.pageId, req.headers);
      
      // Create updated page object with only the fields that are provided
      const updatedPage = { ...plugin.microFrontends[pageIndex] };
      
      if (payload.name !== undefined) {
        updatedPage.name = payload.name;
      } 
      
      if (payload.description !== undefined) {
        updatedPage.description = payload.description;
      }
      
      if (payload.structure !== undefined) {
        updatedPage.structure = payload.structure;
      }
      
      if (payload.requirements !== undefined) {
        updatedPage.requirements = payload.requirements;
      }
      
      // Update the plugin and return the updated page
      return await updatePluginPage(plugin, pageIndex, updatedPage, req.headers);
    } catch (error: any) {
      throw new Error(`Failed to edit page: ${error?.message || 'Unknown error'}`);
    }
  }
}

export const addFreeTextToPageCalling = {
  type: 'function',
  name: 'addFreeTextToPage',
  description: 'Add free text content to a page',
  function: {
    name: 'addFreeTextToPage',
    description: 'Add free text content to a page. This can include HTML markup and Vue template syntax.',
    parameters: {
      type: 'object',
      properties: {
        pluginId: { type: 'string', description: 'ID of the plugin containing the page' },
        pageId: { type: 'string', description: 'ID of the page to add content to' },
        position: { type: 'string', enum: ['top', 'bottom'], description: 'Position of the content to add. Can be "top" or "bottom". default is "bottom"' },
        content: { type: 'string', description: 'HTML content to add to the page. Can include Vue template syntax.' },
      },
      required: ['pluginId', 'pageId', 'position', 'content']
    },  
  },
  handler: async (req, payload) => {
      if (!payload.position) {
        throw new Error('Position is required');
      }
      
      if (!payload.content) {
        throw new Error('Content is required');
      }
      
      try {
        // Get the plugin and page using the helper function
        const { plugin, pageIndex } = await getPluginAndPage(payload.pluginId, payload.pageId, req.headers);
        
        // Create updated page object with only the fields that are provided
        const updatedPage = { ...plugin.microFrontends[pageIndex] };

        if (payload.position === 'top') {
          updatedPage.structure = payload.content + updatedPage.structure;
        } else {
          updatedPage.structure = updatedPage.structure + payload.content;
        }

        // Update the plugin and return the updated page
        return await updatePluginPage(plugin, pageIndex, updatedPage, req.headers);
      } catch (error: any) {
        throw new Error(`Failed to add free text to page: ${error?.message || 'Unknown error'}`);
      }
  }
}

export const addGridToPageCalling = {
  type: 'function',
  name: 'addGridToPage',
  description: 'Add a grid component for a blueprint to a page',
  function: {
    name: 'addGridToPage',
    description: 'Add a grid component for displaying blueprint entities in a card layout',
    parameters: {
      type: 'object',
      properties: {
        pluginId: { type: 'string', description: 'ID of the plugin containing the page' },
        pageId: { type: 'string', description: 'ID of the page to add content to' },
        position: { type: 'string', enum: ['top', 'bottom'], description: 'Position of the content to add. Can be "top" or "bottom". Default is "bottom"' },
        blueprintIdentifier: { type: 'string', description: 'Identifier of the blueprint to display in the grid' },
        withEditDialog: { type: 'boolean', description: 'Whether to include an edit dialog for the entities', default: true },
        withDeleteConfirmation: { type: 'boolean', description: 'Whether to include delete confirmation for entities', default: true },
      },
      required: ['pluginId', 'pageId', 'blueprintIdentifier']
    },  
  },
  handler: async (req, payload) => {
      if (!payload.position) {
        throw new Error('Position is required');
      }
      
      if (!payload.blueprintIdentifier) {
        throw new Error('Blueprint identifier is required');
      }
      
      try {
        // Get the plugin and page using the helper function
        const { plugin, pageIndex } = await getPluginAndPage(payload.pluginId, payload.pageId, req.headers);
        
        // Create updated page object with only the fields that are provided
        const updatedPage = { ...plugin.microFrontends[pageIndex] };
        
        // Get plural form of blueprint identifier for data key
        const dataKey = `${payload.blueprintIdentifier}s`;
        
        // Create the grid component with proper requirements
        let gridContent = '';
        let requirementsToAdd: IScreenRequirement[] = [];
        
        // Check if requirements already exist
        const existingRequirements = updatedPage.requirements || [];
        const hasDataRequirement = existingRequirements.some(req => req.key === dataKey);
        
        // Add requirements if they don't exist
        if (!hasDataRequirement) {
          requirementsToAdd.push({
            key: dataKey,
            fromBlueprint: { name: payload.blueprintIdentifier }
          });
        }
        
        // Create empty state message
        gridContent += `
<el-empty v-if="${dataKey}?.loaded && !${dataKey}.result?.length" description="No ${payload.blueprintIdentifier} found">  
  <el-button type="primary" @click="$router.push({query: {...$route.query, mode: 'create'}})">Create ${payload.blueprintIdentifier}</el-button>
</el-empty>`;
        
        // Create grid component
        gridContent += `
<div class="flex-row-column flex-wrap" v-if="${dataKey}?.loaded && ${dataKey}.result?.length">
  <block-item v-for="item in ${dataKey}.result" :key="item.identifier" class="flex-1 property-card">
    <template #title>
      {{ item.metadata?.title || item.metadata?.name || 'Untitled' }}
    </template>
    
    <div class="item-properties flex-container">
      <div v-for="(value, key) in item.metadata" :key="key" class="property-row" v-if="key !== 'title' && typeof value !== 'object'">
        <strong>{{key}}:</strong> {{value}}
      </div>
    </div>
    
    <template #actions>
      <div class="flex-row flex-space">
        <el-button 
          type="primary" 
          circle
          @click="pageState.${payload.blueprintIdentifier}ToEdit = item.metadata; $router.push({query: {...$route.query, mode: 'edit', identifier: item.identifier}})">
          <el-icon><icon-edit></icon-edit></el-icon>
        </el-button>
        <el-button 
          type="danger" 
          circle 
          @click="pageState ? (pageState.${dataKey}ToRemove = item.identifier) : null"
        ><el-icon><icon-delete></icon-delete></el-icon></el-button>
      </div>
    </template>
  </block-item>
</div>`;

        // Add edit dialog if requested
        if (payload.withEditDialog !== false) {
          gridContent += `
<blueprint-entity-form
  v-if="$route.query.mode === 'create' || $route.query.mode === 'edit'"
  :navigate-after-submit="{ query: {} }" 
  blueprint="${payload.blueprintIdentifier}" 
  v-bind:data="pageState.${payload.blueprintIdentifier}ToEdit"
  v-bind:identifier="$route.query.identifier"
  v-bind:clear-after-submit="true"
>
  <el-dialog :model-value="$route.query.mode === 'create' || $route.query.mode === 'edit'" @close="$router.push({ query: {} })">
    <h2>{{$route.query.identifier ? 'Edit' : 'Create'}} ${payload.blueprintIdentifier}</h2>
    <template #footer>
      <el-button type="primary" native-type="submit">
        {{ $t('Save') }}
      </el-button>
      <el-button @click="$router.push({ query: {} })">
        {{ $t('Cancel') }}
      </el-button>
    </template>
  </el-dialog>
</blueprint-entity-form>`;
          
          // Add pageState requirement if it doesn't exist
          const hasPageStateRequirement = existingRequirements.some(req => req.key === 'pageState');
          if (!hasPageStateRequirement) {
            requirementsToAdd.push({
              key: 'pageState',
              fromData: { pageTitle: payload.blueprintIdentifier }
            });
          }
        }
        
        // Add delete confirmation if requested
        if (payload.withDeleteConfirmation !== false) {
          gridContent += `
<el-dialog v-model="!!pageState?.${dataKey}ToRemove" title="Confirm Delete" width="30%">
  <span>Are you sure you want to delete this ${payload.blueprintIdentifier}?</span>
  <template #footer>
    <span class="dialog-footer">
      <el-button @click="pageState.${dataKey}ToRemove = null">Cancel</el-button>
      <el-button
        type="danger"
        @click="sdk.blueprints.deleteEntity('${payload.blueprintIdentifier}', pageState.${dataKey}ToRemove).then(() => { pageState.${dataKey}ToRemove = null; sdk.blueprints.getEntities('${payload.blueprintIdentifier}').then(result => { ${dataKey}.result = result }) })"
      >
        Confirm
      </el-button>
    </span>
  </template>
</el-dialog>`;
        }
        
        // Update page requirements if needed
        if (requirementsToAdd.length > 0) {
          updatedPage.requirements = [...existingRequirements, ...requirementsToAdd];
        }

        // Add the grid content to the page
        if (payload.position === 'top') {
          updatedPage.structure = gridContent + updatedPage.structure;
        } else {
          updatedPage.structure = updatedPage.structure + gridContent;
        }

        // Update the plugin and return the updated page
        return await updatePluginPage(plugin, pageIndex, updatedPage, req.headers);
      } catch (error: any) {
        throw new Error(`Failed to add grid to page: ${error?.message || 'Unknown error'}`);
      }
  }
}

export const addTableToPageCalling = {
  type: 'function',
  name: 'addTableToPage',
  description: 'Add a table component for a blueprint to a page',
  function: {
    name: 'addTableToPage',
    description: 'Add a table component for displaying blueprint entities in a tabular layout',
    parameters: {
      type: 'object',
      properties: {
        pluginId: { type: 'string', description: 'ID of the plugin containing the page' },
        pageId: { type: 'string', description: 'ID of the page to add content to' },
        position: { type: 'string', enum: ['top', 'bottom'], description: 'Position of the content to add. Can be "top" or "bottom". Default is "bottom"' },
        blueprintIdentifier: { type: 'string', description: 'Identifier of the blueprint to display in the table' },
        withEditDialog: { type: 'boolean', description: 'Whether to include an edit dialog for the entities', default: true },
        withDeleteConfirmation: { type: 'boolean', description: 'Whether to include delete confirmation for entities', default: true },
      },
      required: ['pluginId', 'pageId', 'blueprintIdentifier']
    },  
  },
  handler: async (req, payload) => { 
      if (!payload.blueprintIdentifier) {
        throw new Error('Blueprint identifier is required');
      }
      
      try {
        // Get the plugin and page using the helper function
        const { plugin, pageIndex } = await getPluginAndPage(payload.pluginId, payload.pageId, req.headers);
        
        // Create updated page object with only the fields that are provided
        const updatedPage = { ...plugin.microFrontends[pageIndex] };
        
        // Get plural form of blueprint identifier for data key
        const dataKey = `${payload.blueprintIdentifier}s`;
        
        // Create the table component with proper requirements
        let tableContent = '';
        let requirementsToAdd: IScreenRequirement[] = [];
        
        // Check if requirements already exist
        const existingRequirements = updatedPage.requirements || [];
        const hasDataRequirement = existingRequirements.some(req => req.key === dataKey);
        const hasTableColumnsRequirement = existingRequirements.some(req => req.key === 'tableColumns');
        
        // Add requirements if they don't exist
        if (!hasDataRequirement) {
          requirementsToAdd.push({
            key: dataKey,
            fromBlueprint: { name: payload.blueprintIdentifier }
          });
        }
        
        if (!hasTableColumnsRequirement) {
          requirementsToAdd.push({
            key: 'tableColumns',
            fromData: [
              { prop: 'title', label: 'Title' },
              { prop: 'name', label: 'Name' },
              { prop: '_operations', label: ' ' }
            ]
          });
        }
        
        // Create empty state message
        tableContent += `
<el-empty v-if="${dataKey}?.loaded && !${dataKey}.result?.length" description="No ${payload.blueprintIdentifier} found">  
  <el-button type="primary" @click="$router.push({query: {...$route.query, mode: 'create'}})">Create ${payload.blueprintIdentifier}</el-button>
</el-empty>`;
        
        // Create table component
        tableContent += `
<quick-table v-if="${dataKey}?.loaded && ${dataKey}.result?.length" :columns="tableColumns" :data="${dataKey}.result">
  <template #_operations="{row}">
    <div class="flex-row flex-space">
      <el-button 
        type="primary" 
        circle
        @click="pageState.${payload.blueprintIdentifier}ToEdit = row.metadata; $router.push({query: {...$route.query, mode: 'edit', identifier: row.identifier}})">
        <el-icon><icon-edit></icon-edit></el-icon>
      </el-button>
      <el-button 
        type="danger" 
        circle 
        @click="pageState ? (pageState.${dataKey}ToRemove = row.identifier) : null"
      ><el-icon><icon-delete></icon-delete></el-icon></el-button>
    </div>
  </template>
</quick-table>`;

        // Add edit dialog if requested
        if (payload.withEditDialog !== false) {
          tableContent += `
<blueprint-entity-form
  v-if="$route.query.mode === 'create' || $route.query.mode === 'edit'"
  :navigate-after-submit="{ query: {} }" 
  blueprint="${payload.blueprintIdentifier}" 
  v-bind:data="pageState.${payload.blueprintIdentifier}ToEdit"
  v-bind:identifier="$route.query.identifier"
  v-bind:clear-after-submit="true"
>
  <el-dialog :model-value="$route.query.mode === 'create' || $route.query.mode === 'edit'" @close="$router.push({ query: {} })">
    <h2>{{$route.query.identifier ? 'Edit' : 'Create'}} ${payload.blueprintIdentifier}</h2>
    <template #footer>
      <el-button type="primary" native-type="submit">
        {{ $t('Save') }}
      </el-button>
      <el-button @click="$router.push({ query: {} })">
        {{ $t('Cancel') }}
      </el-button>
    </template>
  </el-dialog>
</blueprint-entity-form>`;
          
          // Add pageState requirement if it doesn't exist
          const hasPageStateRequirement = existingRequirements.some(req => req.key === 'pageState');
          if (!hasPageStateRequirement) {
            requirementsToAdd.push({
              key: 'pageState',
              fromData: { pageTitle: payload.blueprintIdentifier }
            });
          }
        }
        
        // Add delete confirmation if requested
        if (payload.withDeleteConfirmation !== false) {
          tableContent += `
<el-dialog v-model="!!pageState?.${dataKey}ToRemove" title="Confirm Delete" width="30%">
  <span>Are you sure you want to delete this ${payload.blueprintIdentifier}?</span>
  <template #footer>
    <span class="dialog-footer">
      <el-button @click="pageState.${dataKey}ToRemove = null">Cancel</el-button>
      <el-button
        type="danger"
        @click="sdk.blueprints.deleteEntity('${payload.blueprintIdentifier}', pageState.${dataKey}ToRemove).then(() => { pageState.${dataKey}ToRemove = null; sdk.blueprints.getEntities('${payload.blueprintIdentifier}').then(result => { ${dataKey}.result = result }) })"
      >
        Confirm
      </el-button>
    </span>
  </template>
</el-dialog>`;
        }
        
        // Update page requirements if needed
        if (requirementsToAdd.length > 0) {
          updatedPage.requirements = [...existingRequirements, ...requirementsToAdd];
        }

        // Add the table content to the page
        if (payload.position === 'top') {
          updatedPage.structure = tableContent + updatedPage.structure;
        } else {
          updatedPage.structure = updatedPage.structure + tableContent;
        }

        // Update the plugin and return the updated page
        return await updatePluginPage(plugin, pageIndex, updatedPage, req.headers);
      } catch (error: any) {
        throw new Error(`Failed to add table to page: ${error?.message || 'Unknown error'}`);
      }
  }
}

// Helper function to generate form inputs based on blueprint properties
function generateBlueprintFormInputs(blueprint: any): string {
  if (!blueprint || !blueprint.properties) {
    return '';
  }
  
  return Object.keys(blueprint.properties).map((propName: string) => {
    const prop = blueprint.properties[propName];
    const propType = prop.type;
    
    // Set element type to 'select' for string properties with enum options
    let elementType = propType === 'boolean' ? 'switch' : propType;
    if (propType === 'string' && Array.isArray(prop.enum) && prop.enum.length > 0) {
      elementType = 'select';
    }
    
    // Check if the property has enum options and prepare the options attribute
    let enumOptionsAttr = '';
    if (Array.isArray(prop.enum) && prop.enum.length > 0) {
      // Convert the enum array to a properly formatted string for Vue template
      const formattedOptions = prop.enum.map((opt: any) => {
        return typeof opt === 'string' ? `'${opt}'` : opt;
      }).join(', ');
      enumOptionsAttr = `:options="[${formattedOptions}]"`;
    }
    
    return `<form-input title="${prop.title || propName}" type="${elementType}" label="${prop.description || ''}" ${prop.required ? ':required="true"' : ''} ${enumOptionsAttr} v-model="form.${propName}"></form-input>`;
  }).join('\n');
}

export const addFormToPageCalling = {
  type: 'function',
  name: 'addFormToPage',
  description: 'Add a form component for a blueprint to a page',
  function: {
    name: 'addFormToPage',
    description: 'Add a form component for creating or editing blueprint entities',
    parameters: {
      type: 'object',
      properties: {
        pluginId: { type: 'string', description: 'ID of the plugin containing the page' },
        pageId: { type: 'string', description: 'ID of the page to add content to' },
        position: { type: 'string', enum: ['top', 'bottom'], description: 'Position of the content to add. Can be "top" or "bottom". Default is "bottom"', default: 'bottom' },
        blueprintIdentifier: { type: 'string', description: 'Identifier of the blueprint to use for the form' },
        asModal: { type: 'boolean', description: 'Whether to render the form as a modal dialog or directly on the page', default: true },
        modalTrigger: { type: 'string', description: 'Query parameter to trigger the modal (only used if asModal is true)', default: 'mode' },
        clearAfterSubmit: { type: 'boolean', description: 'Whether to clear the form after submission', default: true },
      },
      required: ['pluginId', 'pageId', 'blueprintIdentifier']
    },  
  },
  handler: async (req, payload) => {
      
      if (!payload.blueprintIdentifier) {
        throw new Error('Blueprint identifier is required');
      }
      
      try {
        // Get the plugin and page using the helper function
        const { plugin, pageIndex } = await getPluginAndPage(payload.pluginId, payload.pageId, req.headers);
        
        // Create updated page object with only the fields that are provided
        const updatedPage = { ...plugin.microFrontends[pageIndex] };
        
        // Create the form component with proper requirements
        let formContent = '';
        let requirementsToAdd: IScreenRequirement[] = [];
        
        // Check if requirements already exist
        const existingRequirements = updatedPage.requirements || [];
        
        // Add pageState requirement if it doesn't exist
        const hasPageStateRequirement = existingRequirements.some(req => req.key === 'pageState');
        if (!hasPageStateRequirement) {
          requirementsToAdd.push({
            key: 'pageState',
            fromData: { pageTitle: payload.blueprintIdentifier }
          });
        }
        
        const modalTrigger = payload.modalTrigger || 'mode';
        const clearAfterSubmit = payload.clearAfterSubmit !== false;
        
        // Get blueprint details to generate form inputs
        const blueprint = await getBlueprint(req.headers.tenant, payload.blueprintIdentifier);
        
        // Generate form inputs based on blueprint properties
        const formInputs = generateBlueprintFormInputs(blueprint);
        
        // Create form component
        if (payload.asModal !== false) {
          // Create form as modal dialog
          formContent = `
<blueprint-entity-form
  v-if="$route.query.${modalTrigger} === 'create' || $route.query.${modalTrigger} === 'edit'"
  :navigate-after-submit="{ query: {} }" 
  blueprint="${payload.blueprintIdentifier}" 
  v-bind:data="pageState.${payload.blueprintIdentifier}ToEdit"
  v-bind:identifier="$route.query.identifier"
  v-bind:clear-after-submit="${clearAfterSubmit}"
>
  <template #default="{form}">
    <el-dialog :model-value="$route.query.${modalTrigger} === 'create' || $route.query.${modalTrigger} === 'edit'" @close="$router.push({ query: {} })">
      <h2>{{$route.query.identifier ? 'Edit' : 'Create'}} ${payload.blueprintIdentifier}</h2>
      
        <div class="container">
          ${formInputs}
        </div>
      
      <template #footer>
        <el-button type="primary" native-type="submit">
          {{ $t('Save') }}
        </el-button>
        <el-button @click="$router.push({ query: {} })">
          {{ $t('Cancel') }}
        </el-button>
      </template>
    </el-dialog>
  </template>
</blueprint-entity-form>

<el-button type="primary" @click="$router.push({query: {${modalTrigger}: 'create'}})">
  Create ${payload.blueprintIdentifier}
</el-button>`;
        } else {
          // Create form directly on the page (without dialog)
          formContent = `
<h2>{{$route.query.identifier ? 'Edit' : 'Create'}} ${payload.blueprintIdentifier}</h2>

<blueprint-entity-form
  blueprint="${payload.blueprintIdentifier}" 
  v-bind:data="pageState.${payload.blueprintIdentifier}ToEdit"
  v-bind:identifier="$route.query.identifier"
  v-bind:clear-after-submit="${clearAfterSubmit}"
>
  <template #default="{form}">
    <div class="container">
      ${formInputs}
    </div>
  </template>
  
  <div class="form-actions" style="margin-top: 20px;">
    <el-button type="primary" native-type="submit">
      {{ $t('Save') }}
    </el-button>
    <el-button @click="pageState.${payload.blueprintIdentifier}ToEdit = {}">
      {{ $t('Cancel') }}
    </el-button>
  </div>
</blueprint-entity-form>`;
        }
        
        // Update page requirements if needed
        if (requirementsToAdd.length > 0) {
          updatedPage.requirements = [...existingRequirements, ...requirementsToAdd];
        }

        // Add the form content to the page
        if (payload.position === 'top') {
          updatedPage.structure = formContent + updatedPage.structure;
        } else {
          updatedPage.structure = updatedPage.structure + formContent;
        }

        // Update the plugin and return the updated page
        return await updatePluginPage(plugin, pageIndex, updatedPage, req.headers);
      } catch (error: any) {
        throw new Error(`Failed to add form to page: ${error?.message || 'Unknown error'}`);
      }
  }
}