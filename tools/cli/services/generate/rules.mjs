import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.mjs';

/**
 * Fetch Qelos global components from documentation
 * @returns {Promise<Object>} Object with components and directives
 */
async function fetchQelosGlobalComponents() {
  try {
    const response = await fetch('https://docs.qelos.io/pre-designed-frontends/components/');
    if (!response.ok) {
      logger.debug('Failed to fetch Qelos components documentation');
      return null;
    }
    
    const html = await response.text();
    
    // Extract component names and descriptions from the HTML
    const components = [];
    const directives = [];
    
    // Documented components with links and descriptions
    const documentedComponents = [
      { name: 'ai-chat', description: 'Complete AI chat interface with streaming, file attachments, and customizable UI' },
      { name: 'form-input', description: 'Input component for forms' },
      { name: 'form-row-group', description: 'Group form inputs in rows' },
      { name: 'save-button', description: 'Button for saving forms' },
      { name: 'monaco', description: 'Code editor component' },
      { name: 'quick-table', description: 'Simplified table component' },
      { name: 'v-chart', description: 'Chart visualization component' },
      { name: 'content-box', description: 'Component that loads HTML content blocks from the database' },
      { name: 'copy-to-clipboard', description: 'Button to copy content to clipboard' },
      { name: 'empty-state', description: 'Component for empty state display' },
      { name: 'life-cycle', description: 'Component for displaying lifecycle stages' },
      { name: 'q-pre', description: 'Pre-formatted text component with HTML escaping and line break handling' }
    ];
    
    // Other available components
    const otherComponents = [
      { name: 'edit-header', description: 'Header for edit pages' },
      { name: 'info-icon', description: 'Icon with tooltip information' },
      { name: 'block-item', description: 'Block container for content' },
      { name: 'list-page-title', description: 'Title component for list pages' },
      { name: 'general-form', description: 'Generic form component' },
      { name: 'blueprint-entity-form', description: 'Form for blueprint entities' },
      { name: 'confirm-message', description: 'Confirmation dialog component' },
      { name: 'remove-button', description: 'Button for deletion actions' },
      { name: 'editable-content', description: 'Content that can be edited inline' },
      { name: 'remove-confirmation', description: 'Confirmation dialog for delete actions' },
      { name: 'stats-card', description: 'Card for displaying statistics' },
      { name: 'q-rating', description: 'Rating component' }
    ];
    
    components.push(...documentedComponents, ...otherComponents);
    
    // Directives
    directives.push({ name: 'v-loading', description: 'Adds loading state to an element' });
    
    return { components, directives };
  } catch (error) {
    logger.debug(`Failed to fetch Qelos components: ${error.message}`);
    return null;
  }
}

/**
 * Scan directory for pulled resources
 * @param {string} basePath - Base path to scan
 * @returns {Object} Object containing found resources
 */
