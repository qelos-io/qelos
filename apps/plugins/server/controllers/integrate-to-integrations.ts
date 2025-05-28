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
  const useSSE = req.query.stream === 'true';

  const aiService = createAIService(integration.kind[0], req.integrationSourceAuthentication);

  // Prepare the messages array
  const preparedMessages = [
    ...(source.metadata.initialMessages || []), 
    ...(integration.trigger.details.pre_messages || []), 
    ...messages.filter(msg => msg && msg.role === 'user').map(msg => ({ role: 'user', content: msg.content }))
  ];

  // Common options for both streaming and non-streaming requests
  const options = {
    messages: preparedMessages,
    model: integration.trigger.details.model || source.metadata.defaultModel,
    temperature: integration.trigger.details.temperature,
    top_p: integration.trigger.details.top_p,
    frequency_penalty: integration.trigger.details.frequency_penalty,
    presence_penalty: integration.trigger.details.presence_penalty,
    stop: integration.trigger.details.stop,
  };

  try {
    if (useSSE) {
      // Set up SSE response headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Prevents Nginx from buffering the response

      // Create a function to send SSE data
      const sendSSE = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Send initial event to establish connection
      sendSSE({ type: 'connection_established' });

      // Get the stream from the AI service
      const stream = await aiService.streamChatCompletion(options);

      // Handle different AI service providers
      if (integration.kind[0] === IntegrationSourceKind.OpenAI) {
        // For OpenAI
        let fullContent = '';
        
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullContent += content;
          
          sendSSE({
            type: 'chunk',
            content,
            fullContent,
            chunk: chunk
          });
        }
        
        // Send completion event
        sendSSE({ type: 'done', content: fullContent });
      } else if (integration.kind[0] === IntegrationSourceKind.ClaudeAi) {
        // For Claude AI
        let fullContent = '';
        
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text') {
            const content = chunk.delta.text || '';
            fullContent += content;
            
            sendSSE({
              type: 'chunk',
              content,
              fullContent,
              chunk: chunk
            });
          }
        }
        
        // Send completion event
        sendSSE({ type: 'done', content: fullContent });
      }
      
      // End the response
      res.end();
    } else {
      // Non-streaming response (original behavior)
      const response = await aiService.chatCompletion(options);
      res.json(response).end();
    }
  } catch (error) {
    logger.error("Error in chatCompletion:", error.message, error);
    
    if (useSSE) {
      // Send error through SSE if we're in streaming mode
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing AI chat completion' })}\n\n`);
      res.end();
    } else {
      // Regular error response
      res.status(500).json({ message: 'Error processing AI chat completion' }).end();
    }
  }
}