import { logger } from '../services/logger.mjs';
import { getGitFiles } from '../services/git-files.mjs';
import { green, blue, yellow, red } from '../utils/colors.mjs';
import fs from 'node:fs';
import path from 'node:path';

export default async function getController(argv) {
  const { type, path: basePath, json, verbose } = argv;
  
  if (verbose) {
    process.env.VERBOSE = 'true';
  }
  
  try {
    // For git-based types (committed, staged)
    if (type === 'committed' || type === 'staged') {
      const classified = getGitFiles(type, basePath || '.');
      
      if (json) {
        console.log(JSON.stringify(classified, null, 2));
        return;
      }
      
      // Display results
      console.log(blue(`\n=== ${type.toUpperCase()} FILES ===\n`));
      
      Object.entries(classified).forEach(([fileType, files]) => {
        if (files.length > 0) {
          console.log(yellow(`${fileType.toUpperCase()} (${files.length}):`));
          files.forEach(file => {
            const relativePath = path.relative(basePath || '.', file);
            console.log(`  - ${relativePath}`);
          });
          console.log('');
        }
      });
      
      return;
    }
    
    // For other types, we would need to implement similar logic to push
    // For now, just show what would be searched for
    console.log(blue(`\n=== SEARCH FOR ${type.toUpperCase()} ===\n`));
    console.log(yellow(`Base path: ${basePath || '.'}`));
    console.log(red(`Note: Only 'committed' and 'staged' types are currently supported for preview.`));
    
  } catch (error) {
    logger.error(error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
