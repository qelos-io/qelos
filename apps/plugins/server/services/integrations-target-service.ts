import { ResponseError } from '@qelos/api-kit';
import { IIntegrationEntity } from '../models/integration';
import IntegrationSource from '../models/integration-source';
import {
  HttpTargetOperation,
  IntegrationSourceKind,
  OpenAITargetOperation,
  QelosTargetOperation,
  ClaudeAITargetOperation,
  EmailTargetOperation
} from '@qelos/global-types';

const supportedSources = {
  [IntegrationSourceKind.Qelos]: {
    [QelosTargetOperation.webhook]: {
      required: ['source', 'kind', 'eventName'],
      optional: [],
    },
    [QelosTargetOperation.createUser]: {
      required: [],
      optional: ['password', 'roles']
    },
    [QelosTargetOperation.updateUser]: {
      required: [],
      optional: ['userId', 'password', 'roles']
    },
    [QelosTargetOperation.setUserRoles]: {
      required: [],
      optional: ['userId', 'roles']
    },
    [QelosTargetOperation.setWorkspaceLabels]: {
      required: [],
      optional: ['workspaceId', 'labels']
    },
    [QelosTargetOperation.createBlueprintEntity]: {
      required: [],
      optional: ['blueprint', 'metadata']
    },
    [QelosTargetOperation.updateBlueprintEntity]: {
      required: [],
      optional: ['blueprint', 'metadata']
    },
  },
  [IntegrationSourceKind.OpenAI]: {
    [OpenAITargetOperation.chatCompletion]: {
      required: [],
      optional: ['pre_messages', 'model', 'temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty', 'stop', 'response_format', 'embeddingType', 'maxTools', 'ingestedBlueprints'],
    }
  },
  [IntegrationSourceKind.ClaudeAi]: {
    [ClaudeAITargetOperation.chatCompletion]: {
      required: [],
      optional: [
        'system',
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
      required: [],
      optional: ['headers', 'body', 'query', 'method', 'url'],
    }
  },
  [IntegrationSourceKind.Email]: {
    [EmailTargetOperation.sendEmail]: {
      required: [],
      optional: ['to', 'subject', 'body', 'cc', 'bcc'],
    }
  }
}

const COMMON_OPTIONAL_PARAMS = ['triggerResponse'];

export async function validateIntegrationTarget(tenant: string, target: IIntegrationEntity) {
  if (!target || !target.source || !target.operation) {
    throw new ResponseError('missing target source or operation', 400);
  }
  const source = await IntegrationSource.findOne({ _id: target.source, tenant }).lean().exec();

  if (!source) {
    throw new ResponseError('target source not found', 400);
  }

  const supportedOperations: Record<string, { required: string[], optional: string[] }> = supportedSources[source.kind];

  if (!supportedOperations) {
    throw new ResponseError('unsupported target source kind', 400);
  }

  const params = supportedOperations[target.operation];
  if (!params?.required) {
    throw new ResponseError(`operation ${target.operation} does not exist on source of kind ${source.kind}`, 400)
  }
  const hasMissingParams = params.required
    .map(prop => { 
      const type = typeof target.details[prop]
      return type === 'string' || type === 'number' || type === 'boolean'
    })
    .some(isValid => !isValid)

  if (hasMissingParams) {
    throw new ResponseError(`operation ${target.operation} must contain relevant details: ${params.required.join(',')}`, 400)
  }

  // Filter out invalid parameters instead of throwing an error
  const validParams = [...params.required, ...params.optional, ...COMMON_OPTIONAL_PARAMS];
  const invalidParams = Object.keys(target.details)
    .filter(key => !validParams.includes(key));
  
  if (invalidParams.length) {
    // Remove invalid parameters from the details object
    invalidParams.forEach(key => {
      delete target.details[key];
    });
  }

  return source;
}