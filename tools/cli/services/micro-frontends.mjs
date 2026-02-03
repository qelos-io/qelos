import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger.mjs';
import { loadReference } from './file-refs.mjs';
import { removeIdFromObject } from '../utils/object-utils.mjs';

/**
 * Convert a string to kebab-case
 * @param {string} str - String to convert
 * @returns {string} Kebab-cased string
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Extract micro-frontend structures to separate HTML files
 * @param {Array} microFrontends - Array of micro-frontend objects
 * @param {string} pluginPath - Base path for the plugin directory
 * @returns {Array} Updated micro-frontends with $ref instead of structure
 */
export function extractMicroFrontendStructures(microFrontends, pluginPath) {
  if (!microFrontends || microFrontends.length === 0) {
    return microFrontends;
  }

  const microFrontendsDir = path.join(pluginPath, 'micro-frontends');
  
  // Create micro-frontends directory if it doesn't exist
  if (!fs.existsSync(microFrontendsDir)) {
    fs.mkdirSync(microFrontendsDir, { recursive: true });
  }

  return microFrontends.map((mf) => {
    // Skip if no structure or structure is already a reference
    if (!mf.structure || typeof mf.structure === 'object') {
      return mf;
    }

    // Generate filename from route name or micro-frontend name
    const fileName = mf.route?.name 
      ? toKebabCase(mf.route.name) 
      : toKebabCase(mf.name);
    
    const htmlFileName = `${fileName}.html`;
    const htmlFilePath = path.join(microFrontendsDir, htmlFileName);
    const relativeRef = `./micro-frontends/${htmlFileName}`;

    // Write structure to HTML file
    fs.writeFileSync(htmlFilePath, mf.structure, 'utf-8');
    logger.debug(`Extracted structure to: ${relativeRef}`);

    // Return micro-frontend with $ref instead of structure
    return {
      ...mf,
      requirements: (mf.requirements || []).map(removeIdFromObject),
      structure: { $ref: relativeRef }
    };
  });
}

/**
 * Resolve micro-frontend structures from $ref references
 * @param {Array} microFrontends - Array of micro-frontend objects
 * @param {string} pluginPath - Base path for resolving relative references
 * @returns {Promise<Array>} Updated micro-frontends with resolved structures
 */
export async function resolveMicroFrontendStructures(microFrontends, pluginPath) {
  if (!microFrontends || microFrontends.length === 0) {
    return microFrontends;
  }

  return await Promise.all(microFrontends.map(async (mf) => {
    // Skip if no structure or structure is not a reference object
    if (!mf.structure || typeof mf.structure !== 'object' || !mf.structure.$ref) {
      return mf;
    }

    const ref = mf.structure.$ref;
    
    try {
      const content = await loadReference(ref, pluginPath);
      
      // Return micro-frontend with resolved structure
      return {
        ...mf,
        structure: content
      };
    } catch (error) {
      logger.error(`Failed to resolve $ref for ${mf.name}: ${error.message}`);
      throw error;
    }
  }));
}