function scanPulledResources(basePath) {
  const resources = {
    components: null,
    blocks: null,
    blueprints: [],
    plugins: [],
    microFrontends: []
  };

  // Check for components directory and components.json
  const componentsPath = path.join(basePath, 'components');
  const componentsJsonPath = path.join(componentsPath, 'components.json');
  if (fs.existsSync(componentsJsonPath)) {
    try {
      resources.components = {
        path: componentsPath,
        metadata: JSON.parse(fs.readFileSync(componentsJsonPath, 'utf-8'))
      };
    } catch (error) {
      logger.debug(`Failed to parse components.json: ${error.message}`);
    }
  }

  // Check for blocks directory and blocks.json
  const blocksPath = path.join(basePath, 'blocks');
  const blocksJsonPath = path.join(blocksPath, 'blocks.json');
  if (fs.existsSync(blocksJsonPath)) {
    try {
      resources.blocks = {
        path: blocksPath,
        metadata: JSON.parse(fs.readFileSync(blocksJsonPath, 'utf-8'))
      };
    } catch (error) {
      logger.debug(`Failed to parse blocks.json: ${error.message}`);
    }
  }

  // Check for blueprints directory
  const blueprintsPath = path.join(basePath, 'blueprints');
  if (fs.existsSync(blueprintsPath)) {
    const blueprintFiles = fs.readdirSync(blueprintsPath)
      .filter(f => f.endsWith('.blueprint.json'));
    
    for (const file of blueprintFiles) {
      try {
        const blueprint = JSON.parse(
          fs.readFileSync(path.join(blueprintsPath, file), 'utf-8')
        );
        resources.blueprints.push({
          file,
          identifier: blueprint.identifier,
          name: blueprint.name,
          properties: blueprint.properties,
          relations: blueprint.relations,
          dispatchers: blueprint.dispatchers
        });
      } catch (error) {
        logger.debug(`Failed to parse ${file}: ${error.message}`);
      }
    }
  }

  // Check for plugins directory
  const pluginsPath = path.join(basePath, 'plugins');
  if (fs.existsSync(pluginsPath)) {
    const pluginFiles = fs.readdirSync(pluginsPath)
      .filter(f => f.endsWith('.plugin.json'));
    
    for (const file of pluginFiles) {
      try {
        const plugin = JSON.parse(
          fs.readFileSync(path.join(pluginsPath, file), 'utf-8')
        );
        resources.plugins.push({
          file,
          apiPath: plugin.apiPath,
          name: plugin.name,
          microFrontends: plugin.microFrontends || [],
          injectables: plugin.injectables || [],
          navBarGroups: plugin.navBarGroups || []
        });

        // Check for micro-frontends directory
        const microFrontendsDir = path.join(pluginsPath, 'micro-frontends');
        if (fs.existsSync(microFrontendsDir)) {
          const htmlFiles = fs.readdirSync(microFrontendsDir)
            .filter(f => f.endsWith('.html'));
          
          for (const htmlFile of htmlFiles) {
            resources.microFrontends.push({
              file: htmlFile,
              pluginApiPath: plugin.apiPath,
              path: path.join(microFrontendsDir, htmlFile)
            });
          }
        }
      } catch (error) {
        logger.debug(`Failed to parse ${file}: ${error.message}`);
      }
    }
  }

  return resources;
}

/**
 * Generate rules content for components
 * @param {Object} resources - Scanned resources
 * @param {Object} qelosComponents - Qelos global components from docs
 * @returns {string} Generated rules content
 */
