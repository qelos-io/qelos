import Integration from "../models/integration";
import { getEncryptedSourceAuthentication } from "../services/source-authentication-service";
import { IntegrationSourceKind, OpenAITargetOperation } from "@qelos/global-types";
import { createAIService } from "../services/ai-service";
import { AIMessageTemplates } from "../services/ai-message-templates";
import { AIResponseParser } from "../services/ai-response-parser";
import logger from "../services/logger";
import { executeDataManipulation } from "../services/data-manipulation-service";
import { callIntegrationTarget } from "../services/integration-target-call";
import { safeParseJSON } from "./integrate-to-integrations-helper";

// Helper function to parse function arguments safely
function parseFunctionArguments(argumentsString: string): any {
  if (!argumentsString) return {};
  
  try {
    return JSON.parse(argumentsString);
  } catch (e) {
    return argumentsString || {};
  }
}

// Helper function to find target integration by function name
function findTargetIntegration(toolsIntegrations: any[], functionName: string) {
  return toolsIntegrations.find(
    tool => tool.trigger.details.name === functionName
  );
}

// Helper function to create function result object
function createFunctionResult(functionCall: any, content: any): any {
  return {
    tool_call_id: functionCall.id,
    role: 'tool',
    name: functionCall.function.name,
    content: JSON.stringify(content)
  };
}

// Helper function to execute a single function call
async function executeFunctionCall(
  functionCall: any,
  toolsIntegrations: any[],
  tenant: string
): Promise<any> {
  const targetIntegration = findTargetIntegration(toolsIntegrations, functionCall.function.name);
  
  if (!targetIntegration) {
    return createFunctionResult(functionCall, {
      error: `Function ${functionCall.function.name} not found`
    });
  }

  try {
    const parsedArgs = parseFunctionArguments(functionCall.function.arguments);
    const args = await executeDataManipulation(tenant, parsedArgs, targetIntegration.dataManipulation);
    const result = await callIntegrationTarget(tenant, args, targetIntegration.target);

    return createFunctionResult(functionCall, result);
  } catch (error) {
    return createFunctionResult(functionCall, {
      error: 'Function execution failed'
    });
  }
}

