import { IBlueprint, IIntegration, IOpenAISource, IntegrationSourceKind, OpenAIChatCompletionPayload } from "@qelos/global-types";
import logger from "../services/logger";
import { createAIService } from "../services/ai-service";
import * as ChatCompletionService from "../services/chat-completion-service";
import { executeDataManipulation, getIntegration, getIntegrations, getSourceAuthentication, getToolsIntegrations } from "../services/plugins-service-api";
import { getRelevantToolsForAgent, Tool } from "../services/vector-search-service";
import { generateBlueprintTools, mapToolsIntegrations } from "../services/blueprint-tools-service";
import { ingestSystemMessage } from "../services/message-utils";
import { executeFunctionCalls } from "../services/execute-function-calls";
import { verifyUserPermissions } from "../services/source-service";
import { IThread, Thread } from "../models/thread";
import { getAllBlueprints } from "../services/no-code-service";
import { emitDataManipulationErrorEvent } from "../services/platform-events";
import { emitPlatformEvent } from '@qelos/api-kit';
import { analyzeChatCompletionError, createErrorResponse, logError } from "../services/error-analysis";
import { VectorStoreService } from "../services/vector-store-service";
import OpenAI from "openai";
import mongoose from "mongoose";

export async function getIntegrationToIntegrate(req, res, next) {
  try {
    // Get integration from plugins service
    const integration = await getIntegration(req.headers.tenant, req.params.integrationId, true);

    if (!integration) {
      res.status(404).json({ message: 'integration not found' }).end();
      return;
    }


    // check if we must have thread id and "record" the thread
    if (integration.trigger.details?.recordThread) {
      if (!req.params.threadId) {
        res.status(400).json({ message: 'thread id is required' }).end();
        return;
      }

      const filters: any = {
        _id: req.params.threadId,
        user: req.user._id // Ensure user can only access their own threads
      };

      if (req.workspace) {
        filters.workspace = req.workspace._id;
      }

      const thread = await Thread.findOne(filters).exec();
      if (!thread) {
        res.status(404).json({ message: 'thread not found' }).end();
        return;
      }

      req.thread = thread;
    }

    // Verify integration kind matches required kinds
    if (!req.integrationTriggerKinds.includes(integration.kind[0])) {
      res.status(400).json({ message: 'invalid integration kind' }).end();
      return;
    }

    req.integration = integration;

    const { error, status } = verifyUserPermissions(req.user, integration.trigger.details) || {};
    if (error) {
      res.status(status || 403).json({ message: error }).end();
      return;
    }

    const source = integration.target.source as any;

    // Get authentication from plugins service
    const sourceData = await getSourceAuthentication(req.headers.tenant, source._id);
    req.source = source;
    req.integrationSourceTargetAuthentication = sourceData?.authentication;

    next();
  } catch (e: any) {
    logger.error('Failed to get integration to integrate', e);
    res.status(400).json({ message: 'Could not get integration to integrate' }).end();
    return;
  }
}

