import { initializeSdk } from '../services/sdk.mjs';
import { restoreBlueprintEntities } from '../services/blueprint-entities.mjs';
import { createRestoreResolver } from '../services/identity-resolver.mjs';
import { logger } from '../services/logger.mjs';
import fs from 'node:fs';
import path from 'node:path';

export default async function restoreBlueprintsController({ blueprints: blueprintsArg = 'all', include, exclude, override: overrideArg, replace = false, path: targetPath = './dump' }) {
  let override = null;
  if (overrideArg) {
    try {
      override = JSON.parse(overrideArg);
    } catch {
      logger.error(`Invalid JSON override: ${overrideArg}`);
      process.exit(1);
    }
  }

  const includePatterns = include ? include.split(',').map(s => s.trim()).filter(Boolean) : null;
  const excludePatterns = exclude ? exclude.split(',').map(s => s.trim()).filter(Boolean) : null;

  const dumpPath = path.resolve(targetPath);
  const entitiesBasePath = path.join(dumpPath, 'entities');

  if (!fs.existsSync(entitiesBasePath)) {
    logger.error(`Entities directory not found: ${entitiesBasePath}`);
    process.exit(1);
  }

  try {
    const sdk = await initializeSdk();
    const resolveEntity = await createRestoreResolver(sdk, dumpPath);

    let blueprintNames;
    if (blueprintsArg === 'all') {
      blueprintNames = fs.readdirSync(entitiesBasePath).filter(
        name => fs.statSync(path.join(entitiesBasePath, name)).isDirectory()
      );
      if (blueprintNames.length === 0) {
        logger.warning(`No blueprint entity directories found in ${entitiesBasePath}`);
        return;
      }
      logger.info(`Found ${blueprintNames.length} blueprint(s) to restore entities for`);
    } else {
      blueprintNames = blueprintsArg.split(',').map(n => n.trim()).filter(Boolean);
      if (blueprintNames.length === 0) {
        logger.error('No blueprint names provided');
        process.exit(1);
      }
    }

    for (const blueprintName of blueprintNames) {
      logger.section(`Restoring entities for: ${blueprintName}`);
      try {
        await restoreBlueprintEntities(sdk, {
          blueprintName,
          targetPath: entitiesBasePath,
          includePatterns,
          excludePatterns,
          override,
          replace,
          resolveEntity,
        });
      } catch (error) {
        logger.error(`Failed to restore entities for ${blueprintName}`, error);
      }
    }

    logger.success('Done restoring blueprint entities');
  } catch (error) {
    logger.error('Failed to restore blueprint entities', error);
    process.exit(1);
  }
}
