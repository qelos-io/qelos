import { IIntegrationEntity } from '../models/integration';
import IntegrationSource from '../models/integration-source';
import {
  HttpTargetOperation,
  IntegrationSourceKind,
  OpenAITargetOperation,
  QelosTargetOperation,
  ClaudeAITargetOperation
} from '@qelos/global-types';

const supportedSources = {
  [IntegrationSourceKind.Qelos]: {
    [QelosTargetOperation.webhook]: {
      required: ['source', 'kind', 'eventName'],
      optional: [],
    }
  },
  [IntegrationSourceKind.OpenAI]: {
    [OpenAITargetOperation.chatCompletion]: {
      required: [],
      optional: ['pre_messages', 'model', 'temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty', 'stop'],
    }
  },
  [IntegrationSourceKind.ClaudeAi]: {
    [ClaudeAITargetOperation.chatCompletion]: {
      required: [],
      optional: ['system',
        'temperature',
        'top_p',
        'stop_sequences',
        //  'top_k', // Include if you intend to support it
        // 'tools', // Include if you intend to support tool use
        // 'tool_choice' // Include if you intend to support tool use
      ],
    }
  },
  [IntegrationSourceKind.Http]: {
    [HttpTargetOperation.makeRequest]: {
      required: ['model', 'max_tokens', 'messages'],
      optional: ['headers', 'body', 'query', 'method', 'url'],
    }
  }
}

const COMMON_OPTIONAL_PARAMS = ['triggerResponse'];

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

  const invalidParams = Object.keys(target.details)
    .filter(key =>
      !params.required.includes(key) &&
      !params.optional.includes(key) &&
      !COMMON_OPTIONAL_PARAMS.includes(key)
    );
  if (invalidParams.length) {
    throw new Error(`operation ${target.operation} contains invalid details: ${invalidParams.join(',')}`)
  }

  return source;
}