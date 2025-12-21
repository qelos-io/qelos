import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import logger from './logger';

const DIST_DIR = path.join(__dirname, './components-compiler/dist');
const SRC_DIR = path.join(__dirname, './components-compiler/src/components');

// Memory and queue configuration
const MEMORY_THRESHOLD_MB = 500; // Minimum free memory required to start a build (MB)
const MAX_CONCURRENT_BUILDS = 10; // Maximum number of builds running simultaneously
const MEMORY_CHECK_INTERVAL = 5000; // Check memory every 5 seconds when waiting (ms)
const MAX_OLD_SPACE_SIZE = 4096; // Maximum memory per build process (MB)
const MAX_QUEUE_LENGTH = 20; // Maximum number of builds allowed in queue
const MEMORY_WAIT_TIMEOUT = 60000; // Maximum time to wait for memory (ms)
const BUILD_TIMEOUT = 300000; // Maximum time for a single build (ms)

// Build queue and tracking
interface BuildTask {
  id: string;
  fileContent: string;
  tenanthost: string;
  resolve: (result: {js: string, css: string, props: Array<{type: string, prop: string}>}) => void;
  reject: (error: Error) => void;
}

class BuildQueue {
  private queue: BuildTask[] = [];
  private activeBuilds = 0;
  private processing = false;

  async add(task: BuildTask): Promise<void> {
    if (this.queue.length >= MAX_QUEUE_LENGTH) {
      throw new Error(`Build queue is full (${MAX_QUEUE_LENGTH} items). Please try again later.`);
    }
    
    this.queue.push(task);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing || this.activeBuilds >= MAX_CONCURRENT_BUILDS) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeBuilds < MAX_CONCURRENT_BUILDS) {
      const task = this.queue.shift();
      if (!task) break;

      try {
        // Wait for available memory - catch timeout and attribute to this task
        await this.waitForMemory();
        
        this.activeBuilds++;
        
        // Execute build without awaiting here to allow concurrent builds
        this.executeBuild(task).finally(() => {
          this.activeBuilds--;
          // Process next items in queue
          this.process();
        });
      } catch (error) {
        // If we fail here (e.g., memory timeout), reject the specific task
        logger.error(`Failed to start build ${task.id}:`, error);
        task.reject(error as Error);
      }
    }

    this.processing = false;
  }

  private async waitForMemory(): Promise<void> {
    const startTime = Date.now();
    
    while (true) {
      // Check timeout
      if (Date.now() - startTime > MEMORY_WAIT_TIMEOUT) {
        throw new Error(`Timeout waiting for available memory after ${MEMORY_WAIT_TIMEOUT}ms`);
      }
      
      const freeMemoryMB = os.freemem() / 1024 / 1024;
      const heapUsedMB = process.memoryUsage().heapUsed / 1024 / 1024;
            
      if (freeMemoryMB >= MEMORY_THRESHOLD_MB) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, MEMORY_CHECK_INTERVAL));
    }
  }

  private async executeBuild(task: BuildTask): Promise<void> {
    try {
      const result = await compileInternalWithTimeout(task.fileContent, task.tenanthost, BUILD_TIMEOUT, task.id);
      task.resolve(result);
    } catch (error) {
      task.reject(error as Error);
    }
  }
}

const buildQueue = new BuildQueue();

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
 * Uses a memory-aware queue system to prevent process failures
 * @param fileContent The Vue component content as a string
 * @param tenanthost The tenant host URL
 * @returns An object with compiled js and css strings
 */
export async function compileVueComponent(fileContent: string, tenanthost: string = 'http://localhost'): Promise<{js: string, css: string, props: Array<{type: string, prop: string}>}> {
  const buildId = crypto.randomBytes(8).toString('hex');
  
  return new Promise((resolve, reject) => {
    buildQueue.add({
      id: buildId,
      fileContent,
      tenanthost,
      resolve,
      reject
    });
  });
}

/**
 * Internal compilation function that performs the actual build with proper timeout handling
 * @param fileContent The Vue component content as a string
 * @param tenanthost The tenant host URL
 * @param timeoutMs Build timeout in milliseconds
 * @param buildId Build ID for logging
 * @returns An object with compiled js and css strings
 */
