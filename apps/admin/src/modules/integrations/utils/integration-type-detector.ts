import { IIntegration, IIntegrationSource, IntegrationSourceKind, QelosTriggerOperation, QelosTargetOperation, OpenAITargetOperation } from '@qelos/global-types';

/**
 * Enum for different integration types that have specialized UX
 */
export enum IntegrationType {
  AIAgent = 'ai-agent',
  Standard = 'standard',
  Workflow = 'workflow',
  // Future types can be added here
  // Webhook = 'webhook',
  // DataSync = 'data-sync',
}

/**
 * Detects if an integration is an AI Agent
 * AI Agent criteria:
 * - kind[0] === 'qelos' (trigger source is Qelos)
 * - kind[1] === 'openai' (target source is OpenAI)
 * - trigger.operation === 'chatCompletion'
 * - target.operation === 'chatCompletion'
 */
export function isAIAgentIntegration(
  integration: Pick<IIntegration, 'trigger' | 'target'>,
  sources: IIntegrationSource[]
): boolean {
  if (!integration.trigger?.source || !integration.target?.source) {
    return false;
  }

  const triggerSource = sources.find(s => s._id === integration.trigger.source);
  const targetSource = sources.find(s => s._id === integration.target.source);

  if (!triggerSource || !targetSource) {
    return false;
  }

  return (
    triggerSource.kind === IntegrationSourceKind.Qelos &&
    targetSource.kind === IntegrationSourceKind.OpenAI &&
    integration.trigger.operation === QelosTriggerOperation.chatCompletion &&
    integration.target.operation === OpenAITargetOperation.chatCompletion
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
  
  return IntegrationType.Standard;
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
    case IntegrationType.Standard:
      return 'Standard Integration';
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
    case IntegrationType.Standard:
      return 'A flexible integration with full control over trigger, target, and data manipulation';
    default:
      return '';
  }
}
