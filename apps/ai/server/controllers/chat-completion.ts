import { IBlueprint, IIntegration, IOpenAISource, OpenAITargetPayload } from "@qelos/global-types";
import Handlebars from "handlebars";
import logger from "../services/logger";
import { createAIService } from "../services/ai-service";
import * as ChatCompletionService from "../services/chat-completion-service";
import { executeDataManipulation, getIntegration, getIntegrations, getSourceAuthentication, getToolsIntegrations } from "../services/plugins-service-api";
import { getRelevantToolsForAgent } from "../services/vector-search-service";
import { executeFunctionCalls } from "../services/execute-function-calls";
import { verifyUserPermissions } from "../services/source-service";
import { IThread, Thread } from "../models/thread";
import { getAllBlueprints } from "../services/no-code-service";
import { emitDataManipulationErrorEvent } from "../services/platform-events";

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
  const useSSE = req.headers.accept?.includes('text/event-stream') || req.query?.stream === 'true';

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

  if (useSSE) {
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
    res.status(500).json({ message: 'Could not calculate prompt or load tools integrations' }).end();
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
    res.status(500).json({ message: 'Could not calculate prompt or load tools integrations' }).end();
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
    systemContext: req.systemContext || {},
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

  function ingestSystemMessage(message: any) {
    if (message.role !== 'system' || !message.content || typeof message.content !== 'string') {
      return message;
    }

    try {
      const template = Handlebars.compile(message.content, { noEscape: true });
      return {
        ...message,
        content: template(templateVariables),
      };
    } catch (error) {
      logger.warn('Failed to render system message template', error);
      return message;
    }
  }

  const initialMessages = [
    ...(integration.target.details.pre_messages || []),
    ...options.messages,
  ].map(ingestSystemMessage);

  // Map all available tools
  const allTools = toolsIntegrations.map(tool => ({
    type: 'function',
    description: tool.trigger.details.description,
    function: {
      name: tool.trigger.details.name,
      description: tool.trigger.details.description,
      parameters: {
        properties: {},
        ...tool.trigger.details.parameters,
      },
    }
  }));

  // Add blueprint tools for CRUD operations
  if (ingestedBlueprints && ingestedBlueprints.length > 0) {
    const blueprintTools = ingestedBlueprints.flatMap(blueprint => {
      // Helper function to convert blueprint property type to JSON Schema type
      const getJsonSchemaType = (blueprintType: string): { type: string, format?: string } => {
        switch (blueprintType.toLowerCase()) {
          case 'string':
            return { type: 'string' };
          case 'number':
            return { type: 'number' };
          case 'boolean':
            return { type: 'boolean' };
          case 'date':
            return { type: 'string', format: 'date' };
          case 'datetime':
            return { type: 'string', format: 'date-time' };
          case 'time':
            return { type: 'string', format: 'time' };
          case 'object':
            return { type: 'object' };
          case 'file':
            return { type: 'string', format: 'uri' }; // File is represented as a URL
          default:
            return { type: 'string' }; // Default to string for unknown types
        }
      };

      // Create JSON schema for blueprint properties
      const propertiesSchema = Object.entries(blueprint.properties).reduce((schema, [propName, propDesc]) => {
        const typeInfo = getJsonSchemaType(propDesc.type);

        let propSchema: any = {
          ...typeInfo,
          description: propDesc.description || propDesc.title
        };

        // Handle enum values
        if (propDesc.enum && propDesc.enum.length > 0) {
          propSchema.enum = propDesc.enum;
        }

        if (typeInfo.type === 'object') {
          propSchema = propDesc.schema;
          propSchema.description ||= propDesc.description;
        }

        if (propDesc.multi) {
          propSchema.type = 'array';
          propSchema.items = {
            ...typeInfo,
            description: propDesc.description || propDesc.title
          };
        }

        // Handle min/max for numbers
        if (propDesc.type.toLowerCase() === 'number') {
          if (propDesc.min !== undefined) propSchema.minimum = propDesc.min;
          if (propDesc.max !== undefined) propSchema.maximum = propDesc.max;
        }

        schema[propName] = propSchema;
        return schema;
      }, {});

      // Generate CRUD function tools for this blueprint
      return [
        // Create entity function
        {
          type: 'function',
          description: `Create a new ${blueprint.name} entity`,
          function: {
            name: `create_${blueprint.identifier}`,
            description: `Create a new ${blueprint.name} entity. ${blueprint.description || ''}`,
            parameters: {
              type: 'object',
              properties: propertiesSchema,
              required: Object.entries(blueprint.properties)
                .filter(([_, prop]) => prop.required)
                .map(([name, _]) => name)
            }
          }
        },
        // Get entity function
        {
          type: 'function',
          description: `Get a specific ${blueprint.name} entity by identifier`,
          function: {
            name: `get_${blueprint.identifier}`,
            description: `Retrieve a specific ${blueprint.name} entity by its identifier`,
            parameters: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: `The identifier of the ${blueprint.name} entity to retrieve`
                }
              },
              required: ['identifier']
            }
          }
        },
        // Update entity function
        {
          type: 'function',
          description: `Update an existing ${blueprint.name} entity by identifier`,
          function: {
            name: `update_${blueprint.identifier}`,
            description: `Update an existing ${blueprint.name} entity with new values`,
            parameters: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: `The identifier of the ${blueprint.name} entity to update`
                },
                ...propertiesSchema
              },
              required: ['identifier']
            }
          }
        },
        // Delete entity function
        {
          type: 'function',
          description: `Delete a ${blueprint.name} entity by identifier`,
          function: {
            name: `delete_${blueprint.identifier}`,
            description: `Delete a ${blueprint.name} entity by its identifier`,
            parameters: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: `The identifier of the ${blueprint.name} entity to delete`
                }
              },
              required: ['identifier']
            }
          }
        },
        // List entities function
        {
          type: 'function',
          description: `List ${blueprint.name} entities`,
          function: {
            name: `list_${blueprint.identifier}`,
            description: `Retrieve a list of ${blueprint.name} entities, optionally filtered by query parameters`,
            parameters: {
              type: 'object',
              properties: {
                $sort: {
                  type: 'string',
                  description: 'Sort the results by this field. add "minus" to sort in descending order (e.g. "-rank"). default: "-created"',
                  enum: ['created', 'updated', ...Object.keys(blueprint.properties).map(prop => [prop, '-' + prop]).flat()]
                },
                $page: {
                  type: 'number',
                  description: 'the page number to return. default: 1'
                },
                $limit: {
                  type: 'number',
                  description: 'Limit the number of results. default: 100'
                },
                $populate: {
                  type: 'boolean',
                  description: 'Populate the results. default: false. if true, the results will be populated with the blueprint relations.'
                },
                createdFrom: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Filter by created date from. default: null'
                },
                createdTo: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Filter by created date to. default: null'
                },
                updatedFrom: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Filter by updated date from. default: null'
                },
                updatedTo: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Filter by updated date to. default: null'
                },
                ...Object.keys(blueprint.properties).reduce((acc, prop) => {
                  acc[prop] = {
                    ...propertiesSchema[prop],
                    description: `Filter by ${prop}. ${blueprint.properties[prop].description || ''}`
                  }
                  return acc;
                }, {} as any)
              },
              required: []
            }
          }
        }
      ];
    });

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
          body: {
            messages: args.messages
          },
          user: req.user,
          tenant: req.headers.tenant,
          workspace: req.workspace,
          integration: fullAgent,
          integrationSourceTargetAuthentication: (await getSourceAuthentication(req.headers.tenant, fullAgent.target.source?._id || fullAgent.target.source))?.authentication
        }, null);
      }
    }));
    
    // Add agent tools to allTools array
    allTools.push(...agentTools);
    toolsIntegrations.push(...agentTools);
  }

  // Use improved context-aware tool filtering
  const tools = await getRelevantToolsForAgent({
    tenant: integration.tenant,
    safeUserMessages: options.messages,
    sourceDetails: integration.target.details,
    sourceAuthentication: req.integrationSourceTargetAuthentication,
    allTools,
    defaultMaxTools: 15,
  });

  try {
    const chatOptions = {
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
    };

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

    if (useSSE) {
      // Use the shared streaming chat completion handler
      await ChatCompletionService.handleStreamingChatCompletion(
        res,
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        [],
        onNewMessage
      );
    } else {
      // Use the shared non-streaming chat completion handler
      const result = await ChatCompletionService.handleNonStreamingChatCompletion(
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        [],
        onNewMessage
      );
      if (res) {
        res.status(200).json(result).end();
      } else {
        return result;
      }
    }
  } catch (error) {
    logger.error('Error processing AI chat completion', error);
    if (useSSE) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing AI chat completion' })}\n\n`);
      res.end();
    } else if (res) {
      res.status(500).json({ message: 'Error processing AI chat completion' }).end();
    } else {
      throw { message: 'Error processing AI chat completion' };
    }
  }
}

export async function internalChatCompletion(req, res) {
  const { source, authentication, payload } = req.body as { source: IOpenAISource, authentication: any, payload: OpenAITargetPayload };
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
    })
    res.json(response).end();
  } catch {
    res.json({ message: 'failed to execute chat completion' }).end();
  }
}
