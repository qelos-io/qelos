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

  // Check if this is a rate limit error
  const isRateLimitError = params.error?.status === 429 || params.error?.name === 'RateLimitError';
  
  // Extract rate limit details from error message if available
  let rateLimitDetails: any = undefined;
  if (isRateLimitError && params.error?.message) {
    const limitMatch = params.error.message.match(/Limit (\d+), Requested (\d+)/);
    if (limitMatch) {
      rateLimitDetails = {
        limit: parseInt(limitMatch[1]),
        requested: parseInt(limitMatch[2]),
        type: params.error.message.includes('TPM') ? 'tokens_per_minute' : 
              params.error.message.includes('RPM') ? 'requests_per_minute' : 'unknown'
      };
    }
  }

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: `ai_provider:${params.sourceId || params.provider}`,
    kind: 'ai_provider',
    eventName: isRateLimitError ? 'rate_limit_exceeded' : (params.stream ? 'chat_completion_stream_error' : 'chat_completion_error'),
    description: isRateLimitError 
      ? `${params.provider} rate limit exceeded` 
      : `Failed to execute ${params.provider} chat completion`,
    metadata: {
      provider: params.provider,
      sourceId: params.sourceId,
      model: params.model,
      stream: params.stream,
      context: params.context,
      error: serializeError(params.error),
      ...(isRateLimitError && { rateLimitDetails }),
    },
  });
}

export function emitFunctionExecutionErrorEvent(params: BaseEventParams & {
  integrationId?: string;
  functionName: string;
  functionCallId: string;
  error: any;
}) {
  if (!params.tenant) {
    return;
  }

  // Determine event name based on error type
  const isTimeout = params.error?.name === 'TimeoutError' || params.error?.name === 'HeartbeatTimeoutError';
  const isHeartbeatTimeout = params.error?.name === 'HeartbeatTimeoutError';
  const eventName = isTimeout ? 'function_execution_timeout' : 'function_execution_failed';
  const description = isHeartbeatTimeout
    ? `Function execution exceeded heartbeat timeout: ${params.functionName}`
    : isTimeout 
    ? `Function execution timed out: ${params.functionName}`
    : `Function execution failed: ${params.functionName}`;

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: 'ai',
    kind: 'function_execution',
    eventName,
    description,
    metadata: {
      integrationId: params.integrationId,
      functionName: params.functionName,
      functionCallId: params.functionCallId,
      isTimeout,
      context: params.context,
      error: serializeError(params.error),
    },
  });
}

export function emitTokenUsageEvent(params: BaseEventParams & {
  provider: string;
  sourceId?: string;
  integrationId?: string;
  integrationName?: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  stream?: boolean;
}) {
  if (!params.tenant) {
    return;
  }

  emitSafePlatformEvent({
    tenant: params.tenant,
    user: params.userId,
    source: `ai_service:${params.sourceId || params.provider}`,
    kind: 'ai_service',
    eventName: 'token_usage',
    description: `AI token usage for ${params.provider}`,
    metadata: {
      workspace: params.context?.workspaceId,
      provider: params.provider,
      sourceId: params.sourceId,
      integrationId: params.integrationId,
      integrationName: params.integrationName,
      model: params.model,
      usage: params.usage,
      stream: params.stream || false,
      context: params.context,
    },
  });
}
