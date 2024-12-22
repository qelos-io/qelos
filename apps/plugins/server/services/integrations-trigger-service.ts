import { IIntegrationEntity } from '../models/integration';
import IntegrationSource from '../models/integration-source';

const supportedSources = {
  qelos: {
    webhook: ['source', 'kind', 'eventName']
  },
}

export async function validateIntegrationTrigger(tenant: string, trigger: IIntegrationEntity) {
  if (!trigger || !trigger.source || !trigger.operation) {
    throw new Error('missing trigger source or operation');
  }
  const source = await IntegrationSource.findOne({ _id: trigger.source, tenant }).lean().exec();

  if (!source) {
    throw new Error('target source not found');
  }

  const supportedOperations: Record<string, string[]> = supportedSources[source.kind];

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