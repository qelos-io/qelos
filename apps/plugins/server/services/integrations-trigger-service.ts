import { IntegrationSourceKind } from '@qelos/global-types';
import IntegrationSource from '../models/integration-source';
import { IIntegrationEntity } from '../models/integration';

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
} as const;

const COMMON_OPTIONAL_PARAMS = ['roles', 'workspaceRoles', 'workspaceLabels'];

export async function validateIntegrationTrigger(tenant: string, trigger: IIntegrationEntity) {
  if (!trigger || !trigger.source || !trigger.operation) {
    throw new Error('missing trigger source or operation');
  }
  const source = await IntegrationSource.findOne({ _id: trigger.source, tenant }).lean().exec();

  if (!source) {
    throw new Error('target source not found');
  }

  const supportedOperations: Record<string, { required: string[], optional: string[] }> = supportedSources[source.kind] || {};

  if (!supportedOperations) {
    throw new Error('unsupported trigger source kind');
  }

  const params = supportedOperations[trigger.operation];
  if (!params?.required) {
    throw new Error(`operation ${trigger.operation} does not exist on source of kind ${source.kind}`)
  }
  const hasMissingParams = params.required
    .map(prop => { 
      const type =  typeof trigger.details[prop]
      return type === 'string' || type === 'number' || type === 'boolean'
    })
    .some(isValid => !isValid)

  if (hasMissingParams) {
    throw new Error(`operation ${trigger.operation} must contain relevant details: ${params.required.join(',')}`)
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