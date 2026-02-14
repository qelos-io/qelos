import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger.mjs';

/**
 * Get the identifier field name for a resource type
 * @param {string} resourceType - Type of resource
 * @returns {string} - The field name used as identifier
 */
function getIdentifierField(resourceType) {
  const identifierFields = {
    blueprints: 'identifier',
    configs: 'key',
    plugins: 'apiPath',
    integrations: '_id',
    connections: '_id'
  };
  
  return identifierFields[resourceType] || '_id';
}

/**
 * Extract identifier from a resource file
 * @param {string} filePath - Path to the resource file
 * @param {string} resourceType - Type of resource
 * @param {string} basePath - Base path for relative calculation (optional)
 * @returns {string|null} - The identifier value or null if not found
 */
function extractIdentifier(filePath, resourceType, basePath = null) {
  try {
    // For JSON-based resources, parse and extract identifier
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const identifierField = getIdentifierField(resourceType);
    
    return data[identifierField] || null;
  } catch (error) {
    logger.debug(`Failed to extract identifier from ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Check for duplicate identifiers in resource files
 * @param {string[]} filePaths - Array of file paths to check
 * @param {string} resourceType - Type of resource
 * @param {string} basePath - Base path for relative calculation (optional)
 * @returns {Object[]} - Array of duplicate groups
 */
function checkDuplicateIdentifiers(filePaths, resourceType, basePath = null) {
  const identifierMap = new Map();
  const duplicates = [];
  
  for (const filePath of filePaths) {
    const identifier = extractIdentifier(filePath, resourceType, basePath);
    
    if (!identifier) {
      continue; // Skip files without identifiers
    }
    
    if (identifierMap.has(identifier)) {
      // Found a duplicate
      const existing = identifierMap.get(identifier);
      
      // Find if this duplicate group already exists
      let duplicateGroup = duplicates.find(group => group.identifier === identifier);
      
      if (!duplicateGroup) {
        // Create new duplicate group
        duplicateGroup = {
          identifier,
          files: [existing]
        };
        duplicates.push(duplicateGroup);
      }
      
      // Add current file to the group
      duplicateGroup.files.push(filePath);
    } else {
      identifierMap.set(identifier, filePath);
    }
  }
  
  return duplicates;
}

/**
 * Display duplicate identifier conflicts to the user
 * @param {Object[]} duplicates - Array of duplicate groups
 * @param {string} resourceType - Type of resource
 */
function displayDuplicateConflicts(duplicates, resourceType) {
  if (duplicates.length === 0) {
    return;
  }
  
  logger.error(`\nFound ${duplicates.length} duplicate identifier conflict(s) in ${resourceType}:`);
  
  for (const duplicate of duplicates) {
    logger.error(`\n  Duplicate identifier: "${duplicate.identifier}"`);
    logger.error(`  Found in ${duplicate.files.length} files:`);
    
    duplicate.files.forEach(file => {
      logger.error(`    • ${path.relative(process.cwd(), file)}`);
    });
    
    logger.warning(`  Please remove one of the duplicate files and try again.`);
  }
  
  logger.error('\nPush aborted due to duplicate identifiers.');
}

export {
  getIdentifierField,
  extractIdentifier,
  checkDuplicateIdentifiers,
  displayDuplicateConflicts
};