async function compileInternalWithTimeout(fileContent: string, tenanthost: string, timeoutMs: number, buildId: string): Promise<{js: string, css: string, props: Array<{type: string, prop: string}>}> {
  return new Promise((resolve, reject) => {
    const hash = 'Comp' + crypto.createHash('sha256').update(fileContent).digest('hex').substring(0, 8);
    const libJs = `import Component from './${hash}.vue';
window['components:${hash}'] = Component;`;
    let childProcess: any;
    let timeoutId: NodeJS.Timeout;
    let cleanupDone = false;
    
    const cleanup = async () => {
      if (cleanupDone) return;
      cleanupDone = true;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (childProcess && !childProcess.killed) {
        logger.log(`Killing build process ${buildId} due to timeout or error`);
        childProcess.kill('SIGTERM');
        // Force kill if it doesn't terminate gracefully
        setTimeout(() => {
          if (childProcess && !childProcess.killed) {
            childProcess.kill('SIGKILL');
          }
        }, 5000);
      }
      
      // Clean up temp files on timeout or error
      try {
        await Promise.all([
          fs.unlink(path.join(SRC_DIR, hash + '.js')).catch(() => {}),
          fs.unlink(path.join(SRC_DIR, hash + '.vue')).catch(() => {}),
          fs.unlink(path.join(DIST_DIR, hash + '.umd.js')).catch(() => {}),
          fs.unlink(path.join(DIST_DIR, hash + '.css')).catch(() => {}),
        ]);
      } catch (error) {
        logger.log(`Error cleaning up temp files for build ${buildId}:`, error);
      }
    };
    
    const runBuild = async () => {
      try {
        await Promise.all([
          fs.writeFile(path.join(SRC_DIR, hash + '.js'), libJs),
          fs.writeFile(path.join(SRC_DIR, hash + '.vue'), fileContent),
        ]);
        
        // Use spawn instead of exec for better process control
        // Determine the correct vite executable for the platform
        const viteExecutable = process.platform === 'win32' ? 'vite.cmd' : 'vite';
        const vitePath = path.join(__dirname, '../../../node_modules/.bin', viteExecutable);
        
        childProcess = spawn(vitePath, ['build'], {
          cwd: path.join(__dirname, './components-compiler'),
          stdio: 'pipe',
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
            // Set memory limit for child process
            NODE_OPTIONS: `--max-old-space-size=${MAX_OLD_SPACE_SIZE}`,
            // Standard Vite environment variables
            BASE_URL: tenanthost,
            MODE: 'production',
            DEV: 'false',
            PROD: 'true',
            // Custom variables
            COMPONENT_HASH: hash,
          },
        });
        
        let stdout = '';
        let stderr = '';
        
        childProcess.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
        
        childProcess.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
        
        childProcess.on('error', async (error: Error) => {
          await cleanup();
          reject(error);
        });
        
        childProcess.on('exit', async (code: number | null, signal: string | null) => {
          await cleanup();
          
          if (signal === 'SIGTERM' || signal === 'SIGKILL') {
            reject(new Error(`Build ${buildId} was terminated due to timeout`));
            return;
          }
          
          if (code !== 0) {
            // Check if the output files actually exist to determine if compilation succeeded
            const jsFileExists = await fs.access(path.join(DIST_DIR, hash + '.umd.js'))
              .then(() => true)
              .catch(() => false);
              
            if (!jsFileExists) {
              logger.error(`Failed to compile component ${buildId}: output files not found`);
              reject(new Error(`Build failed with exit code ${code}\n${stderr}`));
              return;
            }
          }
          
          try {
            const [jsContent, cssContent] = await Promise.all([
              fs.readFile(path.join(DIST_DIR, hash + '.umd.js'), 'utf-8').catch(() => '{}'),
              fs.readFile(path.join(DIST_DIR, hash + '.css'), 'utf-8').catch(() => ''),
            ]);
            
            resolve({
              js: jsContent + `
              const Component = window['components:${hash}'];
              delete window['components:${hash}'];
              export default Component;`,
              css: cssContent,
              props: getProps(jsContent)
            });
          } catch (error) {
            reject(error);
          }
        });
        
        // Set up timeout
        timeoutId = setTimeout(async () => {
          await cleanup();
          reject(new Error(`Build ${buildId} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        
      } catch (error) {
        await cleanup();
        reject(error);
      }
    };
    
    runBuild();
  });
}