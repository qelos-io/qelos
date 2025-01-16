import { IIntegrationEntity } from '../models/integration';
import IntegrationSource from '../models/integration-source';
import { IntegrationSourceKind } from '@qelos/global-types';

const supportedSources = {
  [IntegrationSourceKind.Qelos]: {
    webhook: {
      required: ['source', 'kind', 'eventName'],
      optional: [],
    }
  },
  [IntegrationSourceKind.OpenAI]: {
    createCompletion: {
      required: [],
      optional: ['pre_messages', 'model', 'temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty', 'stop'],
    }
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

  const supportedOperations: Record<string, { required: string[], optional: string[] }> = supportedSources[source.kind];

  if (!supportedOperations) {
    throw new Error('unsupported target source kind');
  }

  const params = supportedOperations[target.operation];
  if (!params?.required) {
    throw new Error(`operation ${target.operation} does not exist on source of kind ${source.kind}`)
  }
  const hasMissingParams = params.required
    .map(prop => typeof target.details[prop] === 'string')
    .some(isValid => !isValid)

  if (hasMissingParams) {
    throw new Error(`operation ${target.operation} must contain relevant details: ${params.required.join(',')}`)
  }

  const invalidParams = Object.keys(target.details).filter(key => !params.required.includes(key) && !params.optional.includes(key));
  if (invalidParams.length) {
    throw new Error(`operation ${target.operation} contains invalid details: ${invalidParams.join(',')}`)
  }

  return source;
}