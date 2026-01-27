import * as jq from 'node-jq';

import { IDataManipulationStep, PopulateSource } from '@qelos/global-types';
import { getUser, getWorkspaces } from './users';
import { getBlueprintEntities, getBlueprintEntity } from './no-code-service';
import { getVectorStores } from './ai-service';
import { triggerWebhookService } from './webhook-service';

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
      const populatePromises = Object.entries(populate).map(async ([key, config]) => {
        const { source, blueprint } = config || {} as any;

        // Skip undefined values for all sources except vectorStore and apiWebhook
        if (source !== PopulateSource.vectorStores && source !== PopulateSource.apiWebhook && typeof previousData[key] === 'undefined') {
          return { key, value: undefined };
        }

        try {
          let result;
          if (source === PopulateSource.user) {
            result = await getUser(tenant, previousData[key]);
          } else if (source === PopulateSource.workspace) {
            result = await getWorkspaces(tenant, previousData[key]);
          } else if (source === PopulateSource.blueprintEntity) {
            const existing = previousData[key];
            if (existing && typeof existing === 'object' && existing.entity && existing.blueprint) {
              result = await getBlueprintEntity(tenant, existing.blueprint, existing.entity);
            } else if (blueprint && typeof existing === 'string') {
              result = await getBlueprintEntity(tenant, blueprint, existing);
            }
          } else if (source === PopulateSource.blueprintEntities) {
            const existing = previousData[key];
            const blueprint = config.blueprint || existing.blueprint;
            if (existing && blueprint) {
              result = await getBlueprintEntities(tenant, blueprint, existing);
            }
          } else if (source === PopulateSource.vectorStores) {
            const existing = previousData[key] || {};
            const scope = existing.scope || config?.scope || 'tenant';
            const subjectId = existing.subjectId || config?.subjectId;
            result = await getVectorStores(tenant, { scope, subjectId });
          } else if (source === PopulateSource.apiWebhook) {
            const existing: any = previousData[key] || {};
            const integrationId = existing.integration || config?.integration;
            const user = existing.user || {role: ['admin'] };
            result = await triggerWebhookService(tenant, integrationId, { ...existing, user});
          }
          return { key, value: result };
        } catch (err) {
          throw new DataManipulationError(`Failed to populate "${key}" from ${source}`, {
            stepIndex,
            phase: 'populate',
            field: key,
            source,
            cause: err
          });
        }
      });

      const results = await Promise.all(populatePromises);
      
      // Apply the results to the data object
      results.forEach(({ key, value }) => {
        if (value !== undefined) {
          data[key] = value;
        }
      });
    }

    previousData = data;
  }

  return previousData;
}