function generateComponentsContent(resources, qelosComponents) {
  const sections = [];

  sections.push('---');
  sections.push('trigger: glob');
  sections.push('globs: ["components/**/*.vue", "components.json"]');
  sections.push('---');
  sections.push('# Vue Components Rules');
  sections.push('');
  sections.push('This file contains rules for working with Vue 3.5 Single File Components in the Qelos project.');
  sections.push('');
  sections.push('## Component Structure');
  sections.push('- Components are Vue 3.5 Single File Components (.vue files)');
  sections.push('- Each component has metadata stored in `components.json`');
  sections.push('- Use Composition API with `<script setup>` syntax');
  sections.push('- Components can use Vue Router, Element Plus, and Vue I18n');
  sections.push('');
  sections.push('## Available Libraries & Documentation');
  sections.push('- **Vue 3**: https://vuejs.org/api/');
  sections.push('- **Vue Router**: https://router.vuejs.org/api/');
  sections.push('- **Element Plus**: https://element-plus.org/en-US/component/overview.html');
  sections.push('- **Vue I18n**: https://vue-i18n.intlify.dev/api/general.html');
  sections.push('- **Pinia**: https://pinia.vuejs.org/api/');
  sections.push('');
  sections.push('## Qelos SDK Access');
  sections.push('Components have access to the Qelos SDK instance via the `@sdk` alias:');
  sections.push('```javascript');
  sections.push('import sdk from "@sdk";');
  sections.push('');
  sections.push('// sdk is an instance of QelosAdministratorSDK');
  sections.push('// Available methods include:');
  sections.push('// - sdk.manageComponents');
  sections.push('// - sdk.manageBlueprints');
  sections.push('// - sdk.managePlugins');
  sections.push('// - sdk.manageConfigurations');
  sections.push('// - And more...');
  sections.push('```');
  sections.push('');
  sections.push('**SDK Documentation**: https://docs.qelos.io/sdk/sdk');
  sections.push('');
  sections.push('## Qelos Global Components');
  sections.push('All components and HTML templates can use Qelos pre-designed components **without importing them**.');
  sections.push('These components are globally registered and available everywhere in kebab-case format.');
  sections.push('');
  sections.push('**Documentation**: https://docs.qelos.io/pre-designed-frontends/components/');
  sections.push('');
  
  if (qelosComponents && qelosComponents.components && qelosComponents.components.length > 0) {
    sections.push('**Available Components:**');
    qelosComponents.components.forEach(comp => {
      sections.push(`- \`<${comp.name}>\` - ${comp.description}`);
    });
    sections.push('');
    
    if (qelosComponents.directives && qelosComponents.directives.length > 0) {
      sections.push('**Available Directives:**');
      qelosComponents.directives.forEach(dir => {
        sections.push(`- \`${dir.name}\` - ${dir.description}`);
      });
      sections.push('');
    }
  } else {
    sections.push('**Note**: Visit the documentation link above for the complete list of available components.');
    sections.push('');
  }
  
  sections.push('**Usage Example:**');
  sections.push('```html');
  sections.push('<form-input label="Name" v-model="name"></form-input>');
  sections.push('<save-button @click="saveData"></save-button>');
  sections.push('<content-box title="User Information">Content goes here</content-box>');
  sections.push('<div v-loading="isLoading">Loading content...</div>');
  sections.push('```');
  sections.push('');
  sections.push('**Important**: All components must use kebab-case and have closing tags.');
  sections.push('');
  sections.push('## Component Metadata Mapping');
  sections.push('The `components.json` file maps component names to their metadata:');
  sections.push('```json');
  sections.push('{');
  sections.push('  "VideoPlayer": {');
  sections.push('    "_id": "507f1f77bcf86cd799439011",');
  sections.push('    "componentName": "VideoPlayer",');
  sections.push('    "identifier": "video-player-component",');
  sections.push('    "description": "A reusable video player component"');
  sections.push('  },');
  sections.push('  "UserProfile": {');
  sections.push('    "_id": "507f191e810c19729de860ea",');
  sections.push('    "componentName": "UserProfile",');
  sections.push('    "identifier": "user-profile-component",');
  sections.push('    "description": "Displays user profile information"');
  sections.push('  }');
  sections.push('}');
  sections.push('```');
  sections.push('');
  sections.push('## Component Naming Convention');
  sections.push('Components follow Vue naming conventions:');
  sections.push('- **File names**: PascalCase (e.g., `ProductCard.vue`, `VideoPlayer.vue`)');
  sections.push('- **Template usage**: kebab-case (e.g., `<product-card>`, `<video-player>`)');
  sections.push('- **Conversion**: PascalCase file names are automatically converted to kebab-case in templates');
  sections.push('');
  sections.push('**Example mapping:**');
  sections.push('```');
  sections.push('ProductCard.vue       →  <product-card>');
  sections.push('VideoPlayer.vue       →  <video-player>');
  sections.push('UserProfile.vue       →  <user-profile>');
  sections.push('DataTable.vue         →  <data-table>');
  sections.push('```');
  sections.push('');
  sections.push('When you see a component used in HTML/templates like `<product-card>`,');
  sections.push('the actual component file is `ProductCard.vue` in the components directory.');
  sections.push('');
  sections.push('## Working with Components');
  sections.push('- When modifying a component, update both the `.vue` file and its entry in `components.json`');
  sections.push('- The `_id` field in `components.json` is used to sync with the remote Qelos instance');
  sections.push('- Component files are named exactly as their `componentName` property (e.g., `VideoPlayer.vue`)');
  sections.push('- Use `qelos-cli push components <path>` to push changes back to Qelos');
  sections.push('');

  return sections.join('\n');
}

