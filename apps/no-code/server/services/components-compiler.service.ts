import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import logger from './logger';

const execPromise = promisify(exec);

const DIST_DIR = path.join(__dirname, './components-compiler/dist');
const SRC_DIR = path.join(__dirname, './components-compiler/src/components');

let lastExecution;

interface LocalComponentImport {
  importName: string;
  componentName: string;
  importPath: string;
}

/**
 * Extracts and removes local component imports from Vue file content
 * @param fileContent The Vue component content
 * @param existingComponents List of existing component names in the database
 * @returns Object with cleaned content and list of removed imports
 */
function extractAndRemoveLocalImports(fileContent: string, existingComponents: string[]): { cleanedContent: string, removedImports: LocalComponentImport[] } {
  const imports: LocalComponentImport[] = [];
  let cleanedContent = fileContent;
  
  // Match default imports: import MyComponent from './MyComponent.vue'
  const defaultImportRegex = /import\s+(\w+)\s+from\s+['"](\.\/[^'"]+\.vue)['"]/g;
  let match;
  
  while ((match = defaultImportRegex.exec(fileContent)) !== null) {
    const importName = match[1];
    const importPath = match[2];
    
    // Extract component name from path (e.g., './MyComponent.vue' -> 'MyComponent')
    const componentName = importPath.split('/').pop()?.replace('.vue', '') || '';
    
    if (componentName && existingComponents.includes(componentName)) {
      imports.push({
        importName,
        componentName,
        importPath
      });
      
      // Remove the import statement from cleaned content
      cleanedContent = cleanedContent.replace(match[0], '');
    }
  }
  
  // Match named imports: import { ComponentA, ComponentB } from './components.vue'
  const namedImportRegex = /import\s*\{([^}]+)\}\s+from\s+['"](\.\/[^'"]+\.vue)['"]/g;
  
  // Reset regex lastIndex
  defaultImportRegex.lastIndex = 0;
  namedImportRegex.lastIndex = 0;
  
  while ((match = namedImportRegex.exec(fileContent)) !== null) {
    const namedImports = match[1].split(',').map(s => s.trim().split(' as ')[0]);
    const importPath = match[2];
    
    for (const importName of namedImports) {
      if (importName && existingComponents.includes(importName)) {
        imports.push({
          importName,
          componentName: importName,
          importPath
        });
      }
    }
    
    // If all named imports exist in database, remove the entire import statement
    const allExist = namedImports.every(name => name && existingComponents.includes(name));
    if (allExist) {
      cleanedContent = cleanedContent.replace(match[0], '');
    }
  }
  
  return { cleanedContent, removedImports: imports };
}

function extractPropsFromVueComponent(vueContent: string): Array<{type: string, prop: string, placeholder?: string}> {
  try {
    // Extract the script setup section
    const scriptSetupMatch = vueContent.match(/<script[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptSetupMatch) {
      // Try regular script section
      const scriptMatch = vueContent.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      if (!scriptMatch) {
        return [];
      }
      return extractPropsFromRegularScript(scriptMatch[1]);
    }
    
    const scriptContent = scriptSetupMatch[1];
    
    // First try to find defineProps with object argument
    const definePropsMatch = scriptContent.match(/defineProps\s*\(\s*({[\s\S]*?})\s*\)/);
    if (definePropsMatch) {
      return parsePropsObject(definePropsMatch[1]);
    }
    
    // Try to find defineProps with TypeScript interface
    const definePropsWithTypesMatch = scriptContent.match(/defineProps\s*<[^>]*>\s*\(\s*\)/);
    if (definePropsWithTypesMatch) {
      // Extract the interface or type definition
      const interfaceMatch = scriptContent.match(/interface\s+\w+\s*{([^}]*)}/);
      if (interfaceMatch) {
        return parseTypeScriptInterface(interfaceMatch[1]);
      }
      
      // Try to extract type from generic parameter
      const genericMatch = scriptContent.match(/defineProps\s*<([^>]+)>/);
      if (genericMatch) {
        // This is a simplified parser for inline types
        return parseInlineType(genericMatch[1]);
      }
    }
    
    // Try to find props defined with withDefaults
    const withDefaultsMatch = scriptContent.match(/withDefaults\s*\(\s*defineProps[^,]*,\s*({[\s\S]*?})\s*\)/);
    if (withDefaultsMatch) {
      const propsMatch = scriptContent.match(/defineProps\s*<[^>]*>/);
      if (propsMatch) {
        // Extract defaults
        const defaultsStr = withDefaultsMatch[1];
        return parseWithDefaults(defaultsStr);
      }
    }
    
    return [];
  } catch (error) {
    const err = error as Error;
    logger.error('Error extracting props from Vue component', {
      error: err.message,
      stack: err.stack
    });
    return [];
  }
}

