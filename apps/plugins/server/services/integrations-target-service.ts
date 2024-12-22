import { IIntegrationEntity } from '../models/integration';
import IntegrationSource from '../models/integration-source';

const supportedSources = {
  qelos: {
    webhook: ['source', 'kind', 'eventName']
  },
}

export async function validateIntegrationTarget(tenant: string, target: IIntegrationEntity) {
  if (!target || !target.source || !target.operation) {
    throw new Error('missing target source or operation');
  }
  const source = await IntegrationSource.findOne({ _id: target.source, tenant }).lean().exec();

  if (!source) {
    throw new Error('target source not found');
  }

  const supportedOperations: Record<string, string[]> = supportedSources[source.kind];

  if (!supportedOperations) {
    throw new Error('unsupported target source kind');
  }

  const mandatoryParams = supportedOperations[target.operation];
  if (!mandatoryParams) {
    throw new Error(`operation ${target.operation} does not exist on source of kind ${source.kind}`)
  }
  const hasMissingParams = mandatoryParams
    .map(prop => typeof target.details[prop] === 'string')
    .some(isValid => !isValid)

  if (hasMissingParams) {
    throw new Error(`operation ${target.operation} must contain relevant details: ${mandatoryParams.join(',')}`)
  }

  return source;
}