/**
 * Generate rules content for blocks
 * @param {Object} resources - Scanned resources
 * @returns {string} Generated rules content
 */
function generateBlocksContent(resources) {
  const sections = [];

  sections.push('---');
  sections.push('trigger: glob');
  sections.push('globs: ["blocks/**/*.html", "blocks.json"]');
  sections.push('---');
  sections.push('# Blocks Rules');
  sections.push('');
  sections.push('This file contains rules for working with Qelos blocks.');
  sections.push('');
  sections.push('## Block Structure');
  sections.push('Blocks are HTML templates that can be used throughout the Qelos platform.');
  sections.push('');
  sections.push('## IMPORTANT: Block HTML Limitations');
  sections.push('**Block HTML files CANNOT contain `<script>` tags or JavaScript code.**');
  sections.push('');
  sections.push('To add JavaScript functionality:');
  sections.push('1. Create a Vue component in `components/` folder with your logic');
  sections.push('2. Use the component in your block HTML (kebab-case, with closing tags)');
  sections.push('3. No import needed - all components are globally available');
  sections.push('');
  sections.push('## Using Components in Blocks');
  sections.push('Block HTML files can use components from the `components/` directory:');
  sections.push('```html');
  sections.push('<!-- In blocks/my-block.html -->');
  sections.push('<my-component');
  sections.push('  :data="blockData"');
  sections.push('  @action="handleAction"');
  sections.push('/>');
  sections.push('```');
  sections.push('');
  sections.push('This `<my-component>` component maps to:');
  sections.push('- **Component file**: `components/MyComponent.vue`');
  sections.push('- **Metadata entry**: `components.json["MyComponent"]`');
  sections.push('');
  sections.push('Remember: kebab-case in templates = PascalCase component file name.');
  sections.push('');
  sections.push('## Block Naming Convention');
  sections.push('- **File names**: kebab-case (e.g., `my-block.html`)');
  sections.push('- **Template usage**: Use the block name as defined in the platform');
  sections.push('');
  sections.push('## Working with Blocks');
  sections.push('- Block files are stored in the `blocks/` directory');
  sections.push('- Each block has metadata stored in `blocks.json`');
  sections.push('- When modifying a block, update both the `.html` file and its entry in `blocks.json`');
  sections.push('- The `_id` field in `blocks.json` is used to sync with the remote Qelos instance');
  sections.push('- Use `qelos-cli push blocks <path>` to push changes back to Qelos');
  sections.push('');

  return sections.join('\n');
}

/**
 * Generate rules content for blueprints
 * @param {Object} resources - Scanned resources
 * @returns {string} Generated rules content
 */
