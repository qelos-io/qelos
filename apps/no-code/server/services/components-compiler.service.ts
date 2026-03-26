import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import logger from './logger';

const execPromise = promisify(exec);

const DIST_DIR = path.join(__dirname, './components-compiler/dist');
const SRC_DIR = path.join(__dirname, './components-compiler/src/components');

const MAX_QUEUE_SIZE = 50;
const MEMORY_THRESHOLD_MB = 400;

interface QueueItem {
  task: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

const compilationQueue: QueueItem[] = [];
let isProcessing = false;

function tryGarbageCollect() {
  if (global.gc) {
    try { global.gc(); } catch {}
  }
}

function getMemoryUsageMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

async function waitForMemory(): Promise<void> {
  let memUsage = getMemoryUsageMB();
  let attempts = 0;
  while (memUsage > MEMORY_THRESHOLD_MB && attempts < 5) {
    logger.log(`Memory usage high (${memUsage.toFixed(0)}MB), waiting before next compilation...`);
    tryGarbageCollect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    memUsage = getMemoryUsageMB();
    attempts++;
  }
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (compilationQueue.length > 0) {
    const item = compilationQueue.shift()!;
    try {
      await waitForMemory();
      const result = await item.task();
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    }
    tryGarbageCollect();
  }

  isProcessing = false;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  if (compilationQueue.length >= MAX_QUEUE_SIZE) {
    return Promise.reject(new Error('Compilation queue is full. Please try again later.'));
  }
  return new Promise<T>((resolve, reject) => {
    compilationQueue.push({ task, resolve, reject });
    processQueue();
  });
}

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
 * Runs the actual vite build for a single component (must be called sequentially)
 */
async function runViteBuild(
  fileContent: string,
  tenanthost: string,
  existingComponents: string[]
): Promise<{js: string, css: string, props: Array<{type: string, prop: string}>}> {
  const hash = 'Comp' + crypto.createHash('sha256').update(fileContent).digest('hex').substring(0, 8);

  const { cleanedContent, removedImports } = extractAndRemoveLocalImports(fileContent, existingComponents);
  const props = extractPropsFromVueComponent(cleanedContent);

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

    const execution = execPromise(`../../../node_modules/.bin/vite build`, {
      cwd: path.join(__dirname, './components-compiler'),
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        USER: process.env.USER,
        SHELL: process.env.SHELL,
        NVM_DIR: process.env.NVM_DIR,
        NVM_PATH: process.env.NVM_PATH,
        NVM_BIN: process.env.NVM_BIN,
        NODE_ENV: 'production',
        VITE_USER_NODE_ENV: 'production',
        BASE_URL: tenanthost,
        MODE: 'production',
        DEV: 'false',
        PROD: 'true',
        COMPONENT_HASH: hash,
        NODE_OPTIONS: '--max-old-space-size=256',
      },
    });

    const { stderr, stdout } = await execution;

    if (stderr || !stdout.includes('built in')) {
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
      fs.readFile(path.join(DIST_DIR, hash + '.css'), 'utf-8').catch(() => ''),
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
    throw err;
  } finally {
    await Promise.all([
      fs.unlink(path.join(DIST_DIR, hash + '.umd.js')).catch(() => {}),
      fs.unlink(path.join(DIST_DIR, hash + '.css')).catch(() => {}),
      fs.unlink(path.join(SRC_DIR, hash + '.js')).catch(() => {}),
      fs.unlink(path.join(SRC_DIR, hash + '.vue')).catch(() => {}),
    ]);
  }
}

/**
 * Compiles a Vue component into a client-side library that can be imported in the frontend.
 * Uses an internal queue to ensure only one compilation runs at a time, preventing OOM crashes.
 */
export async function compileVueComponent(
  fileContent: string,
  tenanthost: string = 'http://localhost',
  existingComponents: string[] = []
): Promise<{js: string, css: string, props: Array<{type: string, prop: string}>}> {
  return enqueue(() => runViteBuild(fileContent, tenanthost, existingComponents));
}

/**
 * Compiles multiple Vue components sequentially with memory management.
 * Each component is compiled one at a time through the queue to avoid OOM.
 * Returns results for each component (success or error).
 */
export async function compileVueComponentsBulk(
  components: Array<{ fileContent: string, identifier: string }>,
  tenanthost: string = 'http://localhost',
  existingComponents: string[] = []
): Promise<Array<{
  identifier: string,
  success: boolean,
  result?: { js: string, css: string, props: Array<{type: string, prop: string}> },
  error?: string
}>> {
  const results: Array<{
    identifier: string,
    success: boolean,
    result?: { js: string, css: string, props: Array<{type: string, prop: string}> },
    error?: string
  }> = [];

  for (const component of components) {
    try {
      const result = await enqueue(() => runViteBuild(component.fileContent, tenanthost, existingComponents));
      results.push({ identifier: component.identifier, success: true, result });
    } catch (err: any) {
      const stderr = err?.stderr || err?.message || '';
      results.push({ identifier: component.identifier, success: false, error: stderr });
    }
  }

  return results;
}