import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger.mjs';

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
 * Generate rules content based on scanned resources
 * @param {Object} resources - Scanned resources
 * @param {string} ideType - Type of IDE (windsurf, cursor, claude)
 * @returns {string} Generated rules content
 */
function generateRulesContent(resources, ideType) {
  const sections = [];

  // Header
  sections.push(`# Qelos Project Rules for ${ideType.charAt(0).toUpperCase() + ideType.slice(1)}`);
  sections.push('');
  sections.push('This file contains rules to help you work with pulled Qelos resources.');
  sections.push('Generated automatically by the Qelos CLI.');
  sections.push('');

  // Components section
  if (resources.components) {
    sections.push('## Components');
    sections.push('');
    sections.push('### Component Structure');
    sections.push('- Components are Vue 3.5 Single File Components (.vue files)');
    sections.push('- Each component has metadata stored in `components.json`');
    sections.push('- Use Composition API with `<script setup>` syntax');
    sections.push('- Components can use Vue Router, Element Plus, and Vue I18n');
    sections.push('');
    sections.push('### Available Libraries & Documentation');
    sections.push('- **Vue 3**: https://vuejs.org/api/');
    sections.push('- **Vue Router**: https://router.vuejs.org/api/');
    sections.push('- **Element Plus**: https://element-plus.org/en-US/component/overview.html');
    sections.push('- **Vue I18n**: https://vue-i18n.intlify.dev/api/general.html');
    sections.push('- **Pinia**: https://pinia.vuejs.org/api/');
    sections.push('');
    sections.push('### Component Metadata Mapping');
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
    sections.push('### Component Naming Convention');
    sections.push('Components follow Vue naming conventions:');
    sections.push('- **File names**: PascalCase (e.g., `PersonalStrategicTable.vue`, `VideoPlayer.vue`)');
    sections.push('- **Template usage**: kebab-case (e.g., `<personal-strategic-table>`, `<video-player>`)');
    sections.push('- **Conversion**: PascalCase file names are automatically converted to kebab-case in templates');
    sections.push('');
    sections.push('**Example mapping:**');
    sections.push('```');
    sections.push('PersonalStrategicTable.vue  →  <personal-strategic-table>');
    sections.push('VideoPlayer.vue             →  <video-player>');
    sections.push('UserProfile.vue             →  <user-profile>');
    sections.push('```');
    sections.push('');
    sections.push('When you see a component used in HTML/templates like `<personal-strategic-table>`,');
    sections.push('the actual component file is `PersonalStrategicTable.vue` in the components directory.');
    sections.push('');
    sections.push('### Working with Components');
    sections.push('- When modifying a component, update both the `.vue` file and its entry in `components.json`');
    sections.push('- The `_id` field in `components.json` is used to sync with the remote Qelos instance');
    sections.push('- Component files are named exactly as their `componentName` property (e.g., `VideoPlayer.vue`)');
    sections.push('- Use `qelos-cli push components <path>` to push changes back to Qelos');
    sections.push('');
  }

  // Blocks section
  if (resources.blocks) {
    sections.push('## Blocks');
    sections.push('');
    sections.push('### Block Structure');
    sections.push('- Blocks are HTML template files (.html files)');
    sections.push('- Each block has metadata stored in `blocks.json`');
    sections.push('- Blocks are used as reusable HTML templates in the Qelos platform');
    sections.push('');
    sections.push('### Block Metadata Mapping');
    sections.push('The `blocks.json` file maps block filenames (kebab-case) to their metadata:');
    sections.push('```json');
    sections.push('{');
    sections.push('  "login-header": {');
    sections.push('    "_id": "507f1f77bcf86cd799439011",');
    sections.push('    "name": "Login Header",');
    sections.push('    "description": "Header component for login page",');
    sections.push('    "contentType": "html"');
    sections.push('  },');
    sections.push('  "footer-template": {');
    sections.push('    "_id": "507f191e810c19729de860ea",');
    sections.push('    "name": "Footer Template",');
    sections.push('    "description": "Reusable footer template",');
    sections.push('    "contentType": "html"');
    sections.push('  }');
    sections.push('}');
    sections.push('```');
    sections.push('');
    sections.push('### Working with Blocks');
    sections.push('- When modifying a block, update both the `.html` file and its entry in `blocks.json`');
    sections.push('- The filename in kebab-case must match the key in `blocks.json`');
    sections.push('- Block names are converted to kebab-case for filenames (e.g., "Login Header" → `login-header.html`)');
    sections.push('- The `_id` field is used to sync with the remote Qelos instance');
    sections.push('- Use `qelos-cli push blocks <path>` to push changes back to Qelos');
    sections.push('');
  }

  // Blueprints section
  if (resources.blueprints.length > 0) {
    sections.push('## Blueprints');
    sections.push('');
    sections.push('### Blueprint Structure');
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
    sections.push('### Blueprint Example');
    sections.push('```json');
    sections.push('{');
    sections.push('  "identifier": "user_profile",');
    sections.push('  "name": "User Profile",');
    sections.push('  "description": "User profile data model",');
    sections.push('  "properties": [');
    sections.push('    {');
    sections.push('      "key": "firstName",');
    sections.push('      "type": "string",');
    sections.push('      "label": "First Name",');
    sections.push('      "required": true');
    sections.push('    },');
    sections.push('    {');
    sections.push('      "key": "email",');
    sections.push('      "type": "email",');
    sections.push('      "label": "Email Address",');
    sections.push('      "required": true');
    sections.push('    }');
    sections.push('  ],');
    sections.push('  "relations": [');
    sections.push('    {');
    sections.push('      "key": "posts",');
    sections.push('      "type": "hasMany",');
    sections.push('      "blueprint": "blog_post"');
    sections.push('    }');
    sections.push('  ],');
    sections.push('  "dispatchers": [');
    sections.push('    {');
    sections.push('      "eventName": "user.created",');
    sections.push('      "description": "Triggered when a new user is created"');
    sections.push('    }');
    sections.push('  ]');
    sections.push('}');
    sections.push('```');
    sections.push('');
    sections.push('### Blueprint to Entity Mapping');
    sections.push('When working with blueprint entities:');
    sections.push('- **Properties** define the fields available on each entity instance');
    sections.push('  - Example: A `user_profile` entity will have `firstName` and `email` fields');
    sections.push('- **Relations** define how entities connect to other blueprint entities');
    sections.push('  - Example: `hasMany` relation to `blog_post` means you can fetch related posts');
    sections.push('- **Dispatchers** define events that trigger when entity actions occur');
    sections.push('  - Example: `user.created` event fires when a new user entity is created');
    sections.push('- Use the blueprint structure to understand what data is available when building components');
    sections.push('');
    sections.push('### Working with Blueprints');
    sections.push('- Blueprint files are named as `{identifier}.blueprint.json`');
    sections.push('- When building components that display blueprint entities, reference the properties structure');
    sections.push('- Use relations to understand how to fetch related entity data');
    sections.push('- Consider dispatchers when implementing entity lifecycle hooks');
    sections.push('- Use `qelos-cli push blueprints <path>` to push changes back to Qelos');
    sections.push('');
  }

  // Plugins section
  if (resources.plugins.length > 0) {
    sections.push('## Plugins');
    sections.push('');
    sections.push('### Plugin Structure');
    sections.push('Plugins extend Qelos functionality and can include:');
    sections.push('- **Micro-frontends**: UI components loaded dynamically');
    sections.push('- **Injectables**: Services or utilities injected into the platform');
    sections.push('- **Navigation groups**: Menu items and navigation structure');
    sections.push('');
    sections.push('### Plugin Files and References');
    sections.push('Each plugin has:');
    sections.push('- A main `.plugin.json` file with plugin configuration');
    sections.push('- A `micro-frontends/` directory containing HTML structure files');
    sections.push('- Micro-frontend structures are referenced using `{ "$ref": "./micro-frontends/filename.html" }`');
    sections.push('');
    sections.push('### Plugin Example');
    sections.push('```json');
    sections.push('{');
    sections.push('  "name": "Video Editor Plugin",');
    sections.push('  "apiPath": "video-editor",');
    sections.push('  "description": "Plugin for video editing functionality",');
    sections.push('  "microFrontends": [');
    sections.push('    {');
    sections.push('      "name": "Video Editor",');
    sections.push('      "route": {');
    sections.push('        "name": "video-editor",');
    sections.push('        "path": "/editor/:videoId",');
    sections.push('        "requirements": {');
    sections.push('          "permissions": ["video.edit"],');
    sections.push('          "blueprints": ["video"]');
    sections.push('        }');
    sections.push('      },');
    sections.push('      "structure": {');
    sections.push('        "$ref": "./micro-frontends/video-editor.html"');
    sections.push('      }');
    sections.push('    }');
    sections.push('  ],');
    sections.push('  "navBarGroups": [');
    sections.push('    {');
    sections.push('      "label": "Video Tools",');
    sections.push('      "items": [...]');
    sections.push('    }');
    sections.push('  ],');
    sections.push('  "injectables": [...]');
    sections.push('}');
    sections.push('```');
    sections.push('');
    sections.push('### Micro-frontend Structure Reference');
    sections.push('The `$ref` field points to an HTML file in the `micro-frontends/` directory:');
    sections.push('- **Route name**: Used to identify the micro-frontend (converted to kebab-case for filename)');
    sections.push('- **Route path**: The URL path where the micro-frontend is accessible');
    sections.push('- **Requirements**: Conditions that must be met for the micro-frontend to load');
    sections.push('  - `permissions`: Required user permissions');
    sections.push('  - `blueprints`: Required blueprint entities');
    sections.push('- **Structure file**: HTML template referenced via `$ref`');
    sections.push('');
    sections.push('### Using Components in Micro-frontends');
    sections.push('Micro-frontend HTML files can use components from the `components/` directory:');
    sections.push('```html');
    sections.push('<!-- In micro-frontends/video-editor.html -->');
    sections.push('<video-player');
    sections.push('  :video-id="currentVideo.id"');
    sections.push('  :autoplay="true"');
    sections.push('  @ended="handleVideoEnd"');
    sections.push('/>');
    sections.push('```');
    sections.push('');
    sections.push('This `<video-player>` component maps to:');
    sections.push('- **Component file**: `components/VideoPlayer.vue`');
    sections.push('- **Metadata entry**: `components.json["VideoPlayer"]`');
    sections.push('');
    sections.push('Remember: kebab-case in templates = PascalCase component file name.');
    sections.push('');
    sections.push('### Working with Plugins');
    sections.push('- Plugin files are named as `{apiPath}.plugin.json`');
    sections.push('- When modifying micro-frontend structures, edit the HTML files in `micro-frontends/`');
    sections.push('- The plugin JSON file references these HTML files using `$ref`');
    sections.push('- Route names and paths are defined in the plugin configuration');
    sections.push('- Requirements specify what conditions must be met for the micro-frontend to load');
    sections.push('- Use `qelos-cli push plugins <path>` to push changes back to Qelos');
    sections.push('');
  }

  // General guidelines
  sections.push('## General Guidelines');
  sections.push('');
  sections.push('### File Naming Conventions');
  sections.push('- Components: `ComponentName.vue`');
  sections.push('- Blocks: `block-name.html` (kebab-case)');
  sections.push('- Blueprints: `identifier.blueprint.json`');
  sections.push('- Plugins: `api-path.plugin.json`');
  sections.push('- Micro-frontends: `route-name.html` (kebab-case)');
  sections.push('');
  sections.push('### Metadata Files');
  sections.push('- `components.json`: Maps component filenames to metadata');
  sections.push('- `blocks.json`: Maps block filenames to metadata');
  sections.push('- Always keep metadata files in sync with their corresponding files');
  sections.push('- The `_id` field is crucial for syncing with the remote Qelos instance');
  sections.push('');
  sections.push('### Best Practices');
  sections.push('- Use the Qelos CLI to pull and push resources');
  sections.push('- Maintain the directory structure created by the pull command');
  sections.push('- Reference blueprint structures when building components that display entities');
  sections.push('- Use micro-frontend route names and requirements to understand loading conditions');
  sections.push('- Test changes locally before pushing to the remote Qelos instance');
  sections.push('');

  return sections.join('\n');
}

/**
 * Get the appropriate file path for the IDE type
 * @param {string} ideType - Type of IDE
 * @param {string} basePath - Base path
 * @returns {string} File path for the rules file
 */
function getRulesFilePath(ideType, basePath) {
  switch (ideType) {
    case 'windsurf':
      return path.join(basePath, '.windsurf', 'rules', 'qelos-resources.md');
    case 'cursor':
      return path.join(basePath, '.cursorrules');
    case 'claude':
      return path.join(basePath, '.clinerules');
    default:
      throw new Error(`Unknown IDE type: ${ideType}`);
  }
}

/**
 * Generate rules file for a specific IDE
 * @param {string} ideType - Type of IDE (windsurf, cursor, claude)
 * @param {string} basePath - Base path to scan for resources
 * @returns {Object} Result object with success status and file path
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

    // Generate rules content
    const content = generateRulesContent(resources, ideType);

    // Get file path and ensure directory exists
    const filePath = getRulesFilePath(ideType, basePath);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write rules file
    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      success: true,
      filePath
    };

  } catch (error) {
    logger.error(`Failed to generate ${ideType} rules: ${error.message}`);
    throw error;
  }
}