function generateBlueprintsContent(resources) {
  const sections = [];

  sections.push('---');
  sections.push('trigger: glob');
  sections.push('globs: ["blueprints/**/*.blueprint.json"]');
  sections.push('---');
  sections.push('# Blueprints Rules');
  sections.push('');
  sections.push('This file contains rules for working with Qelos blueprints that define data models and entity structures.');
  sections.push('');
  sections.push('## Blueprint Structure');
  sections.push('Blueprints define data models and entity structures in Qelos. Each blueprint file contains:');
  sections.push('');
  sections.push('```typescript');
  sections.push('interface IBlueprint {');
  sections.push('  identifier: string;                      // Unique identifier');
  sections.push('  name: string;                            // Display name');
  sections.push('  description?: string;                    // Description');
  sections.push('  entityIdentifierMechanism: string;       // "objectid" or "guid"');
  sections.push('  properties: Record<string, PropertyDescriptor>; // Entity properties/fields');
  sections.push('  relations: { key: string, target: string }[];   // Relations to other blueprints');
  sections.push('  dispatchers: {                           // Event dispatchers');
  sections.push('    create: boolean,');
  sections.push('    update: boolean,');
  sections.push('    delete: boolean');
  sections.push('  };');
  sections.push('  permissions: Array<PermissionsDescriptor>;      // Access permissions');
  sections.push('  permissionScope: string;                 // "user", "workspace", or "tenant"');
  sections.push('  limitations?: Array<Limitation>;         // Usage limitations');
  sections.push('}');
  sections.push('```');
  sections.push('');
  sections.push('## Blueprint Example');
  sections.push('```json');
  sections.push('{');
  sections.push('  "identifier": "product",');
  sections.push('  "name": "Product",');
  sections.push('  "description": "Product catalog item",');
  sections.push('  "entityIdentifierMechanism": "objectid",');
  sections.push('  "permissionScope": "workspace",');
  sections.push('  "properties": {');
  sections.push('    "name": {');
  sections.push('      "title": "Product Name",');
  sections.push('      "type": "string",');
  sections.push('      "description": "Name of the product",');
  sections.push('      "required": true');
  sections.push('    },');
  sections.push('    "price": {');
  sections.push('      "title": "Price",');
  sections.push('      "type": "number",');
  sections.push('      "description": "Product price",');
  sections.push('      "required": true,');
  sections.push('      "min": 0');
  sections.push('    },');
  sections.push('    "inStock": {');
  sections.push('      "title": "In Stock",');
  sections.push('      "type": "boolean",');
  sections.push('      "description": "Whether product is in stock",');
  sections.push('      "required": false');
  sections.push('    }');
  sections.push('  },');
  sections.push('  "relations": [');
  sections.push('    {');
  sections.push('      "key": "category",');
  sections.push('      "target": "product_category"');
  sections.push('    }');
  sections.push('  ],');
  sections.push('  "dispatchers": {');
  sections.push('    "create": true,');
  sections.push('    "update": true,');
  sections.push('    "delete": false');
  sections.push('  },');
  sections.push('  "permissions": [');
  sections.push('    {');
  sections.push('      "scope": "workspace",');
  sections.push('      "operation": "create",');
  sections.push('      "roleBased": ["admin", "editor"]');
  sections.push('    }');
  sections.push('  ]');
  sections.push('}');
  sections.push('```');
  sections.push('');
  sections.push('## Blueprint to Entity Mapping');
  sections.push('When working with blueprint entities:');
  sections.push('- **Properties** define the fields available on each entity instance');
  sections.push('  - Properties is a Record (object) where keys are field names');
  sections.push('  - Example: A `product` entity will have `name`, `price`, and `inStock` fields');
  sections.push('- **Relations** define how entities connect to other blueprint entities');
  sections.push('  - Each relation has a `key` (field name) and `target` (blueprint identifier)');
  sections.push('  - Example: `category` relation to `product_category` blueprint');
  sections.push('- **Dispatchers** define which CRUD operations trigger events');
  sections.push('  - Boolean flags for `create`, `update`, and `delete` operations');
  sections.push('  - Example: Product creation and updates trigger events, but deletion does not');
  sections.push('- **Permissions** control who can perform operations on entities');
  sections.push('  - Scoped at user, workspace, or tenant level');
  sections.push('  - Can be role-based or label-based');
  sections.push('- Use the blueprint structure to understand what data is available when building components');
  sections.push('');
  sections.push('## Working with Blueprints');
  sections.push('- Blueprint files are named as `{identifier}.blueprint.json`');
  sections.push('- When building components that display blueprint entities, reference the properties structure');
  sections.push('- Use relations to understand how to fetch related entity data');
  sections.push('- Consider dispatchers when implementing entity lifecycle hooks');
  sections.push('- Use `qelos-cli push blueprints <path>` to push changes back to Qelos');
  sections.push('');

  return sections.join('\n');
}

/**
 * Generate rules content for plugins
 * @param {Object} resources - Scanned resources
 * @returns {string} Generated rules content
 */
