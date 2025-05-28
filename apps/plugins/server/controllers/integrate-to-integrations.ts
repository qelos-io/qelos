import IntegrationSource from "../models/integration-source";
import { getEncryptedSourceAuthentication } from "../services/source-authentication-service";
import { IntegrationSourceKind } from "@qelos/global-types";
import { createAIService } from "../services/ai-service";
import { AIMessageTemplates } from "../services/ai-message-templates";
import { AIResponseParser } from "../services/ai-response-parser";
import logger from "../services/logger";

export function forceTriggerIntegrationKind(kinds: IntegrationSourceKind[]) {
  return (req, res, next) => {
    req.integrationTriggerKinds = kinds;
    next();
  }
} 

export async function getIntegrationToIntegrate(req, res, next) {
  try {
    const integration = await Integration
      .findOne({ _id: req.params.integrationId, tenant: req.headers.tenant, 'kind.0': { $in: req.integrationTriggerKinds } })
      .populate('trigger.source')
      .populate('target.source')
      .lean()
      .exec();

    if (!integration) {
      res.status(404).json({ message: 'integration not found' }).end();
      return;
    }

    req.integration = integration;

    const { roles, workspaceRoles, workspaceLabels } = integration.trigger.details || {};

    if (roles && roles?.length > 0) {
      if (!roles.some(role => req.user.roles.includes(role))) {
        res.status(403).json({ message: 'user does not have required roles' }).end();
        return;
      }
    }

    if (workspaceRoles && workspaceRoles?.length > 0) {
      if (!workspaceRoles.some(role => req.user.workspaceRoles.includes(role))) {
        res.status(403).json({ message: 'user does not have required workspace roles' }).end();
        return;
      }
    }

    if (workspaceLabels && workspaceLabels?.length > 0) {
      if (!workspaceLabels.some(label => req.user.workspaceLabels.includes(label))) {
        res.status(403).json({ message: 'workspace does not have required labels' }).end();
        return;
      }
    }

    req.integrationSourceAuthentication = await getEncryptedSourceAuthentication(req.headers.tenant, source.kind, source.authentication);

    next();
  } catch (e: any) { // Typed error for better access to message
    logger.error("Error in getIntegrationSource:", e.message, e); // Use your logger
    res.status(500).json({ message: 'Could not get integration source' }).end();
  }
}

export async function chatCompletion(req, res) {
  const { integration } = req;
  const { source } = integration.trigger;

  const { messages } = req.body;

  const aiService = createAIService(integration.kind[0], req.integrationSourceAuthentication);

  try {
    const response = await aiService.chatCompletion({
      messages: [...(source.metadata.initialMessages || []), 
      ...(integration.trigger.details.pre_messages || []), 
      ...messages.filter(msg => msg.role === 'user')  .map(msg => ({ role: 'user', content: msg.content }))
      ],
      model: integration.trigger.details.model || source.metadata.defaultModel,
      temperature: integration.trigger.details.temperature,
      top_p: integration.trigger.details.top_p,
      frequency_penalty: integration.trigger.details.frequency_penalty,
      presence_penalty: integration.trigger.details.presence_penalty,
      stop: integration.trigger.details.stop, 
    });
    res.json(response).end();
  } catch (error) {
    logger.error("Error in chatCompletion:", error.message, error); // Use your logger
    res.status(500).json({ message: 'Error processing AI chat completion' }).end();
  }
}