import { IntegrationSourceKind } from '@qelos/global-types';
import IntegrationSource from '../models/integration-source';
import { IIntegrationEntity } from '../models/integration';

const supportedSources: Record<IntegrationSourceKind, Record<string, string[] | undefined> | null> = {
  [IntegrationSourceKind.Qelos]: {
    webhook: ['source', 'kind', 'eventName']
  },
  [IntegrationSourceKind.ClaudeAi]: null,
  [IntegrationSourceKind.OpenAI]: null,
  [IntegrationSourceKind.N8n]: null,
  [IntegrationSourceKind.Email]: null,
  [IntegrationSourceKind.Supabase]: null,
  [IntegrationSourceKind.LinkedIn]: null,
  [IntegrationSourceKind.Http]: null,
}

export async function validateIntegrationTrigger(tenant: string, trigger: IIntegrationEntity) {
  if (!trigger || !trigger.source || !trigger.operation) {
    throw new Error('missing trigger source or operation');
  }
  const source = await IntegrationSource.findOne({ _id: trigger.source, tenant }).lean().exec();

  if (!source) {
    throw new Error('target source not found');
  }

  const supportedOperations = supportedSources[source.kind];

  if (!supportedOperations) {
    throw new Error('unsupported trigger source kind');
  }

  const mandatoryParams = supportedOperations[trigger.operation];
  if (!mandatoryParams) {
    throw new Error(`operation ${trigger.operation} does not exist on source of kind ${source.kind}`)
  }
  const hasMissingParams = mandatoryParams
    .map(prop => typeof trigger.details[prop] === 'string')
    .some(isValid => !isValid)

  if (hasMissingParams) {
    throw new Error(`operation ${trigger.operation} must contain relevant details: ${mandatoryParams.join(',')}`)
  }

  return source;
}