// Helper function to execute multiple function calls
async function executeFunctionCalls(
  functionCalls: any[],
  toolsIntegrations: any[],
  tenant: string,
  sendSSE?: (data: any) => void,
  eventPrefix: string = ''
): Promise<any[]> {
  const functionResults = [];
  
  if (sendSSE && functionCalls.length > 0) {
    sendSSE({ 
      type: `${eventPrefix}function_calls_detected`, 
      functionCalls 
    });
  }
  
  for (const functionCall of functionCalls) {
    try {
      const targetIntegration = findTargetIntegration(toolsIntegrations, functionCall.function.name);
      
      if (targetIntegration) {
        if (sendSSE) {
          sendSSE({ 
            type: `${eventPrefix}function_executing`, 
            functionCall 
          });
        }

        const parsedArgs = parseFunctionArguments(functionCall.function.arguments);
        const args = await executeDataManipulation(tenant, parsedArgs, targetIntegration.dataManipulation);
        const result = await callIntegrationTarget(tenant, args, targetIntegration.target);

        const functionResult = createFunctionResult(functionCall, result);
        functionResults.push(functionResult);
        
        if (sendSSE) {
          sendSSE({ 
            type: `${eventPrefix}function_executed`, 
            functionCall, 
            result 
          });
        }
      } else {
        functionResults.push(createFunctionResult(functionCall, {
          error: `Function ${functionCall.function.name} not found`
        }));
      }
    } catch (error) {
      functionResults.push(createFunctionResult(functionCall, {
        error: 'Invalid function arguments'
      }));
    }
  }
  
  return functionResults;
}

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
  let toolsIntegrations;
  
  try {
    [options, toolsIntegrations] = await Promise.all([
      executeDataManipulation(integration.tenant, {
        user: req.user,
        messages: safeUserMessages,
      }, integration.dataManipulation),
      Integration.find({
        tenant: integration.tenant,
        'kind.0': integration.target.source.kind,
        'trigger.operation': OpenAITargetOperation.functionCalling,
        $or: [
          { 'trigger.details.allowedIntegrationIds': integration._id },
          { 'trigger.details.allowedIntegrationIds': '*' },
          { 'trigger.details.allowedIntegrationIds': { $size: 0 } },
        ],
        'trigger.details.blockedIntegrationIds': { $ne: integration._id },
      }).lean().exec()
    ]);
  } catch (e: any) {
    logger.error('Failed to calculate prompt or load tools integrations', e);
    res.status(500).json({ message: 'Could not calculate prompt or load tools integrations' }).end();
    return;
  }

  const tools = toolsIntegrations.map(tool => ({
    type: 'function',
    description: tool.trigger.details.description,
    parameters: tool.trigger.details.parameters,
    function: {
      name: tool.trigger.details.name,
      description: tool.trigger.details.description,
      parameters: tool.trigger.details.parameters,
    }
  }));

  try {
    const chatOptions = {
      model: options.model || integration.target.details.model || source.metadata.defaultModel,
      temperature: options.temperature || integration.target.details.temperature,
      top_p: options.top_p || integration.target.details.top_p,
      frequency_penalty: options.frequency_penalty || integration.target.details.frequency_penalty,
      presence_penalty: options.presence_penalty || integration.target.details.presence_penalty,
      stop: options.stop || integration.target.details.stop,
      messages: initialMessages.concat(options.messages).map(msg => typeof msg === 'string' ? { role: 'user', content: msg } : msg),
      response_format: options.response_format || integration.target.details.response_format,
      tools,
    };
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
        let functionCalls = [];
        let functionResults = [];
        
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            fullContent += content;
            
            // Check for function calls
            const toolCalls = chunk.choices[0]?.delta?.tool_calls;
            if (toolCalls) {
              for (const toolCall of toolCalls) {
                if (toolCall.function) {
                  // Find existing function call by ID or index (streaming chunks may only have index)
                  let existingCall = functionCalls.find(fc => 
                    (toolCall.id && fc.id === toolCall.id) || 
                    (toolCall.index !== undefined && fc.index === toolCall.index)
                  );
                  
                  if (!existingCall) {
                    // Create new function call entry for this unique ID/index
                    existingCall = {
                      id: toolCall.id || `call_${toolCall.index}`,
                      index: toolCall.index,
                      type: 'function',
                      function: {
                        name: toolCall.function.name || '',
                        arguments: toolCall.function.arguments || ''
                      }
                    };
                    functionCalls.push(existingCall);
                  } else {
                    // Update existing call - set function name if provided (usually only in first chunk)
                    if (toolCall.function.name && !existingCall.function.name) {
                      existingCall.function.name = toolCall.function.name;
                    }
                    // Append arguments (streamed in subsequent chunks)
                    if (toolCall.function.arguments) {
                      existingCall.function.arguments += toolCall.function.arguments;
                    }
                  }
                }
              }
            }
            
            sendSSE({
              type: 'chunk',
              content,
              fullContent,
              functionCalls,
              chunk: chunk
            });
          }

          // Process function calls if any
          if (functionCalls.length > 0) {
            functionResults = await executeFunctionCalls(
              functionCalls,
              toolsIntegrations,
              integration.tenant,
              sendSSE
            );
          }

          // Continue conversation with function results
          if (functionResults.length > 0) {
            const followUpMessages = [
              ...chatOptions.messages,
              {
                role: 'assistant',
                content: fullContent,
                tool_calls: functionCalls
              },
              ...functionResults
            ];
            
            const followUpOptions = {
              ...chatOptions,
              messages: followUpMessages
            };
            
            sendSSE({ type: 'continuing_conversation', functionResults });
            
            // Get follow-up response from AI
            const followUpStream = await aiService.streamChatCompletion(followUpOptions);
            let followUpContent = '';
            let followUpFunctionCalls = [];
            let followUpFunctionResults = [];
            
            for await (const chunk of followUpStream) {
              const content = chunk.choices[0]?.delta?.content || '';
              followUpContent += content;
              
              // Check for function calls in follow-up response
              const toolCalls = chunk.choices[0]?.delta?.tool_calls;
              if (toolCalls) {
                for (const toolCall of toolCalls) {
                  if (toolCall.function) {
                    // Find existing function call by ID or index (streaming chunks may only have index)
                    let existingCall = followUpFunctionCalls.find(fc => 
                      (toolCall.id && fc.id === toolCall.id) || 
                      (toolCall.index !== undefined && fc.index === toolCall.index)
                    );
                    
                    if (!existingCall) {
                      // Create new function call entry for this unique ID/index
                      existingCall = {
                        id: toolCall.id || `followup_call_${toolCall.index}`,
                        index: toolCall.index,
                        type: 'function',
                        function: {
                          name: toolCall.function.name || '',
                          arguments: toolCall.function.arguments || ''
                        }
                      };
                      followUpFunctionCalls.push(existingCall);
                    } else {
                      // Update existing call - set function name if provided (usually only in first chunk)
                      if (toolCall.function.name && !existingCall.function.name) {
                        existingCall.function.name = toolCall.function.name;
                      }
                      // Append arguments (streamed in subsequent chunks)
                      if (toolCall.function.arguments) {
                        existingCall.function.arguments += toolCall.function.arguments;
                      }
                    }
                  }
                }
              }
              
              sendSSE({
                type: 'followup_chunk',
                content,
                fullContent: followUpContent,
                functionCalls: followUpFunctionCalls,
                chunk: chunk
              });
            }
            
            // Process follow-up function calls if any
            if (followUpFunctionCalls.length > 0) {
              followUpFunctionResults = await executeFunctionCalls(
                followUpFunctionCalls,
                toolsIntegrations,
                integration.tenant,
                sendSSE,
                'followup_'
              );
              
              // Note: For simplicity, we're not doing another round of conversation after follow-up functions
              // In a full implementation, you might want to continue the conversation with these results too
              if (followUpFunctionResults.length > 0) {
                followUpContent += '\n\n[Follow-up function calls executed]';
              }
            }
            
            fullContent += followUpContent;
          }
        
          // Send completion event
          sendSSE({ type: 'done', content: fullContent });
        } catch (e: any) {
          sendSSE({ type: 'error', message: 'Error processing AI chat completion' });
        }
        
        // End the response
        res.end();
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
      
      // Check if there are function calls in the response
      if (response.choices?.[0]?.message?.tool_calls?.length > 0) {
        const functionCalls = response.choices[0].message.tool_calls;
        const functionResults = await executeFunctionCalls(
          functionCalls,
          toolsIntegrations,
          integration.tenant
        );
        
        // Continue conversation with function results
        if (functionResults.length > 0) {
          const followUpMessages = [
            ...chatOptions.messages,
            response.choices[0].message,
            ...functionResults
          ];
          
          const followUpOptions = {
            ...chatOptions,
            messages: followUpMessages
          };
          
          // Get follow-up response from AI
          const followUpResponse = await aiService.chatCompletion(followUpOptions);
          res.json(followUpResponse).end();
        } else {
          res.json(response).end();
        }
      } else {
        res.json(response).end();
      }
    }
  } catch (error) {
    logger.error('Error processing AI chat completion', error);
    if (useSSE) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing AI chat completion' })}\n\n`);
      res.end();
    } else {
      // Regular error response
      res.status(500).json({ message: 'Error processing AI chat completion' }).end();
    }
  }
}