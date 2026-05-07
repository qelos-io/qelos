import {
  IIntegration,
  IIntegrationEntity,
  QelosTargetOperation,
  QelosTriggerOperation,
} from '@qelos/global-types';

export interface IAgentTool {
  name: string;
  description: string;
  schema?: object;
}

export interface IAgentPayload {
  name?: string;
  model?: string;
  systemPrompt?: string;
  tools?: IAgentTool[];
  temperature?: number;
  maxTokens?: number;
  workspace?: string;
  triggerSource?: string;
  targetSource?: string;
  active?: boolean;
}

export function integrationToAgent(integration: IIntegration & { active?: boolean }) {
  const triggerDetails = integration.trigger?.details || {};
  const targetDetails = integration.target?.details || {};

  return {
    _id: integration._id,
    name: triggerDetails.name || '',
    model: targetDetails.model || '',
    systemPrompt: triggerDetails.systemPrompt || '',
    tools: Array.isArray(triggerDetails.tools) ? triggerDetails.tools : [],
    temperature: targetDetails.temperature,
    maxTokens: targetDetails.max_tokens,
    tenant: integration.tenant,
    workspace: triggerDetails.workspace,
    triggerSource:
      typeof integration.trigger?.source === 'object'
        ? (integration.trigger.source as { _id?: string })?._id
        : integration.trigger?.source,
    targetSource:
      typeof integration.target?.source === 'object'
        ? (integration.target.source as { _id?: string })?._id
        : integration.target?.source,
    active: integration.active !== false,
    created: (integration as { created?: Date }).created,
  };
}

export function agentPayloadToTrigger(payload: IAgentPayload, existing?: IIntegrationEntity): IIntegrationEntity {
  const details = { ...(existing?.details || {}) };
  if (payload.name !== undefined) details.name = payload.name;
  if (payload.systemPrompt !== undefined) details.systemPrompt = payload.systemPrompt;
  if (payload.tools !== undefined) details.tools = payload.tools;
  if (payload.workspace !== undefined) details.workspace = payload.workspace;

  return {
    source: payload.triggerSource || existing?.source,
    operation: QelosTriggerOperation.chatCompletion,
    details,
  };
}

export function agentPayloadToTarget(payload: IAgentPayload, existing?: IIntegrationEntity): IIntegrationEntity {
  const details = { ...(existing?.details || {}) };
  if (payload.model !== undefined) details.model = payload.model;
  if (payload.temperature !== undefined) details.temperature = payload.temperature;
  if (payload.maxTokens !== undefined) details.max_tokens = payload.maxTokens;

  if (payload.systemPrompt !== undefined) {
    const preMessages = Array.isArray(details.pre_messages) ? [...details.pre_messages] : [];
    const sysIndex = preMessages.findIndex(
      (m: { role?: string; __agentSystemPrompt?: boolean }) =>
        m && m.role === 'system' && m.__agentSystemPrompt,
    );
    const sysMessage = { role: 'system', content: payload.systemPrompt, __agentSystemPrompt: true };
    if (sysIndex >= 0) {
      if (payload.systemPrompt) {
        preMessages[sysIndex] = sysMessage;
      } else {
        preMessages.splice(sysIndex, 1);
      }
    } else if (payload.systemPrompt) {
      preMessages.unshift(sysMessage);
    }
    details.pre_messages = preMessages;
  }

  return {
    source: payload.targetSource || existing?.source,
    operation: QelosTargetOperation.chatCompletion,
    details,
  };
}

export function isAgentIntegration(integration: IIntegration | undefined | null): boolean {
  return !!integration && integration.trigger?.operation === QelosTriggerOperation.chatCompletion;
}
