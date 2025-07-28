import { IntegrationSourceKind } from '@qelos/global-types';
import IntegrationSource from '../models/integration-source';
import { IIntegrationEntity } from '../models/integration';
import { ResponseError } from '@qelos/api-kit';

const supportedSources: Record<IntegrationSourceKind, Record<string, { required: string[], optional: string[] }> | null> = {
  [IntegrationSourceKind.Qelos]: {
    webhook: {
      required: ['source', 'kind', 'eventName'],
      optional: []
    },
    chatCompletion: {
      required: [],
      optional: []
    }
  },
  [IntegrationSourceKind.ClaudeAi]: null,
  [IntegrationSourceKind.OpenAI]: {
    functionCalling: {
      required: ['name', 'description'],
      optional: ['allowedIntegrationIds', 'blockedIntegrationIds', 'parameters']
    }
  },
  [IntegrationSourceKind.N8n]: null,
  [IntegrationSourceKind.Email]: null,
  [IntegrationSourceKind.Supabase]: null,
  [IntegrationSourceKind.LinkedIn]: null,
  [IntegrationSourceKind.Http]: null,
  [IntegrationSourceKind.Facebook]: null,
} as const;

const COMMON_OPTIONAL_PARAMS = ['roles', 'workspaceRoles', 'workspaceLabels'];

export async function validateIntegrationTrigger(tenant: string, trigger: IIntegrationEntity) {
  if (!trigger || !trigger.source || !trigger.operation) {
    throw new ResponseError('missing trigger source or operation', 400);
  }
  const source = await IntegrationSource.findOne({ _id: trigger.source, tenant }).lean().exec();

  if (!source) {
    throw new ResponseError('Target source not found', 400);
  }

  const supportedOperations: Record<string, { required: string[], optional: string[] }> = supportedSources[source.kind] || {};

  if (!supportedOperations) {
    throw new ResponseError('Unsupported trigger source kind', 400);
  }

  const params = supportedOperations[trigger.operation];
  if (!params?.required) {
    throw new ResponseError(`Operation ${trigger.operation} does not exist on source of kind ${source.kind}`, 400)
  }
  const hasMissingParams = params.required
    .map(prop => { 
      const type =  typeof trigger.details[prop]
      return type === 'string' || type === 'number' || type === 'boolean'
    })
    .some(isValid => !isValid)

  if (hasMissingParams) {
    throw new ResponseError(`Operation ${trigger.operation} must contain relevant details: ${params.required.join(',')}`, 400)
  }

  // Filter out invalid parameters instead of throwing an error
  const validParams = [...params.required, ...params.optional, ...COMMON_OPTIONAL_PARAMS];
  const invalidParams = Object.keys(trigger.details)
    .filter(key => !validParams.includes(key));
  
  if (invalidParams.length) {
    // Remove invalid parameters from the details object
    invalidParams.forEach(key => {
      delete trigger.details[key];
    });
  }

  return source;
}