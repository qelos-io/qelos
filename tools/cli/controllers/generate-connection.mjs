import { generateConnection } from '../services/generate-connection.mjs';
import { logger } from '../services/logger.mjs';

export default async function generateConnectionController({ name, kind }) {
  try {
    const cwd = process.cwd();
    
    logger.section(`Generating connection: ${name}`);

    const result = await generateConnection(name, kind, cwd);
    
    if (!result.success) {
      logger.error(`Failed to generate connection: ${result.message}`);
      process.exit(1);
    }

  } catch (error) {
    logger.error(`Failed to generate connection`, error);
    process.exit(1);
  }
}
