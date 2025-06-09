import * as jq from 'node-jq';

import logger from './logger';
import { IntegrationSourceKind, IDataManipulationStep } from '@qelos/global-types';
import { getUser, getWorkspaces } from './users';
import { getBlueprintEntities, getBlueprintEntity } from './no-code-service';

async function processMapRecursively(value: any, data: any): Promise<any> {
  if (typeof value === 'object' && value !== null) {
    const result: any = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = await processMapRecursively(v, data);
    }
    return result;
  } else if (typeof value === 'string') {
    // If it's a string, treat it as a JQ expression
    return await jq.run(value, data, { output: 'json', input: 'json' });
  }
  return value;
}

export async function executeDataManipulation(tenant: string, initialPayload: any | Promise<any> = {}, dataManipulation: IDataManipulationStep[]) {
   // every step in data manipulation should be executed in order, asynchronously
   const calculatedData = await dataManipulation.reduce(async (acc, { map, populate, clean, abort }) => {
    if (typeof abort === 'boolean' && abort) {
      return { abort };
    }        
    const previousData = await acc;
    if (typeof abort === 'string') {
      try {
        const abortValue = abort === 'true' || await processMapRecursively(abort, previousData);
        if (abortValue) {
          return { abort: true };
        }
      } catch (err) {
        logger.error('failed to evaluate abort condition', err);
      }
    }
    const data = clean ? {} : previousData;
    await Promise.all([
      ...Object.entries(map || {}).map(async ([key, value]) => {
        data[key] = await processMapRecursively(value, previousData);
      }),
      ...Object.entries(populate || {}).map(async ([key, { source, blueprint }]) => {
        if (typeof previousData[key] === 'undefined') {
          return;
        }
        if (source === 'user') {
          data[key] = await getUser(tenant, previousData[key])
        } else if (source === 'workspace') {
          // populate data from given object using qelos source. If blueprint is provided, it will be used to fetch the blueprint entity
          data[key] = await getWorkspaces(tenant, previousData[key])
        } else if (source === 'blueprintEntity' && blueprint) {
          data[key] = await (getBlueprintEntity(tenant, blueprint, previousData[key]))
          // populate data from given object using qelos source. If blueprint is provided, it will be used to fetch the blueprint entity
        } else if (source === 'blueprintEntities' && blueprint) {
          data[key] = await (getBlueprintEntities(tenant, blueprint, previousData[key]))
        }
      })
    ]);

    return data
  }, initialPayload);

  return calculatedData;
}