function generatePluginsContent(resources) {
  const sections = [];

  sections.push('---');
  sections.push('trigger: glob');
  sections.push('globs: ["plugins/**/*.plugin.json", "plugins/micro-frontends/**/*.html"]');
  sections.push('---');
  sections.push('# Plugins Rules');
  sections.push('');
  sections.push('This file contains rules for working with Qelos plugins that extend platform functionality.');
  sections.push('');
  sections.push('## Plugin Structure');
  sections.push('Plugins extend Qelos functionality and can include:');
  sections.push('- **Micro-frontends**: UI components loaded dynamically');
  sections.push('- **Injectables**: Services or utilities injected into the platform');
  sections.push('- **Navigation groups**: Menu items and navigation structure');
  sections.push('');
  sections.push('## Plugin Files and References');
  sections.push('Each plugin has:');
  sections.push('- A main `.plugin.json` file with plugin configuration');
  sections.push('- A `micro-frontends/` directory containing HTML structure files');
  sections.push('- Micro-frontend structures are referenced using `{ "$ref": "./micro-frontends/filename.html" }`');
  sections.push('');
  sections.push('## Plugin Example');
  sections.push('```json');
  sections.push('{');
  sections.push('  "name": "Agent Editor Plugin",');
  sections.push('  "apiPath": "agent-editor",');
  sections.push('  "description": "Plugin for agent editing functionality",');
  sections.push('  "microFrontends": [');
  sections.push('    {');
  sections.push('      "name": "Agent Editor",');
  sections.push('      "route": {');
  sections.push('        "name": "agent-editor",');
  sections.push('        "path": "/editor/:agentId",');
  sections.push('        "requirements": {');
  sections.push('          "permissions": ["agent.edit"],');
  sections.push('          "blueprints": ["agent"]');
  sections.push('        }');
  sections.push('      },');
  sections.push('      "structure": {');
  sections.push('        "$ref": "./micro-frontends/agent-editor.html"');
  sections.push('      }');
  sections.push('    }');
  sections.push('  ],');
  sections.push('  "navBarGroups": [');
  sections.push('    {');
  sections.push('      "label": "Agent Tools",');
  sections.push('      "items": [...]');
  sections.push('    }');
  sections.push('  ],');
  sections.push('  "injectables": [...]');
  sections.push('}');
  sections.push('```');
  sections.push('');
  sections.push('## Micro-frontend Structure Reference');
  sections.push('The `$ref` field points to an HTML file in the `micro-frontends/` directory:');
  sections.push('- **Route name**: Used to identify the micro-frontend (converted to kebab-case for filename)');
  sections.push('- **Route path**: The URL path where the micro-frontend is accessible');
  sections.push('- **Requirements**: Conditions that must be met for the micro-frontend to load');
  sections.push('  - `permissions`: Required user permissions');
  sections.push('  - `blueprints`: Required blueprint entities');
  sections.push('- **Structure file**: HTML template referenced via `$ref`');
  sections.push('');
  sections.push('## IMPORTANT: Micro-frontend HTML Limitations');
  sections.push('**Micro-frontend HTML files CANNOT contain `<script>` tags or JavaScript code.**');
  sections.push('');
  sections.push('Just like blocks, to add JavaScript functionality:');
  sections.push('1. Create a Vue component in `components/` folder with your logic');
  sections.push('2. Use the component in your micro-frontend HTML (kebab-case, with closing tags)');
  sections.push('3. No import needed - all components are globally available');
  sections.push('');
  sections.push('## Using Components in Micro-frontends');
  sections.push('Micro-frontend HTML files can use components from the `components/` directory:');
  sections.push('```html');
  sections.push('<!-- In micro-frontends/agent-editor.html -->');
  sections.push('<agent-editor');
  sections.push('  :agent-id="currentAgent.id"');
  sections.push('  :autoplay="true"');
  sections.push('  @ended="handleAgentEnd"');
  sections.push('/>');
  sections.push('```');
  sections.push('');
  sections.push('This `<agent-editor>` component maps to:');
  sections.push('- **Component file**: `components/AgentEditor.vue`');
  sections.push('- **Metadata entry**: `components.json["AgentEditor"]`');
  sections.push('');
  sections.push('Remember: kebab-case in templates = PascalCase component file name.');
  sections.push('');
  sections.push('## Working with Plugins');
  sections.push('- Plugin files are named as `{apiPath}.plugin.json`');
  sections.push('- When modifying micro-frontend structures, edit the HTML files in `micro-frontends/`');
  sections.push('- The plugin JSON file references these HTML files using `$ref`');
  sections.push('- Route names and paths are defined in the plugin configuration');
  sections.push('- Requirements specify what conditions must be met for the micro-frontend to load');
  sections.push('- Use `qelos-cli push plugins <path>` to push changes back to Qelos');
  sections.push('');

  return sections.join('\n');
}