export async function chatCompletion(req: any, res: any | null) {
  const { integration, integrationSourceTargetAuthentication } = req;
  const source = integration.target.source;
  // Force non-streaming mode when res is null (nested agent calls)
  const useSSE = res && (req.headers.accept?.includes('text/event-stream') || req.query?.stream === 'true');

  const thread: IThread | undefined = req.thread;
  let options = req.body || {};
  options.messages = options.messages instanceof Array ? options.messages : [];
  options.context = (options.context && typeof options.context === 'object') ? options.context : {};
  Object.keys(options.context).forEach(key => {
    const value = options.context[key];
    if (typeof value === 'number' || typeof value === 'boolean') {
      return;
    }
    if (typeof value === 'string') {
      if (value.length > 512) {
        options.context[key] = value.substring(0, 512);
      }
    } else {
      delete options.context[key];
    }
  });

  if (useSSE && res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
  }

  const aiService = createAIService(integration.target.source, integrationSourceTargetAuthentication);

  const safeUserMessages = options.messages.filter(msg =>
    msg.role === 'user' || msg.role === 'assistant' || msg.role === 'tool'
  );

  if (thread) {
    if (thread.messages && thread.messages.length > 0) {
      // Get the timestamp of the last message in the thread
      const lastThreadMessage = thread.messages[thread.messages.length - 1];
      const lastThreadTimestamp = lastThreadMessage.timestamp || new Date(0);

      // Filter out user messages that were sent before the last thread message
      const newUserMessages = safeUserMessages.filter(msg => {
        // Only keep user messages
        if (msg.role !== 'user') return false;

        // If the message has a timestamp, check if it's after the last thread message
        if (msg.timestamp) {
          const msgTimestamp = new Date(msg.timestamp);
          return msgTimestamp > lastThreadTimestamp;
        }

        // If no timestamp, assume it's a new message
        return true;
      });

      // Combine thread messages with new user messages
      options.messages = [...thread.messages, ...newUserMessages];

      //newUserMessages should be stored in the thread
      thread.messages = [...thread.messages, ...newUserMessages];

    } else {
      thread.messages = safeUserMessages
        .filter(msg => msg.role === 'user')
        .map(msg => ({
          ...msg,
          timestamp: new Date()
        }));
    }

    await thread.save();
  }

  try {
    options = await executeDataManipulation(integration.tenant, {
      user: req.user,
      messages: safeUserMessages,
      context: options.context,
      systemContext: {},
      vectorStoreIds: [],
      webSearch: integration.trigger.details?.webSearch && source.kind === IntegrationSourceKind.OpenAI ? {
        type: "web_search",
        search_context_size: "medium",
        user_location: { type: "approximate" }
      } : undefined,
    }, integration.dataManipulation);
  } catch (error) {
    logger.error('Failed to execute pre-chat data manipulation', error);
    emitDataManipulationErrorEvent({
      tenant: integration.tenant,
      userId: req.user?._id?.toString(),
      integrationId: integration._id,
      stage: 'pre_chat',
      context: {
        messagesCount: safeUserMessages.length,
        context: options.context,
      },
      error,
    });
    emitPlatformEvent({
      tenant: req.headers.tenant,
      source: integration._id,
      kind: integration.trigger.source.kind,
      eventName: 'ai_chat_completion_failed',
      description: 'AI chat completion failed - could not calculate prompt or load tools integrations',
      metadata: {
        integrationId: integration._id,
        stage: 'pre_chat',
        context: {
          messagesCount: safeUserMessages.length,
          context: options.context,
        },
        error,
      },
    });
    if (res) {
      res.status(500).json({ message: 'Could not calculate prompt or load tools integrations' }).end();
    } else {
      throw { message: 'Could not calculate prompt or load tools integrations', error };
    }
    return;
  }

  let toolsIntegrations;
  let ingestedBlueprints: IBlueprint[];
  let ingestedAgents: IIntegration[];
  try {
    [toolsIntegrations, ingestedBlueprints, ingestedAgents] = await Promise.all([
      getToolsIntegrations(integration.tenant, integration.target.source.kind, integration._id),
      integration.target.details.ingestedBlueprints && integration.target.details.ingestedBlueprints.length > 0 ? getAllBlueprints(integration.tenant, { identifier: integration.target.details.ingestedBlueprints }) : Promise.resolve([]),
      integration.target.details.ingestedAgents && integration.target.details.ingestedAgents.length > 0 ? getIntegrations(integration.tenant, {active: true, kind: integration.trigger.source.kind, _id: integration.target.details.ingestedAgents.join(',')}) : Promise.resolve([]),
    ]);
  } catch (e: any) {
    logger.error('Failed to load tools integrations or ingested resources', e);
    if (res) {
      res.status(500).json({ message: 'Could not calculate prompt or load tools integrations' }).end();
    } else {
      throw { message: 'Could not calculate prompt or load tools integrations', error: e };
    }
    return;
  }

  const now = new Date();

  const templateVariables = {
    userId: req.user?._id,
    userEmail: req.user?.email,
    userFirstName: req.user?.firstName,
    userLastName: req.user?.lastName,
    workspaceId: req.workspace?._id,
    workspaceName: req.workspace?.name,
    workspaceLabels: req.workspace?.labels?.join(',') || '',
    currentDate: now.toISOString().split('T')[0],
    currentDateTime: now.toISOString(),
    userRoles: req.user?.roles?.join(',') || '',
    systemContext: options.systemContext || {},
    user: {
      id: req.user?._id,
      email: req.user?.email,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName,
      roles: req.user?.roles,
      wsRoles: req.user?.wsRoles
    },
    workspace: req.workspace ? {
      id: req.workspace._id,
      name: req.workspace.name,
      labels: req.workspace.labels,
    } : undefined,
    integration: {
      id: integration._id,
      name: integration.name,
      kind: integration.kind,
      trigger: integration.trigger,
      target: integration.target,
    },
  };

  const initialMessages = [
    ...(integration.target.details.pre_messages || []),
    ...options.messages,
  ].map(message => ingestSystemMessage(message, templateVariables));

  // Map all available tools
  const allTools: any[] = mapToolsIntegrations(toolsIntegrations);

  // Add blueprint tools for CRUD operations
  if (ingestedBlueprints && ingestedBlueprints.length > 0) {
    const blueprintTools = ingestedBlueprints.flatMap(blueprint => generateBlueprintTools(blueprint));
    // Add blueprint tools to allTools array
    allTools.push(...blueprintTools);
  }

  if (ingestedAgents && ingestedAgents.length > 0) {
    // Create tools for each ingested agent
    const agentTools = ingestedAgents.map(agent => ({
      type: 'function',
      description: agent.trigger.details.description || `AI agent integration`,
      function: {
        name: `call_agent_${agent.trigger.details?.name.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || agent._id}`,
        description: agent.trigger.details.description || `Execute AI agent to handle specific tasks`,
        parameters: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } }, required: ['role', 'content'] },
              description: 'User messages to pass to the agent'
            }
          },
          required: ['messages']
        }
      },
      handler: async (req: any, args: any) => {
        const fullAgent = await getIntegration(req.headers.tenant, agent._id, true);
        return chatCompletion({
          headers: {...req.headers, tenant: req.headers.tenant, user: req.headers.user},
          query: {
            bypassAdmin: req.query.bypassAdmin
          },
          body: {
            messages: args.messages
          },
          user: req.user,
          tenant: req.headers.tenant,
          workspace: req.workspace,
          integration: fullAgent,
          integrationSourceTargetAuthentication: (await getSourceAuthentication(req.headers.tenant, (fullAgent.target.source as any)?._id || fullAgent.target.source))?.authentication
        }, null);
      }
    }));
    
    // Add agent tools to allTools array
    allTools.push(...agentTools);
    toolsIntegrations.push(...agentTools);
  }

  // Use improved context-aware tool filtering
  const tools: Tool[] = await getRelevantToolsForAgent({
    tenant: integration.tenant,
    safeUserMessages: options.messages,
    sourceDetails: integration.target.details,
    sourceAuthentication: req.integrationSourceTargetAuthentication,
    allTools: allTools as Tool[],
    defaultMaxTools: 15,
  });

  // Declare chatOptions outside try block so it's accessible in catch
  const chatOptions: any = {
    model: options.model || integration.target.details.model || source.metadata.defaultModel,
    temperature: options.temperature || integration.target.details.temperature,
    top_p: options.top_p || integration.target.details.top_p,
    frequency_penalty: options.frequency_penalty || integration.target.details.frequency_penalty,
    presence_penalty: options.presence_penalty || integration.target.details.presence_penalty,
    stop: options.stop || integration.target.details.stop,
    messages: initialMessages.map(msg => typeof msg === 'string' ? { role: 'user', content: msg } : msg),
    unsafeUserContext: Object.keys(options?.context || {}).length > 0 ? options.context : undefined,
    response_format: options.response_format || integration.target.details.response_format,
    tools,
    loggingContext: {
      tenant: integration.tenant,
      userId: req.user?._id?.toString(),
      workspaceId: req.workspace?._id?.toString(),
      integrationId: integration._id,
      integrationName: integration.name,
    },
  };

  // Configure file_search tool for the Responses API using vector store service
  if ((thread && integration.trigger.details?.vectorStore) || options.vectorStoreIds?.length > 0) {
    try {
      // Get the source authentication for OpenAI
      // Handle both string ID and object with _id
      const sourceId = typeof integration.target.source === 'string' 
        ? integration.target.source 
        : (integration.target.source as any)._id || integration.target.source;
      
      const sourceData = await getSourceAuthentication(req.headers.tenant, sourceId);
      
      if (sourceData && sourceData.authentication) {
        const openai = new OpenAI({
          apiKey: sourceData.authentication.token,
          organization: sourceData.metadata?.organizationId,
          baseURL: sourceData.metadata?.apiUrl,
        });
        
        const vectorStoreService = new VectorStoreService(openai);
        const vectorStoreIds = await vectorStoreService.getVectorStoreIdsForThread(
          (thread?._id as mongoose.Types.ObjectId).toString(),
          integration._id.toString(),
          req.headers.tenant
        );
        
        if (options.vectorStoreIds?.length > 0) {
          vectorStoreIds.push(...options.vectorStoreIds);
        }
        
        if (vectorStoreIds.length > 0) {
          tools.unshift({
            type: "file_search",
            vector_store_ids: vectorStoreIds,
          });
        }
      }
    } catch (error) {
      logger.error('Error setting up vector stores for chat completion:', error);
    }
  }

  // Add web search tool if enabled (OpenAI only)
  if (options.webSearch && source.kind === IntegrationSourceKind.OpenAI) {
    tools.unshift(options.webSearch);
  }

  try {

    // Custom function to execute function calls for this controller
    const executeFunctionCallsHandler = async (
      functionCalls: ChatCompletionService.FunctionCall[],
      ...args: any[]
    ) => {
      return executeFunctionCalls(
        req,
        functionCalls,
        toolsIntegrations,
        integration.tenant,
        args[0], // sendSSE if provided
        '',
        req.query.bypassAdmin === 'true'
      );
    };

    const onNewMessage = thread ? (message: { type: 'function_calls_detected' | 'function_calls_executed' | 'assistant_last_content', content?: string, functionCalls?: ChatCompletionService.FunctionCall[], functionResults?: any }) => {
      if (message.type === 'function_calls_detected') {
        thread.messages.push({
          role: 'assistant',
          content: '',
          tool_calls: message.functionCalls,
          timestamp: new Date()
        });

      } else if (message.type === 'function_calls_executed') {
        thread.messages.push({
          role: 'function',
          content: '',
          tool_calls: message.functionResults,
          timestamp: new Date()
        });

      } else if (message.type === 'assistant_last_content') {
        thread.messages.push({
          role: 'assistant',
          content: message.content || '',
          timestamp: new Date()
        });
      }

      thread.save().catch(() => { });
    } : undefined;

    // generate title id we can using ai
    if (thread && (!thread.title || thread.title.startsWith('*'))) {
      thread.title = await ChatCompletionService.generateThreadTitle({
        aiService,
        model: chatOptions.model,
        messages: thread.messages || [],
        tryAgain: !!thread.title,
        loggingContext: chatOptions.loggingContext,
      }).catch(() => {
        return '*No Title';
      });
      await thread.save();
    }

    if (useSSE) {
      // Use the shared streaming chat completion handler
      await ChatCompletionService.handleStreamingChatCompletion(
        res,
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        [],
        onNewMessage,
        {
          tenant: integration.tenant,
          userId: req.user?._id?.toString(),
          integrationId: integration._id,
          integrationName: integration.name,
          workspaceId: req.workspace?._id?.toString(),
        }
      );
    } else {
      // Use the shared non-streaming chat completion handler
      const result = await ChatCompletionService.handleNonStreamingChatCompletion(
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        [],
        onNewMessage,
        {
          tenant: integration.tenant,
          userId: req.user?._id?.toString(),
          integrationId: integration._id,
          integrationName: integration.name,
          workspaceId: req.workspace?._id?.toString(),
        }
      );
      if (res) {
        res.status(200).json(result).end();
      } else {
        return result;
      }
    }
  } catch (error) {
    // Analyze the error to provide actionable insights
    const errorAnalysis = analyzeChatCompletionError(error, {
      provider: integration.target.source.kind,
      model: chatOptions.model,
      integrationId: integration._id,
      tenant: integration.tenant,
      hasFunctionCalls: !!chatOptions.tools,
      messageCount: chatOptions.messages?.length,
      isStreaming: useSSE
    });
    
    // Log with structured data for better debugging
    logError(logger, 'Error processing AI chat completion', error, errorAnalysis, {
      integrationId: integration._id,
      integrationName: integration.name,
      provider: integration.target.source.kind,
      model: chatOptions.model,
      userId: req.user?._id?.toString(),
      workspaceId: req.workspace?._id?.toString(),
      hasFunctionCalls: !!chatOptions.tools,
      messageCount: chatOptions.messages?.length,
      isStreaming: useSSE
    });
    
    // Emit platform event for monitoring
    emitPlatformEvent({
      tenant: integration.tenant,
      source: integration._id,
      kind: integration.target.source.kind,
      eventName: 'ai_chat_completion_failed',
      description: `AI chat completion failed: ${errorAnalysis.category}`,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        errorCategory: errorAnalysis.category,
        possibleCauses: errorAnalysis.possibleCauses,
        suggestedFixes: errorAnalysis.suggestedFixes,
        integrationId: integration._id,
        integrationName: integration.name,
        model: chatOptions.model,
        isStreaming: useSSE,
        hasFunctionCalls: !!chatOptions.tools,
        userId: req.user?._id?.toString(),
      }
    });
    
    // Create and return detailed error response
    const errorResponse = createErrorResponse(error, errorAnalysis, req.id);
    
    if (useSSE && res) {
      res.write(`data: ${JSON.stringify({ type: 'error', ...errorResponse })}\n\n`);
      res.end();
    } else if (res) {
      res.status(500).json(errorResponse).end();
    } else {
      throw { ...errorResponse, originalError: error };
    }
  }
}

