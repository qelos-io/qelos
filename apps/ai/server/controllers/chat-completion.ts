import { IBlueprint, IOpenAISource, OpenAITargetPayload } from "@qelos/global-types";
import logger from "../services/logger";
import { createAIService } from "../services/ai-service";
import * as ChatCompletionService from "../services/chat-completion-service";
import { executeDataManipulation, getIntegration, getSourceAuthentication, getToolsIntegrations } from "../services/plugins-service-api";
import { findSimilarTools } from "../services/vector-search-service";
import { executeFunctionCalls } from "../services/execute-function-calls";
import { verifyUserPermissions } from "../services/source-service";
import { IThread, Thread } from "../models/thread";
import { getAllBlueprints } from "../services/no-code-service";
import { FunctionCall } from "../services/chat-completion-service";

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
    res.status(500).json({ message: 'Could not get integration to integrate' }).end();
    return;
  }
}

export async function chatCompletion(req, res) {
  const { integration, integrationSourceTargetAuthentication } = req;
  const source = integration.target.source;
  let options = req.body;
  const useSSE = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

  const thread: IThread | undefined = req.thread;

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

  let toolsIntegrations;
  let ingestedBlueprints: IBlueprint[];
  try {
    [options, toolsIntegrations, ingestedBlueprints] = await Promise.all([
      executeDataManipulation(integration.tenant, {
        user: req.user,
        messages: safeUserMessages,
      }, integration.dataManipulation),
      getToolsIntegrations(integration.tenant, integration.target.source.kind, integration._id),
      integration.target.details.ingestedBlueprints && integration.target.details.ingestedBlueprints.length > 0 ? getAllBlueprints(integration.tenant, { identifier: integration.target.details.ingestedBlueprints }) : Promise.resolve([]),
    ]);
  } catch (e: any) {
    logger.error('Failed to calculate prompt or load tools integrations', e);
    res.status(500).json({ message: 'Could not calculate prompt or load tools integrations' }).end();
    return;
  }

  const initialMessages = [...integration.target.details.pre_messages || [], ...options.messages];

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
          description: `Get a specific ${blueprint.name} entity by ID`,
          function: {
            name: `get_${blueprint.identifier}`,
            description: `Retrieve a specific ${blueprint.name} entity by its ID`,
            parameters: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: `The ID of the ${blueprint.name} entity to retrieve`
                }
              },
              required: ['id']
            }
          }
        },
        // Update entity function
        {
          type: 'function',
          description: `Update an existing ${blueprint.name} entity`,
          function: {
            name: `update_${blueprint.identifier}`,
            description: `Update an existing ${blueprint.name} entity with new values`,
            parameters: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: `The ID of the ${blueprint.name} entity to update`
                },
                ...propertiesSchema
              },
              required: ['id']
            }
          }
        },
        // Delete entity function
        {
          type: 'function',
          description: `Delete a ${blueprint.name} entity`,
          function: {
            name: `delete_${blueprint.identifier}`,
            description: `Delete a ${blueprint.name} entity by its ID`,
            parameters: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: `The ID of the ${blueprint.name} entity to delete`
                }
              },
              required: ['id']
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
                query: {
                  type: 'object',
                  description: `Query parameters to filter ${blueprint.name} entities`,
                  additionalProperties: true
                }
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

  // Extract the latest user message to use for tool relevance filtering
  const lastUserMessage = options.messages
    .filter(msg => msg.role === 'user')
    .pop()?.content || '';

  // Determine whether to use local embeddings or OpenAI
  const embeddingType = integration.target.details.embeddingType || 'local'
  const maxTools = Number(integration.target.details.maxTools || 15);

  // Use vector search to find relevant tools based on the user's query
  const tools = allTools.length <= maxTools ? allTools : await findSimilarTools({
    userQuery: lastUserMessage,
    tenant: integration.tenant,
    allTools,
    maxTools,
    embeddingType,
    authentication: req.integrationSourceTargetAuthentication
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
        args[0] // sendSSE if provided
      );
    };

    const onNewMessage = thread ? (message: { type: 'function_calls_detected' | 'function_calls_executed' | 'assistant_last_content', content?: string, functionCalls?: FunctionCall[], functionResults?: any }) => {
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
      res.status(200).json(result).end();
    }
  } catch (error) {
    logger.error('Error processing AI chat completion', error);
    if (useSSE) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing AI chat completion' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ message: 'Error processing AI chat completion' }).end();
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
