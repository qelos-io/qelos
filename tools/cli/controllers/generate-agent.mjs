import { generateAgent } from '../services/generate/agent.mjs';
import { logger } from '../services/utils/logger.mjs';

export default async function generateAgentController({ name }) {
  try {
    const cwd = process.cwd();
    
    logger.section(`Generating agent: ${name}`);

    const result = await generateAgent(name, cwd);
    
    if (!result.success) {
      logger.error(`Failed to generate agent: ${result.message}`);
      process.exit(1);
    }

  } catch (error) {
    logger.error(`Failed to generate agent`, error);
    process.exit(1);
  }
}