export async function internalChatCompletion(req, res) {
  const { source, authentication, payload } = req.body as { source: IOpenAISource, authentication: any, payload: OpenAIChatCompletionPayload };
  const aiService = createAIService(source, authentication);
  try {
    const response = await aiService.createChatCompletion({
      messages: payload.messages,
      model: payload.model || source.metadata.defaultModel,
      temperature: payload.temperature || source.metadata.defaultTemperature,
      top_p: payload.top_p || source.metadata.defaultTopP,
      frequency_penalty: payload.frequency_penalty || source.metadata.defaultFrequencyPenalty,
      presence_penalty: payload.presence_penalty || source.metadata.defaultPresencePenalty,
      stream: false,
      max_tokens: payload.max_tokens || source.metadata.defaultMaxTokens,
      response_format: payload.response_format || source.metadata.defaultResponseFormat,
      loggingContext: {
        tenant: req.headers.tenant,
        userId: req.user?._id?.toString(),
        workspaceId: req.workspace?._id?.toString(),
      },
    })
    res.json(response).end();
  } catch (error) {
    // Analyze the error for internal requests too
    const errorAnalysis = analyzeChatCompletionError(error, {
      provider: source.kind,
      model: payload.model || source.metadata.defaultModel,
      integrationId: req.integration?._id,
      tenant: req.headers.tenant,
      hasFunctionCalls: false,
      messageCount: payload.messages?.length || 0,
      isStreaming: false
    });
    
    logError(logger, 'Error in internal chat completion', error, errorAnalysis, {
      sourceId: source._id,
      provider: source.kind,
      model: payload.model || source.metadata.defaultModel,
      tenant: req.headers.tenant
    });
    
    // Return detailed error for internal requests
    const errorResponse = createErrorResponse(error, errorAnalysis);
    res.status(500).json(errorResponse).end();
  }
}
