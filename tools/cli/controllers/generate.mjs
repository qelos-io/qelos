import { generateRules } from '../services/generate/rules.mjs';
import { logger } from '../services/utils/logger.mjs';
import fs from 'node:fs';
import path from 'node:path';

export default async function generateController({ type }) {
  try {
    const cwd = process.cwd();
    
    logger.section(`Generating ${type} rules for ${cwd}`);

    // Check for existing rules
    const existingRules = checkExistingRules(type, cwd);
    if (existingRules.length > 0) {
      logger.warning('Existing rules files found:');
      existingRules.forEach(file => {
        logger.info(`  - ${file}`);
      });
      logger.info('These files will be updated with the latest rules.');
    }

    // Determine which IDE types to generate
    const ideTypes = type === 'all' 
      ? ['windsurf', 'cursor', 'claude']
      : [type];

    for (const ideType of ideTypes) {
      logger.step(`Generating ${ideType} rules...`);
      const result = await generateRules(ideType, cwd);
      
      if (result.success) {
        if (result.files && result.files.length > 1) {
          logger.success(`Generated ${ideType} rules files:`);
          result.files.forEach(file => {
            const relativePath = path.relative(cwd, file);
            logger.info(`  - ${relativePath}`);
          });
        } else if (result.files && result.files.length === 1) {
          const relativePath = path.relative(cwd, result.files[0]);
          logger.success(`Generated ${ideType} rules at: ${relativePath}`);
        }
        
        // Show IDE-specific instructions
        showIDESpecificInstructions(ideType, cwd);
      } else {
        logger.warning(`Skipped ${ideType}: ${result.message}`);
      }
    }

    logger.success(`Rules generation completed`);
    logger.info('Your IDE should now automatically pick up the rules for better assistance.');

  } catch (error) {
    logger.error(`Failed to generate rules`, error);
    process.exit(1);
  }
}

/**
 * Check for existing rules files
 * @param {string} ideType - Type of IDE
 * @param {string} basePath - Base path
 * @returns {Array} Array of existing rule file paths
 */
function checkExistingRules(ideType, basePath) {
  const existing = [];
  
  if (ideType === 'windsurf' || ideType === 'all') {
    const windsurfRules = path.join(basePath, '.windsurf', 'rules');
    if (fs.existsSync(windsurfRules)) {
      const files = fs.readdirSync(windsurfRules);
      files.forEach(file => {
        existing.push(path.join('.windsurf', 'rules', file));
      });
    }
  }
  
  if (ideType === 'cursor' || ideType === 'all') {
    const cursorRules = path.join(basePath, '.cursorrules');
    if (fs.existsSync(cursorRules)) {
      existing.push('.cursorrules');
    }
  }
  
  if (ideType === 'claude' || ideType === 'all') {
    const claudeRules = path.join(basePath, '.clinerules');
    if (fs.existsSync(claudeRules)) {
      existing.push('.clinerules');
    }
    const claudeMd = path.join(basePath, 'CLAUDE.md');
    if (fs.existsSync(claudeMd)) {
      existing.push('CLAUDE.md');
    }
  }
  
  return existing;
}

/**
 * Show IDE-specific instructions
 * @param {string} ideType - Type of IDE
 * @param {string} basePath - Base path
 */
function showIDESpecificInstructions(ideType, basePath) {
  logger.info('');
  
  switch (ideType) {
    case 'windsurf':
      logger.info(`${ideType.toUpperCase()} Instructions:`);
      logger.info('  - Rules are placed in .windsurf/rules/ directory');
      logger.info('  - Windsurf will automatically detect and apply these rules');
      logger.info('  - Each resource type has its own rule file for better organization');
      break;
      
    case 'cursor':
      logger.info(`${ideType.toUpperCase()} Instructions:`);
      logger.info('  - Rules are written to .cursorrules file');
      logger.info('  - Cursor will automatically pick up this file');
      logger.info('  - All rules are combined into a single file for compatibility');
      break;
      
    case 'claude':
      logger.info(`${ideType.toUpperCase()} Instructions:`);
      logger.info('  - Rules are written to .clinerules file');
      logger.info('  - CLAUDE.md is also generated for project-specific context');
      logger.info('  - Claude Desktop will automatically use these files');
      break;
  }
  
  logger.info('');
}
