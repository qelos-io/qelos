import Integration from "../models/integration";
import { getEncryptedSourceAuthentication } from "../services/source-authentication-service";
import { IntegrationSourceKind } from "@qelos/global-types";
import { createAIService } from "../services/ai-service";
import { AIMessageTemplates } from "../services/ai-message-templates";
import { AIResponseParser } from "../services/ai-response-parser";
import logger from "../services/logger";
import { executeDataManipulation } from "../services/data-manipulation-service";

export function forceTriggerIntegrationKind(kinds: IntegrationSourceKind[], operations?: string[]) {
  return (req, res, next) => {
    req.integrationTriggerKinds = kinds;
    req.integrationTriggerOperations = operations;
    next();
  }
} 

export async function getIntegrationToIntegrate(req, res, next) {
  try {
    const query = {
      _id: req.params.integrationId, 
      tenant: req.headers.tenant,
      'kind.0': { $in: req.integrationTriggerKinds },
      // ...(req.integrationTriggerOperations ? { 'trigger.operation': { $in: req.integrationTriggerOperations } } : {}),
    };
    const integration = await Integration
      .findOne(query)
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

    req.integrationSourceTargetAuthentication = await getEncryptedSourceAuthentication(req.headers.tenant, integration.target.source.kind, integration.target.source.authentication);

    next();
  } catch (e: any) { // Typed error for better access to message
    res.status(500).json({ message: 'Could not get integration' }).end();
  }
}

export async function chatCompletion(req, res) {
  const { integration } = req;
  const { source } = integration.target;
  const { messages } = req.body;
  const useSSE = req.query.stream === 'true';

  let aiService: AIService;

  try {
    aiService = createAIService(integration.kind[1], req.integrationSourceTargetAuthentication);
    
  } catch (e: any) {
    res.status(500).json({ message: 'Could not get integration' }).end();
  }


  // Prepare the messages array
  const initialMessages = [
    ...(source.metadata?.initialMessages || []), 
    ...(integration.target?.details?.pre_messages || []), 
  ];

  const safeUserMessages = messages
    .filter(msg => msg && msg.role !== 'system')
    .map(msg => ({ role: msg.role, content: msg.content }));

  // Common options for both streaming and non-streaming requests 
  let options;
  try {
    options = await executeDataManipulation(integration.tenant, {
    user: req.user,
    messages: safeUserMessages,
  }, integration.dataManipulation);
  } catch (e: any) {
    res.status(500).json({ message: 'Could not calculate prompt' }).end();
  }

  const chatOptions = {
    model: options.model || integration.target.details.model || source.metadata.defaultModel,
    temperature: options.temperature || integration.target.details.temperature,
    top_p: options.top_p || integration.target.details.top_p,
    frequency_penalty: options.frequency_penalty || integration.target.details.frequency_penalty,
    presence_penalty: options.presence_penalty || integration.target.details.presence_penalty,
    stop: options.stop || integration.target.details.stop,
    messages: initialMessages.concat(options.messages),
  }

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
      const stream = await aiService.streamChatCompletion(chatOptions);

      // Handle different AI service providers
      if (integration.kind[1] === IntegrationSourceKind.OpenAI) {
        // For OpenAI
        let fullContent = '';
        
        try {
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
        } catch (e: any) {
          sendSSE({ type: 'error', message: 'Error processing AI chat completion' });
        }
        
        // Send completion event
        sendSSE({ type: 'done', content: fullContent });
      } else if (integration.kind[1] === IntegrationSourceKind.ClaudeAi) {
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
      const response = await aiService.chatCompletion(chatOptions);
      res.json(response).end();
    }
  } catch (error) {
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