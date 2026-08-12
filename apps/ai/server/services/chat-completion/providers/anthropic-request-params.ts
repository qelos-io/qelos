import { claudeModelSupportsSamplingParams, DEFAULT_AI_MODEL_BY_PROVIDER } from '@qelos/global-types';
import { compactObject } from './shared';
import type { AIServiceOptions, AIServiceSource } from './types';

export function buildAnthropicMessagesCreateParams(
  options: AIServiceOptions,
  source: AIServiceSource,
  stream: boolean,
) {
  const model = options.model || source.metadata.defaultModel || DEFAULT_AI_MODEL_BY_PROVIDER.claude;
  const supportsSampling = claudeModelSupportsSamplingParams(model);

  return compactObject({
    model,
    ...(supportsSampling ? { temperature: options.temperature, top_p: options.top_p } : {}),
    max_tokens: options.max_tokens || 4000,
    stream,
  });
}