/**
 * Generate rules content for general guidelines
 * @param {Object} resources - Scanned resources
 * @returns {string} Generated rules content
 */
function generateGeneralContent(resources) {
  const sections = [];

  sections.push('---');
  sections.push('trigger: glob');
  sections.push('globs: ["*"]');
  sections.push('---');
  sections.push('# General Project Guidelines');
  sections.push('');
  sections.push('This file contains general guidelines and best practices for working with the Qelos project.');
  sections.push('');
  sections.push('## File Naming Conventions');
  sections.push('- Components: `ComponentName.vue`');
  sections.push('- Blocks: `block-name.html` (kebab-case)');
  sections.push('- Blueprints: `identifier.blueprint.json`');
  sections.push('- Plugins: `api-path.plugin.json`');
  sections.push('- Micro-frontends: `route-name.html` (kebab-case)');
  sections.push('');
  sections.push('## Metadata Files');
  sections.push('- `components.json`: Maps component filenames to metadata');
  sections.push('- `blocks.json`: Maps block filenames to metadata');
  sections.push('- Always keep metadata files in sync with their corresponding files');
  sections.push('- The `_id` field is crucial for syncing with the remote Qelos instance');
  sections.push('');
  sections.push('## Best Practices');
  sections.push('- Use the Qelos CLI to pull and push resources');
  sections.push('- Maintain the directory structure created by the pull command');
  sections.push('- Reference blueprint structures when building components that display entities');
  sections.push('- Use micro-frontend route names and requirements to understand loading conditions');
  sections.push('- Test changes locally before pushing to the remote Qelos instance');
  sections.push('');

  return sections.join('\n');
}

/**
 * Generate all rules files based on scanned resources
 * @param {Object} resources - Scanned resources
 * @param {string} ideType - Type of IDE (windsurf, cursor, claude)
 * @param {Object} qelosComponents - Qelos global components from docs
 * @returns {Array} Array of {filename, content} objects
 */
function generateAllRulesContent(resources, ideType, qelosComponents) {
  const files = [];

  // Always generate general.md
  files.push({
    filename: 'general.md',
    content: generateGeneralContent(resources)
  });

  // Generate component rules if components exist
  if (resources.components) {
    files.push({
      filename: 'components.md',
      content: generateComponentsContent(resources, qelosComponents)
    });
  }

  // Generate block rules if blocks exist
  if (resources.blocks) {
    files.push({
      filename: 'blocks.md',
      content: generateBlocksContent(resources)
    });
  }

  // Generate blueprint rules if blueprints exist
  if (resources.blueprints.length > 0) {
    files.push({
      filename: 'blueprints.md',
      content: generateBlueprintsContent(resources)
    });
  }

  // Generate plugin rules if plugins exist
  if (resources.plugins.length > 0) {
    files.push({
      filename: 'plugins.md',
      content: generatePluginsContent(resources)
    });
  }

  return files;
}

/**
 * Get the appropriate directory path for the IDE type
 * @param {string} ideType - Type of IDE
 * @param {string} basePath - Base path
 * @returns {string} Directory path for the rules files
 */
function getRulesDirectoryPath(ideType, basePath) {
  switch (ideType) {
    case 'windsurf':
      return path.join(basePath, '.windsurf', 'rules');
    case 'cursor':
      return basePath; // .cursorrules goes in root
    case 'claude':
      return basePath; // .clinerules goes in root
    default:
      throw new Error(`Unknown IDE type: ${ideType}`);
  }
}

