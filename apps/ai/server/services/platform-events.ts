import { emitPlatformEvent, type PlatformEvent } from '@qelos/api-kit';
import logger from './logger';

type DataManipulationStage = 'pre_chat' | 'tool_call';

type BaseEventParams = {
  tenant?: string;
  userId?: string;
  context?: Record<string, any>;
};

export function serializeError(error: any) {
  if (!error) {
    return null;
  }

  return {
    message: error.message,
    code: error.code,
    type: error.type,
    status: error.status ?? error.response?.status,
    responseData: error.response?.data,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
}

function emitSafePlatformEvent(event: PlatformEvent) {
  try {
    emitPlatformEvent(event);
  } catch (error) {
    logger.error('Failed to emit platform event', error);
  }
}

export function emitDataManipulationErrorEvent(params: BaseEventParams & {
  integrationId?: string;
  functionName?: string;
  stage: DataManipulationStage;
  error: any;
}) {
  if (!params.tenant) {
    return;
  }

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: 'ai',
    kind: 'data-manipulation',
    eventName: 'data-manipulation-failed',
    description: `Data manipulation failed during ${params.stage}`,
    metadata: {
      integrationId: params.integrationId,
      functionName: params.functionName,
      stage: params.stage,
      context: params.context,
      error: serializeError(params.error),
    },
  });
}

export function emitAIProviderErrorEvent(params: BaseEventParams & {
  provider: string;
  sourceId?: string;
  stream: boolean;
  model?: string;
  error: any;
}) {
  if (!params.tenant) {
    return;
  }

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: `ai_provider:${params.sourceId || params.provider}`,
    kind: 'ai_provider',
    eventName: params.stream ? 'chat_completion_stream_error' : 'chat_completion_error',
    description: `Failed to execute ${params.provider} chat completion`,
    metadata: {
      provider: params.provider,
      sourceId: params.sourceId,
      model: params.model,
      stream: params.stream,
      context: params.context,
      error: serializeError(params.error),
    },
  });
}
