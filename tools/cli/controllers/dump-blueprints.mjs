import { initializeSdk } from '../services/sdk.mjs';
import { dumpBlueprintEntities } from '../services/blueprint-entities.mjs';
import { createDumpResolver } from '../services/identity-resolver.mjs';
import { logger } from '../services/logger.mjs';
import path from 'node:path';

export default async function dumpBlueprintsController({ blueprints: blueprintsArg = 'all', filter: filterArg, group, path: targetPath = './dump' }) {
  let filter = {};
  if (filterArg) {
    try {
      filter = JSON.parse(filterArg);
    } catch {
      logger.error(`Invalid JSON filter: ${filterArg}`);
      process.exit(1);
    }
  }

  const dumpPath = path.resolve(targetPath);
  const resolveEntity = createDumpResolver(dumpPath);

  try {
    const sdk = await initializeSdk();

    let blueprintNames;
    if (blueprintsArg === 'all') {
      const allBlueprints = await sdk.manageBlueprints.getList();
      blueprintNames = allBlueprints.map(b => b.identifier);
      if (blueprintNames.length === 0) {
        logger.warning('No blueprints found');
        return;
      }
      logger.info(`Found ${blueprintNames.length} blueprint(s) to dump entities from`);
    } else {
      blueprintNames = blueprintsArg.split(',').map(n => n.trim()).filter(Boolean);
      if (blueprintNames.length === 0) {
        logger.error('No blueprint names provided');
        process.exit(1);
      }
    }

    const entitiesBasePath = path.join(dumpPath, 'entities');

    for (const blueprintName of blueprintNames) {
      logger.section(`Dumping entities for: ${blueprintName}`);
      try {
        await dumpBlueprintEntities(sdk, {
          blueprintName,
          targetPath: entitiesBasePath,
          filter,
          group,
          resolveEntity,
        });
      } catch (error) {
        logger.error(`Failed to dump entities for ${blueprintName}`, error);
      }
    }

    logger.success('Done dumping blueprint entities');
  } catch (error) {
    logger.error('Failed to dump blueprint entities', error);
    process.exit(1);
  }
}
