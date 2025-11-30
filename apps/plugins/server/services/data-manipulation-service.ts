import * as jq from 'node-jq';

import logger from './logger';
import { IDataManipulationStep } from '@qelos/global-types';
import { getUser, getWorkspaces } from './users';
import { getBlueprintEntities, getBlueprintEntity } from './no-code-service';

type DataManipulationPhase = 'map' | 'populate' | 'abort' | 'step';

export class DataManipulationError extends Error {
  stepIndex: number;
  phase: DataManipulationPhase;
  field?: string;
  source?: string;
  cause?: unknown;

  constructor(message: string, options: { stepIndex: number; phase: DataManipulationPhase; field?: string; source?: string; cause?: unknown }) {
    super(message);
    this.name = 'DataManipulationError';
    this.stepIndex = options.stepIndex;
    this.phase = options.phase;
    this.field = options.field;
    this.source = options.source;
    this.cause = options.cause;
  }
}

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
  let previousData = await initialPayload;

  for (let stepIndex = 0; stepIndex < dataManipulation.length; stepIndex++) {
    const { map, populate, clean, abort } = dataManipulation[stepIndex] || {};

    if (typeof abort === 'boolean' && abort) {
      return { abort };
    }

    if (typeof abort === 'string') {
      try {
        const abortValue = abort === 'true' || await processMapRecursively(abort, previousData);
        if (abortValue) {
          return { abort: true };
        }
      } catch (err) {
        throw new DataManipulationError('Failed to evaluate abort condition', {
          stepIndex,
          phase: 'abort',
          field: 'abort',
          cause: err
        });
      }
    }

    const data = clean ? {} : previousData;

    if (map) {
      for (const [key, value] of Object.entries(map)) {
        try {
          data[key] = await processMapRecursively(value, previousData);
        } catch (err) {
          throw new DataManipulationError(`Failed to map "${key}"`, {
            stepIndex,
            phase: 'map',
            field: key,
            cause: err
          });
        }
      }
    }

    if (populate) {
      for (const [key, config] of Object.entries(populate)) {
        if (typeof previousData[key] === 'undefined') {
          continue;
        }

        const { source, blueprint } = config || {} as any;

        try {
          if (source === 'user') {
            data[key] = await getUser(tenant, previousData[key]);
          } else if (source === 'workspace') {
            data[key] = await getWorkspaces(tenant, previousData[key]);
          } else if (source === 'blueprintEntity') {
            const existing = previousData[key];
            if (existing && typeof existing === 'object' && existing.entity && existing.blueprint) {
              data[key] = await getBlueprintEntity(tenant, existing.blueprint, existing.entity);
            } else if (blueprint && typeof existing === 'string') {
              data[key] = await getBlueprintEntity(tenant, blueprint, existing);
            }
          } else if (source === 'blueprintEntities') {
            const existing = previousData[key];
            const blueprint = config.blueprint || existing.blueprint;
            if (existing && blueprint) {
              data[key] = await getBlueprintEntities(tenant, blueprint, existing);
            }
          }
        } catch (err) {
          throw new DataManipulationError(`Failed to populate "${key}" from ${source}`, {
            stepIndex,
            phase: 'populate',
            field: key,
            source,
            cause: err
          });
        }
      }
    }

    previousData = data;
  }

  return previousData;
}