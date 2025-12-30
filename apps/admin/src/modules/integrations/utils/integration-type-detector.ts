import { IIntegration, IIntegrationSource, IntegrationSourceKind, QelosTriggerOperation, QelosTargetOperation, OpenAITargetOperation } from '@qelos/global-types';

/**
 * Enum for different integration types that have specialized UX
 */
export enum IntegrationType {
  AIAgent = 'ai-agent',
  Workflow = 'workflow',
  // Future types can be added here
  // Webhook = 'webhook',
  // DataSync = 'data-sync',
}

/**
 * Detects if an integration is an AI Agent
 * AI Agent criteria:
 * - Trigger source is an AI provider (OpenAI, Claude, Gemini)
 * - trigger.operation === 'chatCompletion'
 * - Target can be any source (usually Qelos for webhook)
 */
export function isAIAgentIntegration(
  integration: Pick<IIntegration, 'trigger' | 'target'>,
  sources: IIntegrationSource[]
): boolean {
  if (!integration.trigger?.source) {
    return false;
  }

  const triggerSource = sources.find(s => s._id === integration.trigger.source);

  if (!triggerSource) {
    return false;
  }

  const AI_PROVIDER_KINDS = [
    IntegrationSourceKind.OpenAI,
    IntegrationSourceKind.ClaudeAi,
    IntegrationSourceKind.Gemini
  ];

  return (
    AI_PROVIDER_KINDS.includes(triggerSource.kind) &&
    integration.trigger.operation === QelosTriggerOperation.chatCompletion
  );
}

/**
 * Detects the type of integration based on its configuration
 */
export function detectIntegrationType(
  integration: Pick<IIntegration, 'trigger' | 'target'>,
  sources: IIntegrationSource[]
): IntegrationType {
  if (isAIAgentIntegration(integration, sources)) {
    return IntegrationType.AIAgent;
  }

  // Future: Add more detection logic for other specialized types
  
  return IntegrationType.Workflow;
}

/**
 * Gets a human-readable label for an integration type
 */
export function getIntegrationTypeLabel(type: IntegrationType): string {
  switch (type) {
    case IntegrationType.AIAgent:
      return 'AI Agent';
    case IntegrationType.Workflow:
      return 'Workflow';
    default:
      return 'Integration';
  }
}

/**
 * Gets a description for an integration type
 */
export function getIntegrationTypeDescription(type: IntegrationType): string {
  switch (type) {
    case IntegrationType.AIAgent:
      return 'A specialized integration for AI-powered chat agents with function calling capabilities';
    case IntegrationType.Workflow:
      return 'Visualizes the end-to-end flow (trigger → data → target → trigger response) with related integrations';
    default:
      return '';
  }
}
