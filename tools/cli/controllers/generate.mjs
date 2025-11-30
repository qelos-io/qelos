import { generateRules } from '../services/generate-rules.mjs';
import { logger } from '../services/logger.mjs';

export default async function generateController({ type }) {
  try {
    const cwd = process.cwd();
    
    logger.section(`Generating ${type} rules for ${cwd}`);

    // Determine which IDE types to generate
    const ideTypes = type === 'all' 
      ? ['windsurf', 'cursor', 'claude']
      : [type];

    for (const ideType of ideTypes) {
      logger.step(`Generating ${ideType} rules...`);
      const result = await generateRules(ideType, cwd);
      
      if (result.success) {
        logger.success(`Generated ${ideType} rules at: ${result.filePath}`);
      } else {
        logger.warning(`Skipped ${ideType}: ${result.message}`);
      }
    }

    logger.success(`Rules generation completed`);

  } catch (error) {
    logger.error(`Failed to generate rules`, error);
    process.exit(1);
  }
}