function parsePropsObject(propsObjectStr: string): Array<{type: string, prop: string, placeholder?: string}> {
  const props: Array<{type: string, prop: string, placeholder?: string}> = [];
  
  // Process the props object to extract prop definitions
  // This regex matches prop definitions with various syntaxes
  const propRegex = /(\w+)\s*:\s*({[\s\S]*?}|[\w\s.,'"|{}[\]:]+)/g;
  let match;
  
  while ((match = propRegex.exec(propsObjectStr)) !== null) {
    const propName = match[1];
    const propDefinition = match[2];
    
    // Default to object type
    let type = 'object';
    let placeholder: string | undefined;
    
    // Extract type from prop definition
    if (propDefinition.startsWith('{')) {
      // Object syntax: { type: String, default: '' }
      const typeMatch = propDefinition.match(/type\s*:\s*(\w+)/);
      if (typeMatch) {
        const typeName = typeMatch[1];
        type = typeName.toLowerCase();
      }
      
      // Extract default value
      const defaultMatch = propDefinition.match(/default\s*:\s*([^,}]+)/);
      if (defaultMatch) {
        placeholder = defaultMatch[1].trim().replace(/['"]/g, '');
      }
    } else {
      // Simple syntax: propName: String
      type = propDefinition.trim().toLowerCase();
    }
    
    // Normalize type names
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'object': 'object',
      'array': 'array',
      'function': 'function',
      'date': 'date'
    };
    
    type = typeMap[type] || 'object';
    
    props.push({
      prop: propName,
      type,
      placeholder
    });
  }
  
  return props;
}

function parseTypeScriptInterface(interfaceStr: string): Array<{type: string, prop: string, placeholder?: string}> {
  const props: Array<{type: string, prop: string, placeholder?: string}> = [];
  
  // Split by lines and process each property
  const lines = interfaceStr.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    
    // Match property with optional type and default
    const propMatch = trimmed.match(/(\w+)(\?)?:\s*([^;=]+)/);
    if (propMatch) {
      const propName = propMatch[1];
      const typeStr = propMatch[3].trim();
      
      // Convert TypeScript types to our simplified types
      let type = 'object';
      if (typeStr.includes('string') || typeStr.includes('String')) {
        type = 'string';
      } else if (typeStr.includes('number') || typeStr.includes('Number')) {
        type = 'number';
      } else if (typeStr.includes('boolean') || typeStr.includes('Boolean')) {
        type = 'boolean';
      } else if (typeStr.includes('Array') || typeStr.includes('[]')) {
        type = 'array';
      }
      
      props.push({
        prop: propName,
        type
      });
    }
  }
  
  return props;
}

function parseInlineType(typeStr: string): Array<{type: string, prop: string, placeholder?: string}> {
  // This is a very basic parser for inline types
  // In a real implementation, you'd want a proper TypeScript parser
  return [];
}

function parseWithDefaults(defaultsStr: string): Array<{type: string, prop: string, placeholder?: string}> {
  const props: Array<{type: string, prop: string, placeholder?: string}> = [];
  
  // Parse defaults object
  const propRegex = /(\w+)\s*:\s*([^,}]+)/g;
  let match;
  
  while ((match = propRegex.exec(defaultsStr)) !== null) {
    const propName = match[1];
    const defaultValue = match[2].trim().replace(/['"]/g, '');
    
    props.push({
      prop: propName,
      type: 'string', // Default to string, would need better type inference
      placeholder: defaultValue
    });
  }
  
  return props;
}

function extractPropsFromRegularScript(scriptContent: string): Array<{type: string, prop: string, placeholder?: string}> {
  // Handle Vue 2 style props in regular script section
  const propsMatch = scriptContent.match(/props\s*:\s*({[\s\S]*?})/);
  if (propsMatch) {
    return parsePropsObject(propsMatch[1]);
  }
  
  return [];
}


/**
 * Compiles a Vue component into a client-side library that can be imported in the frontend
 * @param fileContent The Vue component content as a string
 * @param tenanthost The tenant host URL
 * @param existingComponents List of existing component names in the database
 * @returns An object with compiled js and css strings
 */
export async function compileVueComponent(
  fileContent: string, 
  tenanthost: string = 'http://localhost',
  existingComponents: string[] = []
): Promise<{js: string, css: string, props: Array<{type: string, prop: string}>}> {
  const hash = 'Comp' + crypto.createHash('sha256').update(fileContent).digest('hex').substring(0, 8);
  
  // Remove local component imports that exist in the database
  const { cleanedContent, removedImports } = extractAndRemoveLocalImports(fileContent, existingComponents);
  
  // Extract props from the original Vue component content before compilation
  const props = extractPropsFromVueComponent(cleanedContent);
  
  // Log the import removal process
  if (removedImports.length > 0) {
    logger.log(`Removed ${removedImports.length} local component imports from component ${hash}`, {
      removedImports: removedImports.map(imp => `${imp.importName} from ${imp.importPath}`)
    });
  }
  
  const libJs = `import Component from './${hash}.vue';
window['components:${hash}'] = Component;`;
  try {
    await Promise.all([
      fs.writeFile(path.join(SRC_DIR, hash + '.js'), libJs),
      fs.writeFile(path.join(SRC_DIR, hash + '.vue'), cleanedContent),
    ]);

    if (lastExecution) {
      await lastExecution;
    }

    lastExecution = execPromise(`../../../node_modules/.bin/vite build`, { 
      cwd: path.join(__dirname, './components-compiler'), 
      env: {
        // Pass all environment variables needed for node execution
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        USER: process.env.USER,
        SHELL: process.env.SHELL,
        NVM_DIR: process.env.NVM_DIR,
        NVM_PATH: process.env.NVM_PATH,
        NVM_BIN: process.env.NVM_BIN,
        // Only pass specific variables needed for Vite build
        NODE_ENV: 'production',
        VITE_USER_NODE_ENV: 'production',
        // Standard Vite environment variables
        BASE_URL: tenanthost,
        MODE: 'production',
        DEV: 'false',
        PROD: 'true',
        // Custom variables
        COMPONENT_HASH: hash,
        // memory limit variable to node.js
        NODE_OPTIONS: '--max-old-space-size=512',
      },
    });

    const { stderr, stdout } = await lastExecution.finally(() => lastExecution = null);

    if (stderr || !stdout.includes('built in')) {
      // Check if the output files actually exist to determine if compilation succeeded
      const jsFileExists = await fs.access(path.join(DIST_DIR, hash + '.umd.js'))
        .then(() => true)
        .catch(() => false);
        
      if (!jsFileExists) {
        logger.error('Failed to compile component: output files not found');
        throw new Error('failed to compile component');
      }
    }

    const [jsContent, cssContent] = await Promise.all([
      fs.readFile(path.join(DIST_DIR, hash + '.umd.js'), 'utf-8').catch(() => '{}'),
      fs.readFile(path.join(DIST_DIR, hash + '.css'), 'utf-8').catch(() => '')  ,
    ]);

    return {
      js: jsContent + `
      const Component = window['components:${hash}'];
      delete window['components:${hash}'];
      export default Component;`,
      css: cssContent,
      props
    };
  } catch (err: any) {
    // Re-throw the original error to preserve stderr and other details
    throw err;
  } finally {
    // remove files
    await Promise.all([
      fs.unlink(path.join(DIST_DIR, hash + '.umd.js')).catch(() => {}),
      fs.unlink(path.join(DIST_DIR, hash + '.css')).catch(() => {}),
      fs.unlink(path.join(SRC_DIR, hash + '.js')).catch(() => {}),
      fs.unlink(path.join(SRC_DIR, hash + '.vue')).catch(() => {}),
    ]);
  }
}