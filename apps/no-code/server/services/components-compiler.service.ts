import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import logger from './logger';

const execPromise = promisify(exec);

const DIST_DIR = path.join(__dirname, './components-compiler/dist');
const SRC_DIR = path.join(__dirname, './components-compiler/src/components');

/**
 * Compiles a Vue component into a client-side library that can be imported in the frontend
 * @param fileContent The Vue component content as a string
 * @returns An object with compiled js and css strings
 */
export async function compileVueComponent(fileContent: string, tenanthost: string = 'http://localhost'): Promise<{js: string, css: string}> {
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
      css: cssContent
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