/**
 * Get the appropriate file path for the IDE type and filename
 * @param {string} ideType - Type of IDE
 * @param {string} basePath - Base path
 * @param {string} filename - Filename (e.g., 'components.md')
 * @returns {string} File path for the rules file
 */
function getRulesFilePath(ideType, basePath, filename) {
  const dir = getRulesDirectoryPath(ideType, basePath);
  
  switch (ideType) {
    case 'windsurf':
      return path.join(dir, filename);
    case 'cursor':
      // For cursor, combine all into .cursorrules in root
      return path.join(basePath, '.cursorrules');
    case 'claude':
      // For claude, combine all into .clinerules in root
      return path.join(basePath, '.clinerules');
    default:
      throw new Error(`Unknown IDE type: ${ideType}`);
  }
}

/**
 * Generate rules file(s) for a specific IDE
 * @param {string} ideType - Type of IDE (windsurf, cursor, claude)
 * @param {string} basePath - Base path to scan for resources
 * @returns {Object} Result object with success status and file paths
 */
export async function generateRules(ideType, basePath) {
  try {
    // Scan for pulled resources
    const resources = scanPulledResources(basePath);

    // Check if any resources were found
    const hasResources = 
      resources.components !== null ||
      resources.blocks !== null ||
      resources.blueprints.length > 0 ||
      resources.plugins.length > 0;

    if (!hasResources) {
      return {
        success: false,
        message: 'No pulled resources found. Run pull command first.'
      };
    }

    // Fetch Qelos global components from documentation
    logger.debug('Fetching Qelos global components from documentation...');
    const qelosComponents = await fetchQelosGlobalComponents();
    if (qelosComponents) {
      logger.debug(`Fetched ${qelosComponents.components.length} components and ${qelosComponents.directives.length} directives`);
    }

    // Generate all rules content
    const rulesFiles = generateAllRulesContent(resources, ideType, qelosComponents);
    const writtenFiles = [];

    // Handle different IDE types
    if (ideType === 'windsurf') {
      // Windsurf: Create separate files
      const rulesDir = getRulesDirectoryPath(ideType, basePath);
      
      if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir, { recursive: true });
      }

      for (const file of rulesFiles) {
        const filePath = path.join(rulesDir, file.filename);
        fs.writeFileSync(filePath, file.content, 'utf-8');
        writtenFiles.push(filePath);
        logger.debug(`Created ${file.filename}`);
      }
    } else {
      // Cursor & Claude: Combine all into one file
      const combinedContent = [];
      
      // Add header
      combinedContent.push(`# Qelos Project Rules for ${ideType.charAt(0).toUpperCase() + ideType.slice(1)}`);
      combinedContent.push('');
      combinedContent.push('This file contains rules to help you work with pulled Qelos resources.');
      combinedContent.push('Generated automatically by the Qelos CLI.');
      combinedContent.push('');
      combinedContent.push('---');
      combinedContent.push('');

      // Combine all content
      for (const file of rulesFiles) {
        // Remove frontmatter from individual files
        const contentWithoutFrontmatter = file.content
          .replace(/^---\n[\s\S]*?\n---\n/, '')
          .replace(/^---\n[\s\S]*?\n---\n\n/, '');
        
        combinedContent.push(contentWithoutFrontmatter);
        combinedContent.push('');
        combinedContent.push('---');
        combinedContent.push('');
      }

      // Write combined file
      const filePath = getRulesFilePath(ideType, basePath);
      fs.writeFileSync(filePath, combinedContent.join('\n'), 'utf-8');
      writtenFiles.push(filePath);
      logger.debug(`Created combined rules file`);
    }

    return {
      success: true,
      files: writtenFiles,
      count: writtenFiles.length
    };

  } catch (error) {
    logger.error(`Failed to generate ${ideType} rules: ${error.message}`);
    throw error;
  }
}
