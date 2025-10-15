import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import logger from './logger';

const execPromise = promisify(exec);

const DIST_DIR = path.join(__dirname, './components-compiler/dist');
const SRC_DIR = path.join(__dirname, './components-compiler/src/components');

function getProps(jsContent: string): Array<{type: string, prop: string, placeholder?: string}> {
  try {
    // Extract the props section using a more robust approach
    const nameMatch = jsContent.match(/__name:"[^"]+",props:/g);
    if (!nameMatch) {
      return [];
    }
    
    // Find the position of the props definition
    const propsStart = jsContent.indexOf(nameMatch[0]) + nameMatch[0].length;
    
    // Now extract the props object by balancing braces
    let braceCount = 0;
    let propsEnd = propsStart;
    let foundOpeningBrace = false;
    
    for (let i = propsStart; i < jsContent.length; i++) {
      const char = jsContent[i];
      
      if (char === '{') {
        foundOpeningBrace = true;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      }
      
      // If we've found the opening brace and balanced all braces, we've found the end
      if (foundOpeningBrace && braceCount === 0) {
        propsEnd = i + 1; // Include the closing brace
        break;
      }
    }
    
    // Extract the props object string
    const propsObjectStr = jsContent.substring(propsStart, propsEnd);
    
    if (!propsObjectStr || propsObjectStr === '') {
      return [];
    }
    
    // Process the props object
    // We need to convert the props object to a valid JSON format
    // First, convert all property names to quoted strings
    let processedStr = propsObjectStr.replace(/([a-zA-Z0-9_$]+):/g, '"$1":');
    
    // Replace JavaScript constructors with their string representation
    processedStr = processedStr
      .replace(/:\s*String\b/g, ':"string"')
      .replace(/:\s*Number\b/g, ':"number"')
      .replace(/:\s*Boolean\b/g, ':"boolean"')
      .replace(/:\s*Object\b/g, ':"object"')
      .replace(/:\s*Array\b/g, ':"array"')
      .replace(/:\s*Function\b/g, ':"function"')
      .replace(/:\s*Date\b/g, ':"date"')
      .replace(/:\s*RegExp\b/g, ':"regexp"');
    
    // Handle objects with type property
    processedStr = processedStr.replace(/:\s*\{\s*type\s*:\s*([A-Za-z0-9_$]+)\s*\}/g, 
      (_, type) => `:"${type.toLowerCase()}"`);
    
    // Handle empty objects and unknown types
    processedStr = processedStr
      .replace(/:\s*\{\s*\}/g, ':"object"')
      .replace(/:\s*([A-Z][a-zA-Z0-9_$]*)\b/g, ':"object"');

    // Replace single quotes with double quotes
    processedStr = processedStr.replace(/'/g, '"');
    
    const props = Function(`return ${processedStr}`)();

    return Object.entries(props).map(([prop, type]) => ({
      type: (typeof type === 'object' ? (type as any)?.type?.toString() : type?.toString()) || 'object',
      prop,
      placeholder: (typeof type === 'object' && (type as any)?.default) ? (type as any)?.default : undefined,
      }));
  } catch (error) {
    logger.error('Error extracting props from component', error);
    return [];
  }
}

/**
 * Compiles a Vue component into a client-side library that can be imported in the frontend
 * @param fileContent The Vue component content as a string
 * @returns An object with compiled js and css strings
 */
export async function compileVueComponent(fileContent: string, tenanthost: string = 'http://localhost'): Promise<{js: string, css: string, props: Array<{type: string, prop: string}>}> {
  const hash = 'Comp' + crypto.createHash('sha256').update(fileContent).digest('hex').substring(0, 8);
  const libJs = `import Component from './${hash}.vue';
  window['components:${hash}'] = Component;`;
  try {
    await Promise.all([
      fs.writeFile(path.join(SRC_DIR, hash + '.js'), libJs),
      fs.writeFile(path.join(SRC_DIR, hash + '.vue'), fileContent),
    ]);

    const { stderr ,stdout } = await execPromise(`../../../node_modules/.bin/vite build`, { 
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
      },
    });

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
      props: getProps(jsContent)
    };
  } catch (err: any) {
    logger.error('failed to compile component', err);
    throw new Error('failed to compile component');
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
